# Upstream bug: `NO_REPLY` silent-reply token leaks into Slack progress commentary

**Product:** OpenClaw
**Version observed:** `2026.7.1-2 (0790d9f)`
**Severity:** Medium — internal control token is shown to end users in chat
**Status:** Reproduced live; local stopgap patch applied (see "Local patch" below)

---

## Summary

The streaming **progress-commentary** delivery path suppresses the silent-reply token
`NO_REPLY` using an **exact-match** regex. When the model emits the token *glued directly to
visible text* (no separating whitespace), the exact match fails and the raw token is delivered
verbatim to the user.

Observed live in Slack:

```
NO_REPLYSeo-research is back with the SERP analysis.
```

The final-delivery paths handle this case correctly. Only the commentary/progress path is
affected — which is why the final message looks clean and only the interim update leaks.

## Affected code

**File:** `dist/channel-outbound-*.js` (source: `src/plugin-sdk/channel-outbound.ts`)

```js
function normalizeCommentaryProgressText(text) {
	const cleaned = stripInlineDirectiveTagsForDelivery(text).text.trim();
	if (!cleaned || isSilentCommentaryProgressText(cleaned)) return "";
	return cleaned.split(/\r?\n/u).map(...).join("\n");
}

function isSilentCommentaryProgressText(text) {
	const normalized = text.replace(/^[\s*_`~]+|[\s*_`~]+$/gu, "").trim();
	return /^NO_REPLY$/iu.test(normalized);   // <-- exact match only
}
```

`/^NO_REPLY$/iu` matches only a token-only string. It does not match
`"NO_REPLYSeo-research is back…"`, so the text falls through and is rendered and sent.

## Why this is inconsistent with the rest of the codebase

`src/auto-reply/tokens.ts` already provides the correct helpers for exactly this case:

```js
const SILENT_LEADING_ATTACHED_RE = /^\s*(?:NO_REPLY\s+)*NO_REPLY(?=[\p{L}\p{N}])/iu;
const SILENT_LEADING_RE          = /^(?:\s*NO_REPLY)+\s*/i;

startsWithSilentToken(text)     // detects a token glued to visible content
stripLeadingSilentToken(text)   // removes it
```

The doc comment on `stripLeadingSilentToken` explicitly names this scenario:

> Handles cases like `"NO_REPLYThe user is saying..."` where the token is not separated from
> the following text.

These helpers are already used by the final-delivery paths — `run-delivery.runtime`
(`normalizeSilentReplyText`) and `subagent-announce` (`stripAndClassifyReply`) — both of which
call `startsWithSilentToken` / `stripLeadingSilentToken`. The commentary path simply does not.

Verified directly against the shipped module:

```
startsWithSilentToken("NO_REPLYSeo-research is back with the SERP analysis.")  -> true
stripLeadingSilentToken(...)  -> "Seo-research is back with the SERP analysis."
isSilentReplyPayloadText(...) -> false
```

So the helper layer is correct; only this one call-site is missing the call.

## Suggested upstream fix

Apply the same normalization the final-delivery paths use, in
`normalizeCommentaryProgressText`:

```js
import { s as startsWithSilentToken, c as stripLeadingSilentToken } from "./tokens.js";

function normalizeCommentaryProgressText(text) {
	let cleaned = stripInlineDirectiveTagsForDelivery(text).text.trim();
	if (startsWithSilentToken(cleaned, SILENT_REPLY_TOKEN)) {
		cleaned = stripLeadingSilentToken(cleaned, SILENT_REPLY_TOKEN);
	}
	if (!cleaned || isSilentCommentaryProgressText(cleaned)) return "";
	return cleaned.split(/\r?\n/u).map(...).join("\n");
}
```

## Test cases

| Input | Expected output |
| --- | --- |
| `NO_REPLYSeo-research is back with the SERP analysis.` | `Seo-research is back with the SERP analysis.` |
| `NO_REPLY` | *(suppressed — empty)* |
| `*NO_REPLY*` | *(suppressed — empty)* |
| `NO_REPLY NO_REPLYActually here is the result` | `Actually here is the result` |
| `Searching the web for trends` | unchanged |
| `The agent replied NO_REPLY to that` | unchanged (must **not** be mangled) |

All six pass with the fix and the last two confirm no regression for legitimate text that
merely mentions the token.

## Local patch (jarvis, applied 2026-08-19)

Because `dist/` is vendored, the fix was applied directly to the installed file as a stopgap:

- **Patched:** `/usr/lib/node_modules/openclaw/dist/channel-outbound-DkdAAOhG.js`
- **Backup:** `/usr/lib/node_modules/openclaw/dist/channel-outbound-DkdAAOhG.js.bak-noreply-fix`
- Adds `stripLeadingSilentCommentaryToken()` (inlining the two regexes from `tokens.ts`, since
  this module does not currently import them) and calls it inside
  `normalizeCommentaryProgressText`.

> **This patch will be overwritten by any `openclaw` npm upgrade and must be reapplied until
> the fix lands upstream.** Verify with:
> ```
> grep -c stripLeadingSilentCommentaryToken \
>   /usr/lib/node_modules/openclaw/dist/channel-outbound-*.js
> ```
> A result of `0` after an upgrade means the leak has returned.
