# J.A.R.V.I.S. Architecture

Canonical, current-state architecture reference. Distilled from live verification on
2026-08-19; for exhaustive historical detail see `CAPSTONE_AUDIT.md` (gitignored,
not deployed). This file should be updated whenever the real architecture changes —
treat it as living documentation, not a point-in-time snapshot.

## Infrastructure

- **Server**: AWS Lightsail, hostname/ssh-alias `jarvis` (ubuntu@54.212.67.97),
  2 vCPU / 8GB RAM / ~160GB disk, ~$44/month, us-west-2.
- **OpenClaw**: v2026.7.1-2, gateway on `ws://127.0.0.1:18789`, systemd user service
  `openclaw-gateway.service`.
- **Mission Control bridge**: `~/.openclaw/mission-control-bridge.js` on jarvis,
  systemd user service `mission-control-bridge.service`, port 18790. Reads
  `~/.openclaw/state/openclaw.sqlite` (native OpenClaw runtime ledger — audit_events,
  task_runs, flow_runs, subagent_runs) directly. This is the single source of truth
  for the dashboard; there is no separate polling/JSONL-parsing path (deliberately
  removed).
- **Dashboard**: this repo, deployed to Vercel production at
  https://jarvis-command-center-theta.vercel.app. GitHub Actions CI does not
  auto-deploy on merge (missing BRIDGE_URL/BRIDGE_TOKEN secrets — these are Vercel
  "Sensitive" env vars and can't be read back into CI without a coordinated
  BRIDGE_TOKEN rotation). Manual `vercel --prod` is the current deploy path.
- **Bridge exposure**: dashboard reaches the jarvis bridge over a Cloudflare quick
  tunnel (`cloudflared tunnel --url http://localhost:18790`), which rotates its URL
  on gateway/tunnel restart. No permanent stable URL yet — needs either a Cloudflare
  API token or further Tailscale/Vercel DNS work (Vercel serverless functions cannot
  resolve `*.ts.net` hostnames — confirmed, so plain Tailscale Funnel is not viable
  as-is).

## Agents

28 real configured agents as of 2026-08-19 (`openclaw agents list --json`), down
from a historical 30 as agent-to-skill consolidation retires low-value agents.
`~/.openclaw/agents/` on disk has ~116 directories total; only the ones in `agents
list` are live — the rest are historical leftovers, safe cleanup candidates but not
yet removed. Retired agent workspaces are archived, not deleted
(`~/retired-agents-*.tar.gz` on jarvis).

Routing is gated through the `main` orchestrator only for Slack traffic (channel
`#main`). `main`'s instructions live in `~/.openclaw/workspace/AGENTS.md` on jarvis
and currently encode:

- **Skill-first routing policy**: default is to do the work directly with a loaded
  skill; spawning a specialist agent is the exception, justified only by genuine
  independent judgment, real parallelism, isolation needs, or specialized
  long-running context — not "it sounds more thorough."
- **Concurrency cap**: at most 2 specialist workers concurrently (3 if Thomas
  invokes "fast mode" for that mission).
- **Topic-tagged memory convention** (`topic/<slug>`) for cross-agent memory recall
  via the shared `basic-memory` MCP project `jarvis-knowledge`.
- **Standing orders reference**: `~/.openclaw/workspace/STANDING_ORDERS.md` covers
  when `main` may act autonomously (gateway/Slack health, context protection,
  dashboard-truth reconciliation, stuck/orphaned-work detection, bounded recovery,
  low-risk maintenance, backups before architecture changes) versus when it must
  stop and ask Thomas (payment, new credentials, physical action, irreversible risk,
  possible data loss, security-boundary expansion, or a bounded recovery that
  failed).
- **Resource governor gate**: before starting background agents or heavy exec work,
  run `~/.openclaw/bin/resource-governor.sh` and honor its verdict — a deterministic,
  read-only, no-LLM-call script that outputs GREEN/YELLOW/RED/CRITICAL from
  `/proc/loadavg`, `/proc/meminfo`, disk usage, and live `task_runs` counts in the
  sqlite state DB. Budget: GREEN = 2 background agents, YELLOW = 1, RED/CRITICAL = 0.
  One interactive Mission Control run is always allowed on top of the budget.
  Processes are never killed merely for using CPU.

## Skill library

`~/.openclaw/skills/` on jarvis holds ~68 shared skills (research, SEO,
copywriting, analytics, QA, memory, scheduling, video-intel, etc.) that agents load
directly instead of spawning a specialist for routine work. This is the
consolidation target: shrink the agent roster toward ~10-15 core agents backed by
this shared skill library, rather than one agent per narrow task type.

Other skill-related directories exist but are not yet part of the active
architecture: `~/.openclaw/skill-workshop/` (proposal staging), `~/.openclaw/
plugin-skills/` (2 entries: slack, browser-automation), and `~/.openclaw/sandbox/
skills-workspaces/` (dozens of ephemeral per-run subagent sandboxes — cleanup
candidate, not yet actioned).

## Reliability fixes (live in vendored OpenClaw dist/ files)

Two real Slack bugs were root-caused and patched directly in OpenClaw's vendored
`dist/` output. **These patches are erased by any `openclaw` npm upgrade** — see
`docs/UPSTREAM_BUG_*.md` in this repo for exact reapply instructions, and check
`grep -c stripLeadingSilentCommentaryToken /usr/lib/node_modules/openclaw/dist/
channel-outbound-*.js` (nonzero = patch present) after any upgrade.

1. **NO_REPLY sentinel leak** — exact-match instead of prefix-match let
   `"NO_REPLYfoo..."` leak into Slack as a visible message. Fixed.
2. **Duplicate progress messages** — a subagent-announce completion sometimes
   narrates the same state transition twice before closing with NO_REPLY; the
   reply pipeline only deduped on exact text match. Fixed with an identity-keyed
   dedup (announceRunId, 5min TTL). Verified legitimate multi-part replies still
   deliver.

Known, unfixed: a "rapid concurrent mentions" bug where OpenClaw's own watchdog
detects and reports dropped replies under rapid concurrent Slack mentions. Root
cause not isolated. Workaround: send one Slack message at a time, wait for
DELIVERED.

## Video Intelligence

Provider-neutral router + SQLite evidence store at `~/.openclaw/skills/video-intel/`
on jarvis, keyed by platform+video-ID/content-hash. Enforces a marketing rubric with
MEASURED/OBSERVED/INFERRED honesty gating — refuses to answer visual questions
without real visual evidence.

**Status: blocked, no working zero-spend provider as of 2026-08-19.**

- Gemini: explicitly rejected by Thomas (too many prior errors) — do not resurrect,
  including via a third-party wrapper.
- Local yt-dlp download on Lightsail: not viable as a normal path — YouTube blocks
  all tested yt-dlp client variants, transcript API, and live browser rendering from
  this server. (yt-dlp may remain in use for unrelated, non-YouTube tasks.)
- Supadata: authenticated, does genuine visual analysis (verified non-hallucinated
  via contamination + thumbnail checks). Free-tier quota exhausted during testing —
  do not call again until Thomas tops it up (payment decision) or quota resets.
- TwelveLabs: authenticated (v1.3, marengo3.0 index), genuine visual understanding
  verified via a synthesized ground-truth clip. Direct YouTube URL ingestion is not
  supported — needs a raw media URL, and no such ingestion path has been built yet.
- VideoDB: credential added. A live acceptance-test job against the mandatory test
  video (`https://www.youtube.com/watch?v=IA_zUI1Q6pY`) completed with
  `{"message":"Download failed.","success":false}`. **Root cause unknown** — VideoDB
  ingests on its own infrastructure, not this server, so there is no evidence this
  was a Lightsail/YouTube IP-block issue specifically; treat as an unexplained
  single-provider, single-URL failure until logs or docs say otherwise.

No provider currently has a proven, zero-spend path to ingest the mandatory YouTube
test video. Do not add further providers or spend money without Thomas's explicit
go-ahead. A documented (not yet built) future diagnostic: upload an authorized
local video file from Thomas's Mac directly to VideoDB or TwelveLabs, bypassing
Lightsail as the media path entirely, to isolate whether the server's network is a
factor at all — test-only, not the default architecture.

The full acceptance sequence (10-question visual-truth test at ≥85% accuracy, a real
Slack "analyze this video" mission with a structured report and an explicit
approval-gate before implementing any derived improvements, then 4 follow-up
questions proving persistent video memory without resending the URL) has not run
yet — blocked on a working provider.

## Memory

`basic-memory` MCP, project `jarvis-knowledge`, notes under
`~/.openclaw/workspace/memory/knowledge/` on jarvis. Cross-agent recall works via
the `topic/<slug>` tagging convention in `AGENTS.md` — reuse it, don't invent a new
one. Session rollover (`openclaw gateway call sessions.reset --params
'{"key":"<sessionKey>"}'`) creates a fresh sessionId under the same session key
without losing memory or requiring Slack reinvite — proven live, and is the
preferred recovery path over `sessions.compact` (observed to fail/timeout under
server load).

## Known technical debt

- Vendored OpenClaw patches (NO_REPLY, duplicate-message) erased by any `openclaw`
  npm upgrade — reapply per `docs/UPSTREAM_BUG_*.md`.
- GitHub Actions CI deploy broken (needs coordinated BRIDGE_TOKEN rotation).
- Rapid-concurrent-mentions message-drop bug, not fixed.
- ~86 stale agent directories on disk, not cleaned up.
- Bridge URL rotates on restart (no permanent Cloudflare/Tailscale-Vercel solution
  yet).

## What's still outstanding (Production Hardening)

- Finish agent-to-skill consolidation to the ~10-15 core agent target (currently
  28), verifying each conversion live rather than in one unverified batch.
- Slack reliability as a proper ack-immediately/enqueue/serialize-per-channel queue.
- Context governor 2.0 with graduated HEALTHY/ELEVATED/PRUNING/COMPACTING/
  ROLLOVER_REQUIRED states.
- Finite self-healing matrix (bounded retries, never infinite loops).
- Backup + restore proof (a real restore, not just backup creation).
- Security/tool-permission compartmentalization per agent.
- Regression + soak test suite (gateway restart during idle vs. queued work,
  child-agent failure, tool failure, delivery retry, dashboard reconnect).
- Final real-Slack acceptance sequence A-H (simple math, memory recall, content
  rewrite, research w/ sources, multi-stage research→content→QA, video, video
  follow-up, controlled failure recovery), one Slack message at a time, each with
  EXPECTED/OBSERVED/PASS-FAIL recorded.
