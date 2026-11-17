# How the recovery email works

The recovery email is where PIN reset codes go (docs/SPEC.md, "Grown-up mode and PIN"). A new address is only used once someone opens the confirm link sent to it and presses Confirm. All the rules are in `src/lib/server/recovery-email.ts`. The pages only call it.

## The flow

1. **Setup step 3** (`src/routes/setup/email/+page.server.ts`) checks the address, then calls `startVerification`. That returns a token.
2. The page puts the token in a link, `https://…/verify-email?token=…`, and emails it with `sendEmail` (`src/lib/server/email.ts`). If the email fails, `dropLink` removes the link again.
3. **Opening the link** (`src/routes/verify-email/+page.server.ts`) calls `linkEmail`, which only reads. The page shows the address partly hidden, with a Confirm button.
4. **Pressing Confirm** calls `confirmLink`, which saves the address in `family.recovery_email`.

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
| `startVerification(scope, email)` | Setup step 3 | Checks the hourly limit, cancels open links, saves a new row with the token's hash and expiry, and returns the token and the row id. Throws `TooManyEmails` over the limit. |
| `dropLink(scope, id)` | Setup step 3 | Deletes a link whose email failed to send, so it neither works nor counts as sent. Only reaches the family's own rows. |
| `linkEmail(db, token)` | Confirm page, on open | Returns the address the link would confirm, or `null` if the link is unknown, malformed, used or expired. |
| `confirmLink(db, token)` | Confirm page, on Confirm | In one transaction: checks the link still works, saves its address as the family's recovery email, and closes the family's open links. Returns `true` or `false`. |
| `linkSent(scope)` | `setupStep` in `setup.ts` | True once the family has a sent link, which means setup step 3 is done. |

Helpers inside the file:

- `hashToken` makes the SHA-256 hash of a token.
- `isToken` refuses anything that is not exactly the shape of a real token (43 URL-safe characters) before the database is read.
- `openLink` finds a link by its hash and returns it only if it is unused and unexpired.
- `cancelOpenLinks` marks a family's open links as used.

## Why some functions take `db` and others a family scope

- `startVerification`, `dropLink` and `linkSent` run for a signed-in grown-up, so they take the family scope from `forFamily` and only reach that family's rows.
- `linkEmail` and `confirmLink` run on the confirm page, where nobody may be signed in. They take the database, and the token itself identifies the link and, through it, the family.

## Tests

`src/lib/server/recovery-email.test.ts` checks each rule above, including that one family's link never confirms, drops or changes another family's recovery email.
