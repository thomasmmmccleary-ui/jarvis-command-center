#!/usr/bin/env node
// Mission Control bridge API — exposes read-only jarvis/OpenClaw state (agents,
// cron, memory) plus a simple task store, over plain HTTP with bearer-token
// auth. Zero external dependencies on purpose: this is infra, not a product,
// and every extra dependency is one more thing that can break unattended.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
// Runtime-truth projection over OpenClaw's own durable sqlite state (read-only).
// Replaces timestamp/prose guessing for agent state, missions, and delivery outcome.
const truth = require('./mission-control-truth.js');

const PORT = process.env.PORT || 18790;
const BRIDGE_STARTED_AT = Date.now();
const TOKEN = process.env.MISSION_CONTROL_BRIDGE_TOKEN;
const OPENCLAW_CONFIG = '/home/ubuntu/.openclaw/openclaw.json';
const MEMORY_DIR = '/home/ubuntu/.openclaw/workspace/memory/library';
const TASKS_FILE = '/home/ubuntu/.openclaw/mission-control/tasks.json';
const ALLOWED_ORIGIN = process.env.MISSION_CONTROL_ALLOWED_ORIGIN || '*';
// Sessions are no longer the source of truth for any state — the state DB is.
// This subprocess now runs only to collect per-session token totals, which the
// state DB does not record, so it is 12x slower than the old 5s state poll.
const SESSIONS_REFRESH_MS = 60000;

if (!TOKEN) {
  console.error('MISSION_CONTROL_BRIDGE_TOKEN is not set — refusing to start unauthenticated.');
  process.exit(1);
}

// Every route below used to independently shell out to `openclaw sessions
// --all-agents --json` on every single HTTP request (a multi-second
// subprocess spawn). Under concurrent polling from the dashboard this
// stacked up past the per-call timeout and silently fell back to empty
// data — the root cause of "Session details not in cache" and zeroed stats.
// Instead we run ONE background refresh loop and every route reads the
// shared in-memory snapshot, so responses are instant and never time out.
//
// Two things this loop must NOT do, both learned the hard way in this same
// file: (1) let refreshes overlap — if `openclaw sessions` ever takes longer
// than the interval, an unguarded setInterval stacks up concurrent
// subprocesses until the box chokes; (2) recompute the (synchronous,
// file-read-heavy) dashboard summary on every incoming HTTP request — with
// polling every few seconds that blocks Node's single event loop long
// enough that even /api/health stops responding. So: one guarded refresh,
// one computed-summary cache, every route just reads memory.
const sessionsSnapshot = { sessions: [], fetchedAt: 0, error: null };

const summaryCache = { data: null, computedAt: 0 };
const sseClients = new Set();
let refreshInFlight = false;

function refreshSessionsCache() {
  if (refreshInFlight) return; // previous refresh still running — skip this tick rather than stack up
  refreshInFlight = true;
  execFile(
    'openclaw',
    ['sessions', '--all-agents', '--active', '1440', '--json'],
    { timeout: 20000, maxBuffer: 40 * 1024 * 1024 },
    (err, stdout) => {
      refreshInFlight = false;
      if (err) {
        sessionsSnapshot.error = err.message;
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        sessionsSnapshot.sessions = parsed.sessions || [];
        sessionsSnapshot.fetchedAt = Date.now();
        sessionsSnapshot.error = null;
      } catch (e) {
        sessionsSnapshot.error = `parse error: ${e.message}`;
        return;
      }
      // Recompute the summary (the expensive, synchronous-file-read part)
      // exactly once per successful refresh, not once per HTTP request.
      computeDashboardSummary().then((summary) => {
        summaryCache.data = summary;
        summaryCache.computedAt = Date.now();
        broadcastSSE(summary);
      });
    }
  );
}

function broadcastSSE(summary) {
  if (!sseClients.size) return;
  const payload = `data: ${JSON.stringify(summary)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch { sseClients.delete(res); }
  }
}

// getDashboardSummary() is the public accessor every route/SSE-connect uses
// — always instant, always from cache. computeDashboardSummary() (defined
// further down) is the actual expensive computation, called only from the
// refresh loop above.
function getDashboardSummary() {
  return Promise.resolve(
    summaryCache.data || {
      fetchedAt: new Date().toISOString(),
      dataSource: 'warming up — first snapshot not ready yet',
      bridgeStartedAt: new Date(BRIDGE_STARTED_AT).toISOString(),
      today: { missionsRun: 0, subagentsLaunched: 0, tokensUsed: 0, completedToday: 0, failedToday: 0, completedMissions: [], activeMissions: [], failedMissions: [] },
      activeWork: [],
      recentCompleted: [],
    }
  );
}

refreshSessionsCache();
setInterval(refreshSessionsCache, SESSIONS_REFRESH_MS);

// Live updates are driven off the state DB, not the subprocess. Recomputing the
// summary from sqlite is a handful of indexed queries (single-digit ms), so this
// can tick fast without the event-loop stalls the old file-reading path caused.
const TRUTH_TICK_MS = 3000;
setInterval(() => {
  // Must run unconditionally: this is the ONLY writer of summaryCache, and
  // /api/dashboard-summary serves that cache. Gating on SSE clients froze the
  // summary at boot for every plain fetch consumer. Measured full tick ~11.5ms.
  computeDashboardSummary().then((summary) => {
    summaryCache.data = summary;
    summaryCache.computedAt = Date.now();
    if (sseClients.size) broadcastSSE(summary);
  }).catch((e) => console.error('[truth-tick]', e.message));
}, TRUTH_TICK_MS);

// Warm the cache immediately so the first request is never "warming up".
computeDashboardSummary().then((s) => { summaryCache.data = s; summaryCache.computedAt = Date.now(); }).catch(() => {});

// getCron() had the exact same live-shell-out-per-request problem as
// sessions did: `openclaw cron list --json` is its own subprocess spawn,
// and under load it was observed hanging past its own 10s timeout —
// meaning /api/cron could time out independently of anything session-
// related. Cron jobs change rarely, so a 30s cache is plenty fresh.
const CRON_REFRESH_MS = 30000;
const cronCache = { data: [], fetchedAt: 0 };
let cronRefreshInFlight = false;

function refreshCronCache() {
  if (cronRefreshInFlight) return;
  cronRefreshInFlight = true;
  computeCron().then((jobs) => {
    cronCache.data = jobs;
    cronCache.fetchedAt = Date.now();
  }).finally(() => { cronRefreshInFlight = false; });
}

function getCron() {
  return Promise.resolve(cronCache.data);
}

refreshCronCache();
setInterval(refreshCronCache, CRON_REFRESH_MS);

function ensureTasksFile() {
  const dir = path.dirname(TASKS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(TASKS_FILE)) fs.writeFileSync(TASKS_FILE, JSON.stringify({ tasks: [] }, null, 2));
}

function readTasks() {
  ensureTasksFile();
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  } catch {
    return { tasks: [] };
  }
}

function writeTasks(data) {
  ensureTasksFile();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (c) => { chunks += c; if (chunks.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!chunks) return resolve({});
      try { resolve(JSON.parse(chunks)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function getAgents() {
  const cfg = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf8'));
  const list = cfg.agents && cfg.agents.list ? cfg.agents.list : [];
  return list.map((a) => ({
    id: a.id,
    name: a.name,
    model: a.model || (cfg.agents.defaults && cfg.agents.defaults.model && cfg.agents.defaults.model.primary),
    toolsProfile: a.tools && a.tools.profile,
  }));
}

// Called only from refreshCronCache() above — routes read the cached
// result via getCron().
function computeCron() {
  return new Promise((resolve) => {
    execFile('openclaw', ['cron', 'list', '--json'], { timeout: 10000 }, (err, stdout) => {
      if (err) {
        // Fall back to plain-text parse if --json isn't supported by this version.
        execFile('openclaw', ['cron', 'list'], { timeout: 10000 }, (err2, stdout2) => {
          if (err2) return resolve([]);
          const lines = stdout2.split('\n').filter((l) => l.trim() && !l.startsWith('ID'));
          resolve(lines.map((l) => ({ raw: l.trim() })));
        });
        return;
      }
      try { resolve(JSON.parse(stdout)); } catch { resolve([]); }
    });
  });
}

function getMemory() {
  if (!fs.existsSync(MEMORY_DIR)) return [];
  return fs.readdirSync(MEMORY_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const full = path.join(MEMORY_DIR, f);
      const stat = fs.statSync(full);
      return { file: f, sizeBytes: stat.size, modifiedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

// ---------------------------------------------------------------------------
// RUNTIME-TRUTH IMPLEMENTATIONS (replaces the former sessions+JSONL heuristics)
//
// What used to live here: fetchAllSessions(), readJsonlSummary(),
// readLastAssistantAction(), and a computeDashboardSummary() that inferred
// agent state by reading transcript files and comparing timestamps. That
// approach produced the failure modes this rewrite exists to kill — agents
// shown active after finishing, idle while working, and "recently updated ==
// active". All of it is now sourced from OpenClaw's own durable sqlite state
// via mission-control-truth.js.
//
// ACTIVE means a task_run row is literally in status 'running'. Nothing here
// infers state from a timestamp or from message prose.
// ---------------------------------------------------------------------------

/** Map a truth-layer run state onto the roster vocabulary the UI already speaks. */
function rosterStatusFromRunState(state) {
  if (state === 'ACTIVE') return 'working';
  if (state === 'WAITING' || state === 'DELIVERING') return 'waiting';
  if (state === 'CANCELLED') return 'idle';
  if (state === 'STUCK') return 'failed';
  if (state === 'ERROR' || state === 'UNDELIVERED') return 'failed';
  return 'idle';
}

/**
 * Per-agent live roster. An agent appears as 'working' only while it owns a
 * real running run; every other agent is idle by definition, not by decay.
 */
function getLiveStatus() {
  const runs = truth.getActiveRuns();
  const agents = {};

  for (const r of runs) {
    if (!r.agentId) continue;
    const status = r.stale ? 'failed' : rosterStatusFromRunState(r.state);
    // If an agent somehow owns several live runs, 'working' wins over 'waiting'.
    if (agents[r.agentId] && agents[r.agentId].status === 'working') continue;
    agents[r.agentId] = {
      status,
      rawStatus: r.state,
      runId: r.runId,
      taskId: r.taskId,
      startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : null,
      lastInteractionAt: r.startedAt ? new Date(r.startedAt).toISOString() : null,
      ageMs: r.elapsedMs,
      kind: r.runtime,
    };
  }

  // Parent agents waking to process a subagent result run a real turn that has
  // no task_runs row — only an audit_events start with no finish. Without this,
  // the roster showed everyone idle while main was demonstrably mid-turn.
  for (const lr of truth.getLiveAgentRuns()) {
    if (!lr.agentId) continue;
    agents[lr.agentId] = {
      status: 'working',
      rawStatus: 'ACTIVE',
      runId: lr.runId,
      taskId: null,
      startedAt: new Date(lr.startedAt).toISOString(),
      lastInteractionAt: new Date(lr.startedAt).toISOString(),
      ageMs: lr.elapsedMs,
      kind: 'agent_turn',
    };
  }

  // Configured agents with no live run are idle — stated explicitly rather
  // than left absent, so the UI never has to guess at a missing key.
  for (const a of getAgents()) {
    if (!agents[a.id]) {
      agents[a.id] = { status: 'idle', rawStatus: 'NO_LIVE_RUN', runId: null, taskId: null, startedAt: null, lastInteractionAt: null, ageMs: null, kind: null };
    }
  }

  // Surface genuinely broken outcomes (ran but never delivered) as a system
  // warning rather than hiding them behind a green roster.
  const violations = truth.getInvariantViolations();

  return Promise.resolve({
    agents,
    generatedAt: new Date().toISOString(),
    dataSource: 'openclaw state db (task_runs)',
    snapshotFetchedAt: new Date().toISOString(),
    snapshotError: truth.getLastError(),
    warnings: violations.map((v) => ({ invariant: v.invariant, count: v.count, detail: v.detail })),
  });
}

/** Shape a truth mission into the record shape the dashboard already renders. */
function missionRecordFromTruth(m) {
  const failed = m.agents.some((a) => a.state === 'ERROR' || a.state === 'UNDELIVERED');
  const running = m.agents.some((a) => a.state === 'ACTIVE' || a.state === 'WAITING' || a.state === 'DELIVERING');
  const status = running ? 'running' : failed ? 'failed' : 'done';
  const primary = m.agents[0] || {};
  return {
    id: m.missionId,
    agent: primary.agentId || null,
    name: primary.label || primary.agentId || 'mission',
    label: primary.label || primary.agentId || 'mission',
    channel: 'runtime',
    subagentCount: m.agents.length,
    // Token totals are not recorded per task_run; 0 keeps arithmetic safe.
    tokens: 0,
    goal: (m.goal || '').slice(0, 250),
    status,
    startedAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
    completedAt: m.endedAt ? new Date(m.endedAt).toISOString() : null,
    durationMs: m.durationMs,
    agents: m.agents,
    // Only true when every child both succeeded AND its result reached the user.
    delivered: m.allDelivered,
  };
}

/**
 * Dashboard summary, fully derived from runtime truth.
 *
 * One deliberate exception: `tokensUsed` is not recorded in the state DB's
 * audit/task tables, so it still comes from the (now slow, 60s) sessions
 * snapshot. It is the only figure here not sourced from sqlite, and it is
 * reported as null rather than 0 when that snapshot is unavailable — an
 * absent metric must not masquerade as a real zero.
 */
function computeDashboardSummary() {
  const metrics = truth.getTodayMetrics();
  const missions = truth.getMissions(50).filter((m) => m.createdAt >= metrics.since);
  const missionRecords = missions.map(missionRecordFromTruth);

  const runs = truth.getActiveRuns();
  const currentTools = truth.getCurrentActivityByRun(runs.map((r) => r.runId).filter(Boolean));

  const activeWork = runs.map((r) => {
    const tool = currentTools[r.runId];
    return {
      id: r.taskId,
      // The office/panel views key and label off these; omitting them rendered
      // undefined names, blank React keys, and every agent miscategorized.
      sessionKey: r.childSessionKey || r.taskId,
      agentId: r.agentId,
      agentName: r.agentId === 'main' ? 'J.A.R.V.I.S.' : (r.label || r.agentId),
      tokens: 0,
      agent: r.agentId,
      label: r.label || r.agentId,
      // Real current verb from a real in-flight tool call, or the plain run state.
      activity: tool ? `${tool.toolName}` : r.state === 'WAITING' ? 'queued' : 'running',
      task: (r.task || '').slice(0, 250),
      startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : null,
      elapsedMs: r.elapsedMs,
      state: r.state,
      missionId: r.flowId || null,
    };
  });

  const recentCompleted = truth
    .getMissions(25)
    .filter((m) => m.endedAt)
    .slice(0, 10)
    .map((m) => {
      const rec = missionRecordFromTruth(m);
      return {
        id: rec.id,
        sessionKey: rec.id,
        tokens: 0,
        agent: rec.agent,
        label: rec.label,
        goal: rec.goal,
        completedAt: rec.completedAt,
        durationMs: rec.durationMs,
        delivered: rec.delivered,
        outcome: rec.delivered ? 'delivered' : 'completed but NOT delivered',
      };
    });

  // Token accounting is the one figure sqlite cannot supply; null means unknown.
  const tokensUsed = sessionsSnapshot.fetchedAt
    ? sessionsSnapshot.sessions
        .filter((s) => (s.updatedAt || 0) >= metrics.since)
        .reduce((sum, s) => sum + (s.totalTokens || 0), 0)
    : null;

  return Promise.resolve({
    fetchedAt: new Date().toISOString(),
    dataSource: 'openclaw state db (flow_runs/task_runs/audit_events); tokens from sessions snapshot',
    bridgeStartedAt: new Date(BRIDGE_STARTED_AT).toISOString(),
    today: {
      missionsRun: metrics.missions,
      subagentsLaunched: metrics.agentHandoffs,
      tokensUsed,
      completedToday: metrics.completed,
      failedToday: metrics.failed,
      // Ran successfully but the user never received it — previously invisible.
      undeliveredToday: metrics.undelivered,
      toolCalls: metrics.toolCalls,
      avgRuntimeMs: metrics.avgRuntimeMs,
      completedMissions: missionRecords.filter((m) => m.status === 'done'),
      activeMissions: missionRecords.filter((m) => m.status === 'running'),
      failedMissions: missionRecords.filter((m) => m.status === 'failed'),
    },
    activeWork,
    recentCompleted,
  });
}

function getMemoryContent(file) {
  const safe = path.basename(file);
  const full = path.join(MEMORY_DIR, safe);
  if (!full.startsWith(MEMORY_DIR) || !fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    });
    return res.end();
  }

  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${TOKEN}`) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    // ---- runtime-truth routes (sqlite-backed; no polling, no inference) ----
    if (req.method === 'GET' && url.pathname === '/api/missions') {
      return sendJson(res, 200, { missions: truth.getMissions(Number(url.searchParams.get('limit')) || 25) });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/missions/')) {
      const id = decodeURIComponent(url.pathname.slice('/api/missions/'.length));
      const mission = truth.getMission(id);
      if (!mission) return sendJson(res, 404, { error: 'mission not found', missionId: id });
      return sendJson(res, 200, mission);
    }

    if (req.method === 'GET' && url.pathname === '/api/activity') {
      return sendJson(res, 200, { activity: truth.getActivity(Number(url.searchParams.get('limit')) || 60) });
    }

    if (req.method === 'GET' && url.pathname === '/api/active') {
      const runs = truth.getActiveRuns();
      const known = new Set(runs.map((r) => r.runId));
      // Include in-flight agent turns that have no task_runs row (parent wake-turns).
      const extra = truth.getLiveAgentRuns().filter((lr) => !known.has(lr.runId));
      const all = [...runs, ...extra];
      const current = truth.getCurrentActivityByRun(all.map((r) => r.runId).filter(Boolean));
      return sendJson(res, 200, {
        activeCount: all.filter((r) => r.state === 'ACTIVE').length,
        runs: all.map((r) => ({ ...r, task: (r.task || '').slice(0, 250), currentTool: current[r.runId] || null })),
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/metrics') {
      return sendJson(res, 200, {
        today: truth.getTodayMetrics(),
        toolLatencies: truth.getTodayMetrics().toolCalls,
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/subagents') {
      return sendJson(res, 200, { subagents: truth.getSubagentTree(Number(url.searchParams.get('limit')) || 50) });
    }

    if (req.method === 'GET' && url.pathname === '/api/invariants') {
      const violations = truth.getInvariantViolations();
      return sendJson(res, 200, { ok: violations.length === 0, violations, deliveryFailures: truth.getDeliveryFailures() });
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, time: new Date().toISOString(), bridgeStartedAt: new Date(BRIDGE_STARTED_AT).toISOString(), stateDb: truth.getDbHealth() });
    }

    if (req.method === 'GET' && url.pathname === '/api/agents') {
      return sendJson(res, 200, { agents: getAgents() });
    }

    if (req.method === 'GET' && url.pathname === '/api/live-status') {
      return sendJson(res, 200, await getLiveStatus());
    }

    if (req.method === 'GET' && url.pathname === '/api/dashboard-summary') {
      return sendJson(res, 200, await getDashboardSummary());
    }

    if (req.method === 'GET' && url.pathname === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');
      sseClients.add(res);
      getDashboardSummary().then((summary) => {
        try { res.write(`data: ${JSON.stringify(summary)}\n\n`); } catch { /* client gone */ }
      });
      const keepAlive = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { /* client gone */ }
      }, 15000);
      req.on('close', () => {
        clearInterval(keepAlive);
        sseClients.delete(res);
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/cron') {
      return sendJson(res, 200, { cron: await getCron() });
    }

    if (req.method === 'GET' && url.pathname === '/api/memory') {
      return sendJson(res, 200, { files: getMemory() });
    }

    if (req.method === 'GET' && url.pathname === '/api/memory/content') {
      const file = url.searchParams.get('file');
      if (!file) return sendJson(res, 400, { error: 'missing file param' });
      const content = getMemoryContent(file);
      if (content === null) return sendJson(res, 404, { error: 'not found' });
      return sendJson(res, 200, { file, content });
    }

    if (req.method === 'GET' && url.pathname === '/api/tasks') {
      return sendJson(res, 200, readTasks());
    }

    if (req.method === 'POST' && url.pathname === '/api/tasks') {
      const body = await readBody(req);
      if (!body.title) return sendJson(res, 400, { error: 'title is required' });
      const data = readTasks();
      const task = {
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: body.title,
        description: body.description || '',
        status: body.status || 'backlog',
        assignee: body.assignee || null,
        priority: body.priority || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.tasks.push(task);
      writeTasks(data);
      return sendJson(res, 201, { task });
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/tasks/')) {
      const id = url.pathname.split('/').pop();
      const body = await readBody(req);
      const data = readTasks();
      const task = data.tasks.find((t) => t.id === id);
      if (!task) return sendJson(res, 404, { error: 'not found' });
      Object.assign(task, body, { updatedAt: new Date().toISOString() });
      writeTasks(data);
      return sendJson(res, 200, { task });
    }

    return sendJson(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('bridge error:', err);
    return sendJson(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mission-control bridge listening on 127.0.0.1:${PORT}`);
});
