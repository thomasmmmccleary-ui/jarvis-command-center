# Upstream bug: subagent-announce runs can deliver the same state transition as two separate Slack messages

**Product:** OpenClaw
**Version observed:** `2026.7.1-2 (0790d9f)`
**Severity:** Medium — duplicate, near-identical status messages visible to end users in chat
**Status:** Reproduced live with real Slack `ts` evidence; local stopgap patch applied (see "Local patch" below)

---

## Summary

When a subagent (research/copywriter/etc.) completes and OpenClaw's `subagent-announce`
flow wakes the `main` agent to narrate the completion ("reply to the user in your normal
assistant voice"), the resulting model completion can contain **multiple distinct assistant
text segments** within the *same run* — e.g. a narration line emitted immediately before a
`sessions_spawn` tool call, followed by a second, differently-worded restatement of the same
state, before the model finally closes the turn with the internal `NO_REPLY` sentinel.

OpenClaw's generic block-reply delivery pipeline (used by every channel, including Slack)
dedupes only on **exact text**, so two differently-worded segments describing the same event
both pass through and are delivered as two separate, near-identical channel messages.

Observed live in Slack (`#main`, channel `C0BQ39EKLDV`), 154ms apart, same bot, no thread:

```
ts=1787106733.480209  02:32:13.480Z  "Research is in. Now spawning the copywriter with the
                                      findings, and will run QA after."
ts=1787106733.633709  02:32:13.634Z  "Research is in — now spawning the copywriter."
```

This is **not** a race between two independent notifier mechanisms — it is a single LLM
completion. Confirmed directly via `openclaw sessions export-trajectory`, the `model.completed`
event for that run recorded:

```json
"assistantTexts": [
  "Research is in. Now spawning the copywriter with the findings, and will run QA after.",
  "Research is in — now spawning the copywriter.",
  "NO_REPLY"
]
```

## Affected code

**Delivery chokepoint (channel-agnostic, used by Slack/Discord/Telegram/etc.):**
`dist/block-reply-pipeline-E4MUo5Qm.js` (source: `src/auto-reply/reply/block-reply-pipeline.ts`),
function `createBlockReplyPipeline` → `sendPayload`. Its existing dedup
(`createBlockReplyPayloadKey` / `seenKeys` / `sentKeys`) is keyed on the **exact serialized
text** of each payload, so two different phrasings of the same event both pass.

**Identity that already exists but wasn't wired to delivery:**
`dist/announce-idempotency-DRIcQ039.js`:

```js
function buildAnnounceIdFromChildRun(params) {
  return `v1:${params.childSessionKey}:${params.childRunId}`;
}
function buildAnnounceIdempotencyKey(announceId) {
  return `announce:${announceId}`;
}
```

Direct-dispatched announce runs (`sendSubagentAnnounceDirectly` in
`dist/subagent-announce-origin-DPSebzOW.js`) already use this `directIdempotencyKey` as the
freshly-dispatched run's own `runId` — confirmed empirically: the runs that produced the
duplicate messages above had `runId = "announce:v1:agent:main:subagent:<childSessionKey-suffix>:<childRunId>"`,
exactly matching `buildAnnounceIdempotencyKey`'s output shape. So the stable identity needed to
dedupe was already present at the run level — it just never reached the block-reply delivery
pipeline that actually sends messages.

**Where the identity needed to be threaded through:**
`dist/agent-runner.runtime-DtdxZiBX.js`, where `createBlockReplyPipeline` is actually
constructed per run (previously did not pass any run identity into the pipeline at all).

## Why this is not a text-similarity problem

Both segments are phrased differently ("Research is in. Now spawning the copywriter with the
findings, and will run QA after." vs. "Research is in — now spawning the copywriter.") — a
wording/similarity filter would be fragile and would risk suppressing legitimate distinct
messages that happen to share vocabulary. The correct fix is identity-based: dedupe on **which
announce event produced this reply**, not on what the reply says.

## Suggested / applied fix

1. `dist/block-reply-pipeline-E4MUo5Qm.js` — `createBlockReplyPipeline(params)` accepts an
   optional `announceRunId`. When present, an in-memory, per-gateway-process
   `Map<announceRunId, deliveredAtMs>` (TTL 5 minutes, pruned lazily) allows at most **one**
   non-reasoning/non-commentary/non-status-notice visible reply per `announceRunId`; a second
   visible reply for the same identity is dropped and logged via `logVerbose` (not silently
   swallowed). Reasoning/commentary payloads are never gated. Runs without an `announceRunId`
   (i.e. everything that isn't a subagent-announce delivery run — normal chat turns, steered
   turns without the announce runId shape, etc.) are completely unaffected — the check is
   skipped entirely when `announceRunId` is `undefined`.

2. `dist/agent-runner.runtime-DtdxZiBX.js` — at the single call site that constructs
   `createBlockReplyPipeline` for a run, derive `announceRunId` from the run's own id:
   ```js
   const announceRunId = typeof opts?.runId === "string" && opts.runId.startsWith("announce:v1:")
     ? opts.runId
     : void 0;
   ```
   and pass it into `createBlockReplyPipeline({ ..., announceRunId })`. No new plumbing was
   needed through `subagent-announce-origin-DPSebzOW.js`, `subagent-announce-BH7YpLmx.js`, or
   `embedded-agent-DGUuxGR2.js` — the identity was already present in `opts.runId` by the time
   the pipeline is constructed; it just wasn't being read.

### Scope note

This fix covers the **confirmed, observed** mechanism: direct-dispatched announce runs (fresh
run per completed subagent, `runId` shaped `announce:v1:<childSessionKey>:<childRunId>`). It
does **not** address a hypothetical duplicate produced via the *steered* announce path (waking
an already-active main-session run via `maybeSteerSubagentAnnounce`, which injects a message
into an existing run rather than dispatching a new one) — no such duplicate was observed in this
investigation, and that path's run does not carry the `announce:v1:` runId shape. If a
steer-path duplicate is ever observed, it will need separate identity plumbing (the steer call
would need to tag its wake message/turn with the announce id explicitly, since no fresh runId is
minted for it).

## Verification

**Isolated logic test** (run directly against the patched production module,
`node /tmp/test_dedupe.mjs` importing `dist/block-reply-pipeline-E4MUo5Qm.js`):

| Scenario | Delivered count | Result |
| --- | --- | --- |
| Same `announceRunId`, two differently-worded visible texts | 1 | ✅ duplicate suppressed |
| No `announceRunId` (normal chat), two distinct visible texts | 2 | ✅ both delivered |
| Different `announceRunId` per run (separate missions) | 2 (1 each) | ✅ no cross-mission suppression |
| Same `announceRunId`, retried in a **second** pipeline instance (simulates `runAnnounceDeliveryWithRetry`) | 1 total across both instances | ✅ retry-safe (Map-based, not per-instance) |
| Reasoning payload + one visible reply, same `announceRunId` | both delivered | ✅ reasoning/commentary never gated |

**Live regression tests** (real Slack missions via `openclaw agent --session-key
agent:main:slack:channel:c0bq39ekldv --deliver`, `#main` / `C0BQ39EKLDV`):

- Mission 1 (AI coding trends → taglines): single narration message at the research→handoff
  transition — `"Research is in — now handing off to the tagline writer."` (`ts=1787108258...`
  window) — no duplicate.
- Mission 2 (houseplant facts → captions): single narration message —
  `"Research is in — handing off to the caption writer now."` — no duplicate.
- Control (normal, non-subagent, explicitly multi-part 5-fact reply from `main` directly): all
  five distinct facts delivered intact in the reply — confirms the fix does not suppress
  legitimate multi-part content from ordinary turns (this run has no `announceRunId`).

Note: in both live missions, the model happened to produce only one visible narration segment
per run (not two), so the live tests demonstrate *correct end-state behavior* but did not, by
themselves, prove the guard fired — that proof comes from the isolated logic tests above, plus
the earlier historical reproduction (before the fix) which used the *same* code path and did
produce two segments. The historical `assistantTexts` capture
(`["Research is in. Now spawning the copywriter...", "Research is in — now spawning the
copywriter.", "NO_REPLY"]`) is the one directly reproducing the bug; the fix's isolated test
replays that exact scenario against the patched pipeline and confirms suppression to 1.

## Local patch (jarvis, applied 2026-08-19)

Because `dist/` is vendored, the fix was applied directly to the installed files:

- **Patched:** `/usr/lib/node_modules/openclaw/dist/block-reply-pipeline-E4MUo5Qm.js`,
  `/usr/lib/node_modules/openclaw/dist/agent-runner.runtime-DtdxZiBX.js`
- **Backups (all touched at once, same session, even though only 2 were ultimately edited):**
  - `block-reply-pipeline-E4MUo5Qm.js.bak-dupe-fix-1787108082`
  - `agent-runner.runtime-DtdxZiBX.js.bak-dupe-fix-1787108082`
  - `subagent-announce-origin-DPSebzOW.js.bak-dupe-fix-1787108082` (backed up, **not modified**
    — investigation showed the identity was already reachable without touching this file)
  - `subagent-announce-BH7YpLmx.js.bak-dupe-fix-1787108082` (backed up, **not modified**, same
    reason)
  - `embedded-agent-DGUuxGR2.js.bak-dupe-fix-1787108082` (backed up, **not modified**, same
    reason)
- Gateway restarted via `systemctl --user restart openclaw-gateway.service` after patching;
  came up clean (`node --check` passed on both patched files before restart).

> **This patch will be overwritten by any `openclaw` npm package upgrade and must be reapplied
> until the fix lands upstream.** Verify with:
> ```
> grep -c "PATCH(announce-duplicate-reply)" \
>   /usr/lib/node_modules/openclaw/dist/block-reply-pipeline-E4MUo5Qm.js \
>   /usr/lib/node_modules/openclaw/dist/agent-runner.runtime-DtdxZiBX.js
> ```
> A result of `0` for either file after an upgrade means the fix has been overwritten.

### Overlap with the earlier NO_REPLY fix

This fix and the earlier
[`UPSTREAM_BUG_openclaw_no_reply_commentary_leak.md`](UPSTREAM_BUG_openclaw_no_reply_commentary_leak.md)
fix both touch the same vendored `openclaw` npm package (`/usr/lib/node_modules/openclaw/dist/`),
though different files within it (`channel-outbound-DkdAAOhG.js` for the NO_REPLY leak vs.
`block-reply-pipeline-E4MUo5Qm.js` + `agent-runner.runtime-DtdxZiBX.js` here). Any future
`openclaw` upgrade needs **both** patches reapplied and reverified — check both files' patch
markers after every upgrade, not just one.
