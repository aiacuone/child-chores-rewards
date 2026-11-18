# How Forgot PIN works

A grown-up who has forgotten the PIN asks for a one-time code by email, then types the code and a new PIN (docs/SPEC.md, "Grown-up mode and PIN"; [ADR 0007](../adr/0007-pin-and-grown-up-mode.md); [ADR 0008](../adr/0008-email-for-pin-reset-and-invites.md)). The pages are `src/routes/forgot-pin/+page.server.ts` (ask for a code) and `src/routes/forgot-pin/reset/+page.server.ts` (use it). The rules are in `src/lib/server/pin-reset.ts`. Where the address comes from is in [recovery-email.md](recovery-email.md).

## The pages

| Route | Screen | What it shows |
| --- | --- | --- |
| `/forgot-pin` | PIN-Forgot | The partly hidden recovery address (`maskEmail`) and a Send code button. With no confirmed address, a message instead. |
| `/forgot-pin/reset` | PIN-Reset, PIN-Reset-Wrong | Fields for the 6-digit code and the new PIN. A wrong code shows the "wrong" message. |
| `/forgot-pin/reset` | PIN-Reset-Expired | Shown when the newest code was cancelled or ran out (`cancelled` from `load`). |

Both sit under `src/routes/forgot-pin/+layout.svelte`, outside grown-up mode. They need a signed-in device (the hook sends anyone else to `/login`) but not the PIN, so they work while the pad is locked. Both set `cache-control: no-store`.

## The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `resetTarget(scope)` | both `/forgot-pin` handlers | Returns `{ hasPin, email }`. |
| `startReset(scope)` | `/forgot-pin` action | Checks the hourly limit, cancels open codes, saves a new row with the code's hash and expiry, returns the code and row id. Throws `TooManyCodes` over `CODES_PER_HOUR`. |
| `dropCode(scope, id)` | `/forgot-pin` action | Deletes a code whose email failed, so it does not count as sent. |
| `resetState(scope)` | `/forgot-pin/reset` load | `'none'`, `'open'` or `'cancelled'`, from the newest code. |
| `useResetCode(scope, code, newPin)` | `/forgot-pin/reset` action | Returns `'ok'`, `'wrong'` or `'cancelled'`. |

Helpers: `newestCode` finds the family's latest row. `isOpen` is true if it is unused, not cancelled and not expired.

## Step by step: asking for a code

1. `load` redirects to `/` if the family has no PIN. Otherwise it returns the masked address, or `null`.
2. The action repeats the no-PIN check, then returns 400 if there is no confirmed address.
3. `startReset` makes the code. Over the hourly limit the action returns 429.
4. `sendEmail` sends the code. If it fails with `EmailNotSent`, `dropCode` removes the row and the action returns 502.
5. `sendSafetyAlert` tells every grown-up ("PIN reset code sent", no address), then the action redirects to `/forgot-pin/reset`.

## Step by step: using the code

1. `load` redirects to `/forgot-pin` when `resetState` is `none`.
2. The action checks the new PIN first (`parsePin`), so a typing slip does not use up a try.
3. `isResetCode` refuses anything but 6 digits, shown as the wrong-code message and not counted.
4. `useResetCode` runs in one transaction on the family's newest code:
   - Not open: `'cancelled'`.
   - Wrong code: adds to `wrong_tries`. The fifth cancels the code.
   - Right code: marks it used, saves the new PIN hash, clears the pad's lock (`pinFails`, `pinLockStage`, `pinLockedUntil`), and deletes the family's grown-up tokens.
5. `ok` redirects to `/grown-up`. `cancelled` redirects back to `/forgot-pin/reset`, which then shows PIN-Reset-Expired.

## What happens when

| Situation | What happens |
| --- | --- |
| No PIN set yet | Both pages redirect away. |
| No confirmed recovery email | A message. Nothing is sent. |
| 6th code in an hour | "Too many emails" (429). |
| Email fails to send | "Didn't send" (502). The code is removed. |
| Code older than 15 minutes | Cancelled, shows PIN-Reset-Expired. |
| 5 wrong codes, even if the right one follows | Cancelled. |
| A newer code is sent | The older one is cancelled. |
| Code already used | `resetState` is `none`, so the page redirects. |

## Security

- Every query uses `forFamily`, so one family cannot read or use another's codes.
- The code is random (`randomInt`), stored only as a salted hash ([pin.md](pin.md)), and never sent back to the page.
- The PIN is never emailed. The alert carries no address.
- Guessing is limited three ways: 5 tries, 15 minutes, 5 codes an hour.
- Ending every grown-up token means a device left unlocked under the old PIN must enter the new one.

## Tests

- `src/lib/server/pin-reset.test.ts`: code shape and hash, one use, lock cleared, other family untouched, fifth wrong try, expiry, replacement, hourly limit, address.
- `e2e/forgot-pin.test.ts`: the full reset, five wrong codes then a new one, and the routes' refusals.
