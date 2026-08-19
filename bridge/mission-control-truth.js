'use strict';
/**
 * mission-control-truth.js — runtime truth projection for the J.A.R.V.I.S. dashboard.
 *
 * Reads OpenClaw's own durable state (~/.openclaw/state/openclaw.sqlite) READ-ONLY and
 * projects it into dashboard shapes. This replaces the previous approach of shelling out
 * to `openclaw sessions --json` and parsing multi-MB JSONL transcripts, and it removes all
 * timestamp-based "recently updated == active" guessing.
 *
 * Source-of-truth mapping (verified against OpenClaw 2026.7.1-2 schema):
 *   flow_runs      -> missions (TaskFlow)
 *   task_runs      -> agent work units; carries BOTH `status` and `delivery_status`,
 *                     which is what makes RUN_COMPLETE != DELIVERED representable.
 *   subagent_runs  -> parent/child linkage (run_id, child_session_key, requester_session_key)
 *   audit_events   -> live activity feed (agent.run.*, tool.action.*)
 *
 * State definitions (never inferred from timestamps or prose):
 *   ACTIVE   -> task_runs.status = 'running'   (a real run started and has not ended)
 *   WAITING  -> task_runs.status = 'queued'
 *   ERROR    -> status in (failed,timed_out,lost) OR delivery_status = 'failed'
 *   COMPLETE -> status = 'succeeded' AND delivery_status IN ('delivered','not_applicable')
 */

const { DatabaseSync } = require('node:sqlite');
const os = require('os');
const path = require('path');

const DB_PATH =
  process.env.OPENCLAW_STATE_DB ||
  path.join(os.homedir(), '.openclaw', 'state', 'openclaw.sqlite');

/** Terminal statuses that mean the run itself did not succeed. */
// REVIEW-FIXES applied. Cancelled is a deliberate stop, not a failure — counting
// it as ERROR inflated failedToday and marked the agent red.
const RUN_FAILURE_STATUSES = new Set(['failed', 'timed_out', 'lost']);

let db = null;
/** Last DB error, surfaced to the API so callers can render 'unknown' not 'idle'. */
let lastError = null;

/**
 * Open (or reuse) a read-only handle. WAL-safe: readers never block the gateway's writes.
 * Returns null if the DB is unavailable so callers can degrade instead of crashing.
 */
function getDb() {
  if (db) return db;
  try {
    db = new DatabaseSync(DB_PATH, { readOnly: true });
    lastError = null;
    // Keep reads snappy and never hang the HTTP handler behind a writer.
    db.exec('PRAGMA busy_timeout = 250;');
    return db;
  } catch (err) {
    console.error('[truth] cannot open state db read-only:', err.message);
    lastError = err.message;
    db = null;
    return null;
  }
}

/** Reset the handle so the next call reopens (used when a query fails mid-flight). */
function resetDb() {
  try { if (db) db.close(); } catch { /* already gone */ }
  db = null;
}

function query(sql, params = []) {
  const handle = getDb();
  if (!handle) return [];
  try {
    return handle.prepare(sql).all(...params);
  } catch (err) {
    console.error('[truth] query failed:', err.message);
    lastError = err.message;
    resetDb();
    return [];
  }
}

function startOfTodayMs() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * Classify a task_runs row into a dashboard state using real lifecycle + delivery data.
 * Critically: a run that succeeded but whose delivery failed is NOT "complete" — it is the
 * silent-completion failure mode, surfaced as its own state rather than hidden.
 */
function classifyTask(row) {
  const status = String(row.status || '').toLowerCase();
  const delivery = String(row.delivery_status || '').toLowerCase();

  if (status === 'cancelled') return 'CANCELLED';
  if (status === 'running') return 'ACTIVE';
  if (status === 'queued') return 'WAITING';
  if (RUN_FAILURE_STATUSES.has(status)) return 'ERROR';
  if (status === 'succeeded') {
    if (delivery === 'failed') return 'UNDELIVERED'; // ran fine, user never got it
    if (delivery === 'pending') return 'DELIVERING';
    return 'COMPLETE';
  }
  return 'UNKNOWN';
}

/** True only when the work finished AND the user-facing result actually landed. */
function isTrulyDelivered(row) {
  const status = String(row.status || '').toLowerCase();
  const delivery = String(row.delivery_status || '').toLowerCase();
  return status === 'succeeded' && (delivery === 'delivered' || delivery === 'not_applicable');
}

/**
 * Agents that are genuinely executing right now — defined as a live `running` task_run,
 * never as "its session file was touched recently".
 */
function getActiveRuns() {
  const rows = query(
    `SELECT task_id, run_id, runtime, agent_id, label, task, status, delivery_status,
            child_session_key, parent_flow_id, parent_task_id,
            created_at, started_at, last_event_at, progress_summary
       FROM task_runs
      WHERE status IN ('running','queued')
      ORDER BY COALESCE(started_at, created_at) DESC`
  );
  const STALE_MS = 60 * 60 * 1000;
  return rows.map((r) => ({
    // A crashed gateway leaves rows stuck in 'running' forever. Flag them so the
    // UI shows 'stuck' rather than confidently claiming the agent is working.
    stale: r.status === 'running' && !!r.started_at && Date.now() - r.started_at > STALE_MS,
    taskId: r.task_id,
    runId: r.run_id,
    runtime: r.runtime,
    agentId: r.agent_id,
    label: r.label,
    task: r.task,
    state: classifyTask(r),
    flowId: r.parent_flow_id,
    parentTaskId: r.parent_task_id,
    childSessionKey: r.child_session_key,
    startedAt: r.started_at || r.created_at,
    // Real elapsed time from real start; null when not started rather than guessed.
    elapsedMs: r.started_at ? Date.now() - r.started_at : null,
    progress: r.progress_summary || null,
  }));
}

/**
 * Agent turns that are genuinely in flight RIGHT NOW.
 *
 * Why this exists: not every live turn has a `task_runs` row. A parent agent
 * waking to process a subagent's announced result runs a real turn that is
 * recorded ONLY in audit_events (agent.run.started with no matching
 * agent.run.finished). Relying on task_runs alone made the dashboard report
 * "0 active" while the main agent was demonstrably mid-turn — verified live
 * on run 71dc7afd, which was executing while task_runs showed none running.
 *
 * Bounded by `maxAgeMs` because orphaned runs exist: the gateway can die
 * mid-turn and leave a `started` with no terminal event forever (real
 * examples in this DB are 12+ hours old). Those are NOT active; they are
 * reported separately by the NO_STUCK_ACTIVE_RUNS invariant instead.
 */
function getLiveAgentRuns(maxAgeMs = 30 * 60 * 1000) {
  const rows = query(
    `SELECT s.run_id, s.agent_id, s.session_key, s.occurred_at
       FROM audit_events s
      WHERE s.action = 'agent.run.started'
        AND s.occurred_at >= ?
        AND NOT EXISTS (
              SELECT 1 FROM audit_events f
               WHERE f.run_id = s.run_id AND f.action = 'agent.run.finished')
      ORDER BY s.occurred_at DESC`,
    [Date.now() - maxAgeMs]
  );
  return rows.map((r) => ({
    runId: r.run_id,
    agentId: r.agent_id,
    sessionKey: r.session_key,
    startedAt: r.occurred_at,
    elapsedMs: Date.now() - r.occurred_at,
    state: 'ACTIVE',
    source: 'audit_events',
  }));
}

/** Orphaned turns: started long ago, never terminated. Not active — broken. */
function getOrphanedAgentRuns(minAgeMs = 30 * 60 * 1000) {
  return query(
    `SELECT s.run_id, s.agent_id, s.session_key, s.occurred_at
       FROM audit_events s
      WHERE s.action = 'agent.run.started'
        AND s.occurred_at < ?
        AND NOT EXISTS (
              SELECT 1 FROM audit_events f
               WHERE f.run_id = s.run_id AND f.action = 'agent.run.finished')
      ORDER BY s.occurred_at DESC LIMIT 25`,
    [Date.now() - minAgeMs]
  );
}

/** The tool/agent call currently in flight for a run, from audit_events (no prose parsing). */
function getCurrentActivityByRun(runIds) {
  if (!runIds.length) return {};
  const placeholders = runIds.map(() => '?').join(',');
  const rows = query(
    `SELECT run_id, tool_name, action, status, occurred_at
       FROM audit_events
      WHERE run_id IN (${placeholders})
      ORDER BY sequence DESC`,
    runIds
  );
  const byRun = {};
  const finished = new Set();
  for (const r of rows) {
    const key = `${r.run_id}::${r.tool_name || ''}`;
    if (r.action === 'tool.action.finished') { finished.add(key); continue; }
    if (r.action === 'tool.action.started' && !finished.has(key) && !byRun[r.run_id]) {
      byRun[r.run_id] = { toolName: r.tool_name, startedAt: r.occurred_at };
    }
  }
  return byRun;
}

/** Recent runtime events, newest first — the LIVE ACTIVITY feed. Metadata only, no payloads. */
function getActivity(limit = 60) {
  const rows = query(
    `SELECT sequence, occurred_at, kind, action, status, agent_id, session_key,
            run_id, tool_name, error_code
       FROM audit_events
      ORDER BY sequence DESC
      LIMIT ?`,
    [Math.min(Number(limit) || 60, 500)]
  );
  return rows.map((r) => ({
    seq: r.sequence,
    at: r.occurred_at,
    kind: r.kind,
    action: r.action,
    status: r.status,
    agentId: r.agent_id,
    runId: r.run_id,
    toolName: r.tool_name || null,
    errorCode: r.error_code || null,
  }));
}

/** Per-tool latency for finished tool calls, paired by run_id + tool_name. */
function getToolLatencies(sinceMs) {
  const rows = query(
    `SELECT run_id, tool_name, action, status, occurred_at
       FROM audit_events
      WHERE kind = 'tool_action' AND occurred_at >= ?
      ORDER BY sequence ASC`,
    [sinceMs]
  );
  const open = new Map();
  const out = [];
  for (const r of rows) {
    const key = `${r.run_id}::${r.tool_name || ''}`;
    if (r.action === 'tool.action.started') {
      open.set(key, r.occurred_at);
    } else if (r.action === 'tool.action.finished') {
      const startedAt = open.get(key);
      if (startedAt != null) {
        out.push({
          runId: r.run_id,
          toolName: r.tool_name,
          status: r.status,
          durationMs: r.occurred_at - startedAt,
        });
        open.delete(key);
      }
    }
  }
  return out;
}

/** Missions = TaskFlows, with their real child task tree attached. */
function getMissions(limit = 25) {
  const flows = query(
    `SELECT flow_id, shape, status, goal, current_step, blocked_task_id, blocked_summary,
            owner_key, created_at, updated_at, ended_at
       FROM flow_runs
      ORDER BY created_at DESC
      LIMIT ?`,
    [Math.min(Number(limit) || 25, 200)]
  );
  return flows.map((f) => {
    const tasks = query(
      `SELECT task_id, run_id, agent_id, label, task, status, delivery_status,
              parent_task_id, created_at, started_at, ended_at, terminal_outcome, error
         FROM task_runs
        WHERE parent_flow_id = ?
        ORDER BY created_at ASC`,
      [f.flow_id]
    );
    const children = tasks.map((t) => ({
      taskId: t.task_id,
      runId: t.run_id,
      agentId: t.agent_id,
      label: t.label,
      state: classifyTask(t),
      status: t.status,
      deliveryStatus: t.delivery_status,
      parentTaskId: t.parent_task_id,
      startedAt: t.started_at,
      endedAt: t.ended_at,
      durationMs: t.started_at && t.ended_at ? t.ended_at - t.started_at : null,
      error: t.error || null,
    }));
    return {
      missionId: f.flow_id,
      goal: f.goal,
      status: f.status,
      currentStep: f.current_step,
      blockedTaskId: f.blocked_task_id,
      blockedSummary: f.blocked_summary,
      createdAt: f.created_at,
      endedAt: f.ended_at,
      durationMs: f.ended_at ? f.ended_at - f.created_at : Date.now() - f.created_at,
      agents: children,
      // A mission is only "done" when every child both succeeded AND delivered.
      allDelivered: children.length > 0 && tasks.every(isTrulyDelivered),
    };
  });
}

function getMission(missionId) {
  return getMissions(200).find((m) => m.missionId === missionId) || null;
}

/** Parent/child subagent linkage straight from subagent_runs. */
function getSubagentTree(limit = 50) {
  const rows = query(
    `SELECT run_id, child_session_key, controller_session_key, requester_session_key,
            task_name, label, model, created_at, started_at, ended_at,
            ended_reason, pending_final_delivery, completion_announced_at
       FROM subagent_runs
      ORDER BY created_at DESC
      LIMIT ?`,
    [Math.min(Number(limit) || 50, 200)]
  );
  return rows.map((r) => ({
    runId: r.run_id,
    childSessionKey: r.child_session_key,
    parentSessionKey: r.requester_session_key,
    controllerSessionKey: r.controller_session_key,
    name: r.task_name || r.label || null,
    model: r.model || null,
    startedAt: r.started_at || r.created_at,
    endedAt: r.ended_at,
    durationMs: r.started_at && r.ended_at ? r.ended_at - r.started_at : null,
    endedReason: r.ended_reason || null,
    // A result the runtime still owes the user — the silent-completion tell.
    pendingFinalDelivery: !!r.pending_final_delivery,
    announced: !!r.completion_announced_at,
  }));
}

/** Today's aggregate counters. Every number here is counted, never estimated. */
function getTodayMetrics() {
  const since = startOfTodayMs();
  const tasks = query(
    `SELECT status, delivery_status, started_at, ended_at
       FROM task_runs
      WHERE created_at >= ?`,
    [since]
  );

  let completed = 0;
  let failed = 0;
  let undelivered = 0;
  const durations = [];

  for (const t of tasks) {
    const state = classifyTask(t);
    if (state === 'COMPLETE') completed += 1;
    else if (state === 'ERROR') failed += 1;
    else if (state === 'UNDELIVERED') undelivered += 1;
    if (t.started_at && t.ended_at) durations.push(t.ended_at - t.started_at);
  }

  const subagents = query(
    `SELECT COUNT(*) AS c FROM subagent_runs WHERE created_at >= ?`,
    [since]
  );
  const flows = query(
    `SELECT COUNT(*) AS c FROM flow_runs WHERE created_at >= ?`,
    [since]
  );
  const toolCalls = query(
    `SELECT COUNT(*) AS c FROM audit_events
      WHERE kind='tool_action' AND action='tool.action.started' AND occurred_at >= ?`,
    [since]
  );

  const avgRuntimeMs = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  return {
    since,
    missions: flows[0] ? flows[0].c : 0,
    tasks: tasks.length,
    completed,
    failed,
    // Ran successfully but the user never received it. This is the bug class we care about.
    undelivered,
    agentHandoffs: subagents[0] ? subagents[0].c : 0,
    toolCalls: toolCalls[0] ? toolCalls[0].c : 0,
    avgRuntimeMs,
  };
}

/**
 * Invariant checks asserted against real state. Each returns ok=false with offending rows
 * rather than throwing, so the dashboard can surface them as SYSTEM WARNINGs.
 */
function getInvariantViolations() {
  const violations = [];

  // INVARIANT: a succeeded run must not have a failed delivery silently ignored.
  const silent = query(
    `SELECT task_id, agent_id, status, delivery_status, ended_at
       FROM task_runs
      WHERE status='succeeded' AND delivery_status='failed'
      ORDER BY ended_at DESC LIMIT 25`
  );
  if (silent.length) {
    violations.push({
      invariant: 'RUN_COMPLETE_IMPLIES_DELIVERED',
      detail: 'Runs succeeded but their user-facing delivery failed (silent completion).',
      count: silent.length,
      rows: silent,
    });
  }

  // INVARIANT: no run may sit in `running` far beyond any plausible turn (stuck/lost).
  const STUCK_MS = 60 * 60 * 1000;
  const stuck = query(
    `SELECT task_id, agent_id, status, started_at
       FROM task_runs
      WHERE status='running' AND started_at IS NOT NULL AND started_at < ?
      ORDER BY started_at ASC LIMIT 25`,
    [Date.now() - STUCK_MS]
  );
  if (stuck.length) {
    violations.push({
      invariant: 'NO_STUCK_ACTIVE_RUNS',
      detail: 'Runs marked active for over an hour with no terminal event.',
      count: stuck.length,
      rows: stuck,
    });
  }

  // INVARIANT: the runtime should not still owe an un-announced subagent result.
  const owed = query(
    `SELECT run_id, child_session_key, pending_final_delivery_last_error
       FROM subagent_runs
      WHERE pending_final_delivery = 1 LIMIT 25`
  );
  if (owed.length) {
    violations.push({
      invariant: 'NO_PENDING_FINAL_DELIVERY',
      detail: 'Subagent results finished but never delivered to the user.',
      count: owed.length,
      rows: owed,
    });
  }

  const orphaned = getOrphanedAgentRuns();
  if (orphaned.length) {
    violations.push({
      invariant: 'NO_ORPHANED_AGENT_RUNS',
      detail: 'Agent turns started but never reached a terminal event (gateway died mid-turn).',
      count: orphaned.length,
      rows: orphaned.slice(0, 10),
    });
  }

  return violations;
}

/** Failed/dead-lettered outbound sends — real delivery failures, not inferred. */
function getDeliveryFailures() {
  return query(
    `SELECT id, status, channel, target, retry_count, last_error, enqueued_at, failed_at
       FROM delivery_queue_entries
      WHERE status = 'failed'
      ORDER BY failed_at DESC LIMIT 25`
  );
}

/** Cheap liveness probe used by /api/health. */
function getDbHealth() {
  const rows = query('SELECT COUNT(*) AS c FROM audit_events');
  return {
    path: DB_PATH,
    ok: rows.length > 0 && lastError === null,
    error: lastError,
    auditEvents: rows[0] ? rows[0].c : null,
  };
}

module.exports = {
  classifyTask,
  isTrulyDelivered,
  getActiveRuns,
  getLiveAgentRuns,
  getOrphanedAgentRuns,
  getCurrentActivityByRun,
  getActivity,
  getToolLatencies,
  getMissions,
  getMission,
  getSubagentTree,
  getTodayMetrics,
  getInvariantViolations,
  getDeliveryFailures,
  getDbHealth,
  getLastError: () => lastError,
  DB_PATH,
};
