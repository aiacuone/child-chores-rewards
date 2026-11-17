# How grown-up mode works

Grown-up mode is what the PIN opens: checking chores, handing out rewards and changing settings ([ADR 0007](../adr/0007-pin-and-grown-up-mode.md)). It has two halves:

| Half | File | Job |
| --- | --- | --- |
| Page | `src/lib/grownup.svelte.ts` | Holds the grown-up token in memory, reports touches, locks. |
| Server | `src/lib/server/grownup.ts` | Checks the PIN, counts wrong PINs, checks and ends tokens. |

## The grown-up token, start to finish

The grown-up token is what proves "the PIN was typed on this device a moment ago". Every grown-up API route asks for it.

### Its life

| Step | Page (`src/lib/grownup.svelte.ts`) | Server (`src/lib/server/grownup.ts`) |
| --- | --- | --- |
| 1. Right PIN | `unlockWithPin` posts the PIN. | `unlock` makes 32 random bytes (43 characters as base64url), saves only their SHA-256 hash in `grownup_token`, and sends the token back once. |
| 2. Kept | Stores it in `state.token`, in memory only. | Keeps the hash, the family, this device's session and an expiry 2 min 45 s away. |
| 3. Used | `grownupFetch` adds it to each request in the `x-grown-up` header. | `requireGrownUp` hashes the header and looks for a matching row: same family, same session, not expired. If found, the expiry moves to 2 min 45 s from now. If not, 401. |
| 4. Kept alive | `touch` posts to `/api/grown-up/touch` at most every 30 seconds while the screen is used. | The touch route only calls `requireGrownUp`, which pushes the expiry back. |
| 5. Ended | `lock` forgets the token and posts it to `/api/grown-up/lock`. | `endToken` deletes the row, so the token stops working at once. |
| 5. Or runs out | The bar locks the page at 2 minutes without a touch. | With no requests, the row expires 45 seconds later and is refused from then on. |

### The `grownup_token` row

| Column | Holds |
| --- | --- |
| `id` | The SHA-256 hash of the token. The token itself is never stored. |
| `family_id` | The family it opens. Deleting the family deletes the row. |
| `session_id` | The hashed id of the device's sign-in. Signing the device out deletes the row. |
| `expires_at` | When it stops working, unless it is used before then. |

### Example

| Time | What happens | Server expiry |
| --- | --- | --- |
| 0:00 | Right PIN. Token made. | 2:45 |
| 0:20 | Grown-up opens Chores (`grownupFetch`). | 3:05 |
| 0:50 | A tap, 30 s since the last report: touch sent. | 3:35 |
| 2:50 | No touch for 2 minutes: the page locks and tells the server. | Row deleted |
| | If the lock post never arrived (for example the network dropped), nothing more is sent. | Refused from 3:35 |

### Why it is built this way

| Choice | Protects against |
| --- | --- |
| Kept in page memory, not a cookie or storage | A child reopening the app, refreshing or opening a new tab gets the PIN pad, not grown-up mode. |
| Sent in a header, not a cookie | Another website cannot make the browser send it, because browsers add cookies to requests by themselves but never a custom header. |
| Only the hash stored | A copy of the database has no working tokens in it. |
| Tied to the family and the session | A token copied to another device or another family's account does not work. |
| Shape checked first (`isToken`) | Anything that is not 43 URL-safe characters is refused before the database is read. |
| Check and extend in one update (`useToken`) | A token cannot pass the check and then expire before its expiry is pushed back. |
| 45 s of grace | The page reports touches only every 30 s, so a grown-up who is still tapping is never refused just before their page would have reported it. |

Expired rows are not cleaned up yet. They stop working, and they are deleted when their device signs out.

## The token lives only in page memory

When the right PIN is entered, the server makes a random token and sends it to the page. The page keeps it in one variable inside `src/lib/grownup.svelte.ts`, never in a cookie, local storage or session storage. The server keeps only a hash of it.

- **A refresh, a closed app or a new tab** loses the variable, so the PIN is asked again. That is how "closing the app always locks it" works.
- **Moving between grown-up pages** keeps it, because the app does not reload.
- **Grown-up pages are never drawn by the server.** `src/routes/grown-up/+layout.ts` sets `ssr = false`, so the server never renders a grown-up page or touches this state.

## What is in `src/lib/grownup.svelte.ts`

The state is one `$state` object, so pages update when it changes:

| Field | Meaning |
| --- | --- |
| `token` | The grown-up token, or `null` when locked. |
| `lastTouch` | When the screen was last touched in grown-up mode. The bar's "locks in" time counts from here. |
| `justLocked` | True right after grown-up mode locked, so Who's flying can show "Grown-up mode is locked" once. |

Pages read it through `grownup` (read-only getters), and change it only through these functions:

| Function | Used by | What it does |
| --- | --- | --- |
| `unlockWithPin(pin)` | the PIN pad | Posts the PIN to `/api/grown-up/unlock`. On `ok` it stores the token and starts the clock. Returns `ok`, `wrong`, or `locked` with the time the pad opens again. |
| `padLockedUntil()` | the PIN pad, when it opens | Asks `/api/grown-up/pad` whether the family's pad is locked, so every device shows the countdown. |
| `grownupFetch(url)` | grown-up pages (later items) | A `fetch` that adds the token in the `x-grown-up` header. If the server answers 401, it locks. |
| `touch(report)` | the grown-up bar | Records a touch. Tells the server at most every 30 seconds, or at once when `report` is true ("Keep going"). |
| `lock()` | Lock, Lock now, time running out, leaving grown-up pages | Forgets the token, tells the server to end it, and (unless told not to) goes to Who's flying with "Grown-up mode is locked". |

## Locking

- **The bar** (`src/lib/components/GrownupBar.svelte`) ticks every quarter second. "Locks in" is 2 minutes after `lastTouch`.
- Any touch, key or scroll calls `touch()`, except in the last 10 seconds. Then "Locking soon" shows, and only "Keep going" counts.
- At 0 the bar calls `lock()`.
- **Leaving the grown-up pages** (for example Back to Who's flying) also calls `lock()`, from `src/routes/grown-up/+layout.svelte`. A child handed the device then cannot tap "I'm a grown-up" and walk straight back in.
- The times are in `src/lib/grownup-times.ts`, shared by the page and the server. Settings will make the 2 minutes adjustable (#31).

## What is in `src/lib/server/grownup.ts`

### Settings

| Name | Value | Meaning |
| --- | --- | --- |
| `FAILS_BEFORE_LOCK` | 5 | Wrong PINs in a row before the first lock. |
| `LOCK_STEPS` | 30 s, 1 min, 5 min, 15 min | How long each lock in a run lasts. The last one repeats. |
| `GRACE` | 45 s | Extra time a token lives on the server after `AUTO_LOCK`, because the page reports touches only every 30 seconds. |
| `GROWNUP_HEADER` | `x-grown-up` | The header a grown-up request carries its token in. |

`AUTO_LOCK` (2 minutes) comes from `src/lib/grownup-times.ts`, shared with the page.

### The wrong-PIN count

Three columns on `family` hold it, for the whole family rather than per device, so a second device does not get fresh tries:

| Column | Meaning |
| --- | --- |
| `pin_fails` | Wrong PINs in a row before the first lock. |
| `pin_lock_stage` | How many locks in this run: 1 is 30 s, 2 is 1 min, 3 is 5 min, 4 is 15 min. 0 means not locked yet. |
| `pin_locked_until` | The pad is locked until this time. |

`unlock(scope, sessionId, pin)` runs in one transaction, so two devices typing at once cannot both get a try in:

1. **The pad is locked:** it answers `locked` with the time it opens again. The PIN is not checked at all.
2. **The PIN is right:** all three columns reset, a new token is made, and its hash is saved in `grownup_token` with the family, the device's session and an expiry of `AUTO_LOCK + GRACE`. It answers `ok` with the token.
3. **The PIN is wrong, and the pad has not locked yet in this run:** `pin_fails` goes up by one. On the 5th, stage 1 starts: locked for 30 seconds.
4. **The PIN is wrong, after a lock in this run:** the stage goes up by one (stopping at 4), and the pad locks at once for that stage's time.

It answers `wrong` (steps 3 before the 5th) or `locked` with the time. `firstLock` is true only when stage 1 starts, which is when the unlock route sends the "PIN pad locked" alert to every grown-up. So the alert goes once per run of wrong tries, and again only after the right PIN has reset the run.

Example run:

| Try | Result |
| --- | --- |
| Wrong 1 to 4 | "Wrong PIN, try again." |
| Wrong 5 | Locked 30 s, alert sent |
| Wrong 6 (after the 30 s) | Locked 1 min |
| Wrong 7 | Locked 5 min |
| Wrong 8 and after | Locked 15 min each time |
| Right PIN (once unlocked) | Grown-up mode opens, count back to 0 |

### The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `unlock(scope, sessionId, pin)` | `/api/grown-up/unlock` | The steps above. |
| `padLockedUntil(scope)` | `/api/grown-up/pad` | When the family's pad opens again, or `null`. |
| `useToken(scope, sessionId, token)` | `requireGrownUp` | True when the token is known, unexpired, from this family and from this device's session. It also pushes the expiry back, so using grown-up mode keeps it open. Done in one update, so a token cannot be checked and then expire before it is extended. |
| `endToken(scope, token)` | `/api/grown-up/lock` | Deletes the token's row, for this family only. |
| `requireGrownUp(event, scope)` | every grown-up API route | Reads the token from the `x-grown-up` header and calls `useToken`. Answers 401 when it fails, and the page then locks. |

Helpers inside the file:

- `hashToken` makes the SHA-256 hash of a token. Only the hash is stored.
- `isToken` refuses anything that is not exactly the shape of a real token (43 URL-safe characters) before the database is read.
- `pinState` reads the family's PIN hash and the three count columns.

### Why a token is tied to the device's session

`locals.sessionId` (set in `hooks.server.ts`) is the hashed id of the device's sign-in. Tying the token to it means:

- a token copied to another device does not work there, even in the same family,
- signing a device out deletes its tokens, because `grownup_token.session_id` cascades from `session`.

## The API routes

| Route | Answers |
| --- | --- |
| `GET /api/grown-up/pad` | `{ lockedUntil }` for the family's pad. |
| `POST /api/grown-up/unlock` | `{ result: 'ok', token }`, `{ result: 'wrong' }` or `{ result: 'locked', until }`. 400 for anything that is not 4 digits. |
| `POST /api/grown-up/touch` | 204, or 401 when the token no longer works. |
| `POST /api/grown-up/lock` | 204. The token stops working. |

All of them need the device to be signed in (`hooks.server.ts`).

## Tests

- `src/lib/server/grownup.test.ts`: the lockout steps, per-family counting, the reset, the alert on each new run, and tokens refused for another device, another family, after expiry, after locking and after signing out.
- `e2e/grownup.test.ts`: the PIN pad, the wrong and locked screens, the alert, Lock, leaving, the 2-minute lock with its warning, and the API refusing bad tokens.
