# Mission Control bridge (runs on `jarvis`)

These two files are deployed at `~/.openclaw/` on the jarvis host and run as the
`mission-control-bridge.service` systemd user unit on `127.0.0.1:18790`. They are
vendored here so they are version-controlled and reviewable — the deployed copies
are the running ones.

| File | Role |
| --- | --- |
| `mission-control-truth.js` | Read-only projection over OpenClaw's own state DB |
| `mission-control-bridge.js` | HTTP API consumed by this Next.js dashboard |

## Why this exists

The bridge used to determine agent state by spawning `openclaw sessions
--all-agents --json` every 5 seconds and parsing JSONL transcripts, inferring
"active" from recent timestamps. That produced wrong statuses and burned ~109%
CPU continuously.

Everything the dashboard needs is already recorded by OpenClaw in
`~/.openclaw/state/openclaw.sqlite`, so the bridge now reads that **read-only**
via Node 24's built-in `node:sqlite` (no new dependencies).

| Table | Projected to |
| --- | --- |
| `flow_runs` | mission |
| `task_runs` | agent work units — carries `status` **and** `delivery_status` |
| `subagent_runs` | parent/child linkage, `pending_final_delivery` |
| `audit_events` | live activity feed, tool latency |

## State definitions

Never inferred from timestamps or message prose:

- **ACTIVE** — a `task_runs` row in status `running`, **or** an `agent.run.started`
  in `audit_events` with no matching `agent.run.finished` within the last 30 min.
  The second case matters: a parent agent waking to process a subagent result runs
  a real turn that has *no* `task_runs` row. Relying on `task_runs` alone reported
  "0 active" while the main agent was demonstrably mid-turn.
- **WAITING** — `status = 'queued'`
- **ERROR** — `status` in (failed, timed_out, lost, cancelled)
- **UNDELIVERED** — `status = 'succeeded'` but `delivery_status = 'failed'`.
  RUN_COMPLETE != DELIVERED; this is the silent-completion failure mode.
- **COMPLETE** — succeeded *and* delivered

Runs started >30 min ago with no terminal event are **not** active — the gateway
can die mid-turn and orphan them (there are 12h-old examples in this DB). Those
are reported by the `NO_ORPHANED_AGENT_RUNS` invariant instead.

## Endpoints

`/api/health` `/api/agents` `/api/live-status` `/api/dashboard-summary`
`/api/stream` (SSE) `/api/missions` `/api/missions/:id` `/api/activity`
`/api/active` `/api/metrics` `/api/subagents` `/api/invariants` `/api/cron`
`/api/memory` `/api/tasks`

## Known limitations

- **Token counts** are the one figure the state DB does not record, so a slow
  (60s) `openclaw sessions` call is still made *solely* for `tokensUsed`. It is
  reported as `null`, never `0`, when unavailable — an absent metric must not
  masquerade as a real zero.
- **Agent attribution for subagents**: `task_runs.agent_id` and
  `audit_events.agent_id` record the *owning* agent (`main`) rather than the
  specialist. The specialist identity lives in `subagent_runs.task_name` /
  `child_session_key`.
- **Retention**: `task_runs` rows are pruned via `cleanup_after`. Do not treat
  the ledger as infinite history.

## Deploy

```bash
scp bridge/mission-control-truth.js  jarvis:/home/ubuntu/.openclaw/
scp bridge/mission-control-bridge.js jarvis:/home/ubuntu/.openclaw/
ssh jarvis 'node --check ~/.openclaw/mission-control-bridge.js && \
            systemctl --user restart mission-control-bridge.service'
```
