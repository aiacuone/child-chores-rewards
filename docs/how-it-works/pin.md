# How PIN hashing works

The family PIN and the emailed reset code are never stored as typed. Both are kept as salted scrypt hashes ([ADR 0007](../adr/0007-pin-and-grown-up-mode.md); docs/SPEC.md, "Grown-up mode and PIN"). All of it lives in `src/lib/server/pin.ts`. It only hashes and checks. Counting wrong tries and locking is done elsewhere (see [grown-up-mode.md](grown-up-mode.md)).

## Why scrypt, and what it does not do

- A 4-digit PIN has only 10,000 values. Anyone with a copy of the database could try them all in moments against a fast hash.
- scrypt is slow on purpose (about 50 ms per check), and each hash has its own random salt. That slows guessing from a stolen copy and stops two families with the same PIN looking alike.
- It does not protect the live app. The wrong-PIN lock does that.

## The stored format

`scrypt$<salt>$<hash>`, with the salt (16 random bytes) and hash (32 bytes) as base64url. Parameters are fixed in `PARAMS`: `N` = 2^15, `r` = 8, `p` = 1.

| Where stored | Column | Holds |
| --- | --- | --- |
| `family` | `pin_hash` | The family PIN hash. `null` until setup step 4. |
| `pin_reset` | `code_hash` | The hash of one emailed reset code. |

## The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `isPin(pin)` | `/api/grown-up/unlock`, `/api/grown-up/recovery` | True only for a string of exactly 4 digits (`0-9`). |
| `hashPin(pin)` | `setFirstPin` (`setup.ts`), `useResetCode` (`pin-reset.ts`) | Hashes a PIN. Throws if it is not 4 digits. |
| `verifyPin(pin, stored)` | `tryPin` (`grownup.ts`) | True when the PIN is well-formed and matches the hash. |
| `isResetCode(code)` | `src/routes/forgot-pin/reset/+page.server.ts` | True only for a string of exactly 6 digits. |
| `hashResetCode(code)` | `startReset` (`pin-reset.ts`) | Hashes a reset code. Throws if it is not 6 digits. |
| `verifyResetCode(code, stored)` | `useResetCode` | True when the code is well-formed and matches. |

Helpers inside the file:

- `hashSecret` makes a new salt, runs scrypt and builds the stored string. PINs and reset codes share it.
- `verifySecret` splits the stored string, runs scrypt with the same salt, and compares with `timingSafeEqual` so the time taken does not hint at how close a guess was.

## Step by step: checking a PIN

1. The route runs `isPin` on what was typed and answers 400 if it fails, before any database read.
2. `tryPin` loads `family.pin_hash` and calls `verifyPin`.
3. `verifyPin` checks the shape again, then `verifySecret` splits the stored value on `$`.
4. If it is not `scrypt` with a salt and a hash, the answer is `false`.
5. scrypt runs on the typed PIN with the stored salt, asking for the same length as the stored hash.
6. `timingSafeEqual` compares the two.

## What happens when

| Situation | What happens |
| --- | --- |
| Same PIN hashed twice | Two different strings (new salt each time). Both verify. |
| PIN is not 4 digits (for example `12a4`, `123`, Arabic-Indic digits) | `isPin` is false. `verifyPin` returns `false`. `hashPin` throws. |
| Stored value is damaged (wrong prefix such as `md5`, missing parts, plain text) | `verifySecret` returns `false`. It does not throw. |
| Family has no PIN yet (`pin_hash` is `null`) | `tryPin` answers "wrong" before `verifyPin` is called. |
| Reset code is not 6 digits | `isResetCode` is false. The reset page answers with "wrong code" and no check runs. |
| New PIN set through a reset | `useResetCode` calls `hashPin` and saves it with a new salt. The old hash is gone. |

## Security

- **Never stored or logged in plain.** Only the hash is saved. The PIN and code are not sent back to the page.
- **Shape checked on the server.** Bad input is rejected, not trimmed (see the `isPin` and `isResetCode` rules above).
- **Constant-time compare** with `timingSafeEqual`.
- **Family scoping** is not done here. Callers read the hash through the family scope (`src/lib/server/grownup.ts`, `src/lib/server/pin-reset.ts`) so one family's PIN is never checked against another's.
- **Slow by design.** Each check costs about 50 ms of server time. The wrong-PIN lock keeps that from being used to tie up the server.

## Tests

- `src/lib/server/pin.test.ts`: only 4 digits accepted, each hash is salted, and a wrong PIN or a damaged hash is refused.
- `src/lib/server/setup.test.ts`: the PIN saved at setup verifies and a different one does not.
- `src/lib/server/pin-reset.test.ts`: a reset code sets a new PIN that verifies (and the old one no longer does), and another family's PIN is untouched.
- `src/lib/server/grownup.test.ts`: the right and wrong PIN through the lock steps.

## Known gap

`isResetCode`, `hashResetCode` and `verifyResetCode` have no direct tests in `pin.test.ts`. They are only covered through `pin-reset.test.ts`.
