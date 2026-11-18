# How the recovery email works

The recovery email is where PIN reset codes go (docs/SPEC.md, "Grown-up mode and PIN"). A new address is only used once someone opens the confirm link sent to it and presses Confirm. All the rules are in `src/lib/server/recovery-email.ts`. The pages only call it.

## The flow

1. **Setup step 3** (`src/routes/setup/email/+page.server.ts`) or **Settings** (`POST /api/grown-up/recovery`) checks the address and calls `sendConfirmLink` (`src/lib/server/recovery-send.ts`). Settings also needs the PIN again, and wrong tries count towards the pad's lock (`checkPin`).
2. `sendConfirmLink` calls `startVerification` for a token, puts it in a link, `https://…/verify-email?token=…`, and emails it with `sendEmail` (`src/lib/server/email.ts`). If the email fails, `dropLink` removes the link again.
3. **Opening the link** (`src/routes/verify-email/+page.server.ts`) calls `linkEmail`, which only reads. The page shows the address partly hidden, with a Confirm button.
4. **Pressing Confirm** calls `confirmLink`, which saves the address in `family.recovery_email`. The old address stays in use until this moment. If it replaced a different address, every grown-up gets the "Recovery email changed" alert. The first address does not count as a change.

The confirm page works without signing in, because the link is often opened on another device. Having the token proves the email reached that inbox.

## The rules

| Rule | How |
| --- | --- |
| The token is never stored | Only its SHA-256 hash is saved, in `email_verification.token_hash`. A copy of the database cannot be turned back into working links. |
| A link works once | Confirming sets `used_at`. |
| A link works for 24 hours | `expires_at` is set from `LINK_LIFETIME`. |
| Only the newest link works | A new link, or a confirmed one, sets `used_at` on the family's other open links (`cancelOpenLinks`). |
| At most 5 links an hour per family | `startVerification` counts the family's rows from the last hour (`SENDS_PER_HOUR`), so nobody can use the app's Gmail to send spam. |
| Opening the link changes nothing | Only the Confirm button does. Email scanners that open links cannot confirm an address by themselves. |

## The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `startVerification(scope, email)` | `sendConfirmLink` | Checks the hourly limit, cancels open links, saves a new row with the token's hash and expiry, and returns the token and the row id. Throws `TooManyEmails` over the limit. |
| `dropLink(scope, id)` | `sendConfirmLink` | Deletes a link whose email failed to send, so it neither works nor counts as sent. Only reaches the family's own rows. |
| `linkEmail(db, token)` | Confirm page, on open | Returns the address the link would confirm, or `null` if the link is unknown, malformed, used or expired. |
| `confirmLink(db, token)` | Confirm page, on Confirm | In one transaction: checks the link still works, saves its address as the family's recovery email, and closes the family's open links. Returns `{ familyId, changed }`, or `null` when the link no longer works. |
| `recoveryEmail(scope)` | Settings | The family's confirmed address, or `null`. |
| `linkSent(scope)` | `setupStep` in `setup.ts` | True once the family has a sent link, which means setup step 3 is done. |

Helpers inside the file:

- `hashToken` makes the SHA-256 hash of a token.
- `isToken` refuses anything that is not exactly the shape of a real token (43 URL-safe characters) before the database is read.
- `openLink` finds a link by its hash and returns it only if it is unused and unexpired.
- `cancelOpenLinks` marks a family's open links as used.

## Why some functions take `db` and others a family scope

- `startVerification`, `dropLink` and `linkSent` run for a signed-in grown-up, so they take the family scope from `forFamily` and only reach that family's rows.
- `linkEmail` and `confirmLink` run on the confirm page, where nobody may be signed in. They take the database, and the token itself identifies the link and, through it, the family.

## Forgot PIN

The confirmed address is where a PIN reset code goes (screens PIN-Forgot, PIN-Reset, PIN-Reset-Wrong, PIN-Reset-Expired; ADR 0007, ADR 0008). The rules are in `src/lib/server/pin-reset.ts`, and the pages are `/forgot-pin` and `/forgot-pin/reset` (step by step in [forgot-pin.md](forgot-pin.md)). They need a signed-in device but not the PIN, so they still work while the pad is locked.

| Rule | How |
| --- | --- |
| The PIN is never emailed | Only a one-time 6-digit code is. |
| The code is never stored | `pin_reset.code_hash` holds a salted scrypt hash. |
| 5 wrong tries cancel it | `useResetCode` counts them in `wrong_tries`. |
| It lasts 15 minutes | `CODE_LIFETIME`. |
| A newer code replaces it | `startReset` cancels open codes. |
| 5 codes an hour per family | `CODES_PER_HOUR`. A code whose email failed is removed and does not count. |
| Every grown-up is told | The "PIN reset code sent" alert, with no address. |
| The new PIN ends old sessions | The right code clears the pad's lock and deletes the family's grown-up tokens. |

The new PIN is checked before the code, so a typing slip there does not use up a try. A family with no confirmed address sees a message instead of Send code, and cannot reset the PIN until it confirms one.

## Tests

`src/lib/server/recovery-email.test.ts` checks the link rules, including that one family's link never confirms, drops or changes another family's recovery email. `src/lib/server/pin-reset.test.ts` checks the code rules and other families. `e2e/forgot-pin.test.ts` covers changing the address, the reset, the cancelled code and the refusals.
