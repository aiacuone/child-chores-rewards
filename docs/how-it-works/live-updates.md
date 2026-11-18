# How live updates work

When something changes on one device, the other devices' screens catch up within a few seconds, without anyone reloading ([ADR 0006](../adr/0006-live-updates-between-devices.md): polling; docs/SPEC.md, "Checking, undo and send back"). For example, Mia taps "I did it!" on the tablet, and her trip on the grown-up's phone shows "Grown-up checking".

The signal is one number per family, `family.version`.

| Part | File | Job |
| --- | --- | --- |
| The counter | `drizzle/0010_live_version.sql` | Database triggers add 1 to `family.version` on every change. |
| Reading it | `src/lib/server/live.ts` | `familyVersion(scope)`: the signed-in family's current number. |
| Asking for it | `src/routes/api/changes/+server.ts` | `GET /api/changes` returns `{ "version": 58 }`. |
| Watching it | `src/lib/components/LiveUpdates.svelte` | Asks every few seconds and reloads the page's data when the number has moved. |

## The counter

`family.version` starts at 0. Triggers add 1 after every insert, update or delete on these tables, for the family of the row that changed:

- `child`
- `chore`
- `chore_copy` (statuses: "I did it!", Undo, the daily reset, and accepting from #24)
- `star_event`

Because the database does it, no code has to remember to. A new feature that writes to these tables gets live updates for free. A new table that screens show needs its own three triggers, in a new hand-written migration.

The number means nothing on its own. Only "has it moved since I loaded?" matters.

## The pages

| Page | Where the version comes from |
| --- | --- |
| Who's flying (`/`) | `src/routes/+page.server.ts` |
| Every trip page (`/trip/<child>/…`) | `src/routes/trip/[childId]/+layout.server.ts` |
| Mission control, Chores, a check | their API's answer (`/api/grown-up/home`, `/checks`, `/checks/<copy>`) |

Each returns `version` with the page's data, and its `.svelte` file renders `<LiveUpdates version={data.version} />`.

## Step by step

1. **The page loads.** The server reads the version first, then the rest of the data. If something changes while the page is loading, the page carries the older number, so the next check catches it.
2. **Every 4 seconds** (`EVERY`), `LiveUpdates` fetches `/api/changes` with `cache: 'no-store'`.
3. **Same number:** nothing happens.
4. **Different number:** it calls `invalidateAll()`. SvelteKit reruns the page's `load` functions and redraws, without a full page reload. The new data carries the new number.
5. **Coming back into view:** a `visibilitychange` listener checks at once when the app is shown again, such as when the tablet wakes.

## What happens when

| Situation | What happens |
| --- | --- |
| The app is in the background | Checks are skipped (`document.hidden`) and nothing is fetched. |
| A check is still running when the next is due | The next one is skipped (`busy`), so checks never pile up. |
| The network drops for a moment | The error is ignored, and the next check tries again. |
| The device is signed out | `/api/changes` answers 401 (hooks), the check does nothing, and the next navigation goes to sign-in. |
| A change happens in another family | Only that family's number moves, so this family's screens never reload for it. |
| The page leaves | The timer and listener are removed. |

## Cost

One check is one read of one row by its primary key, with a few bytes back. A tablet left open sends about 900 an hour, which is very little for the shared VM. ADR 0006 asked for a cheap "last changed" value for this reason.

Moving to server-sent events later would only change step 2 ("tell" instead of "ask"). The counter and the reload stay the same.

## Security

- `/api/changes` needs a signed-in device. The family comes from the session (`locals.user.familyId`), never from the request.
- It returns only the number: no names, chores or stars. The page's own `load` functions still decide what to show, with all their family checks.

## Grown-up screens

Grown-up pages load their data in the browser through `grownupFetch`, not through `load`, so `invalidateAll()` would not refresh them. Mission control, the Chores tab and the check screen take `version` from their API's answer and pass `onchange={load}`, their own reload ([checking.md](checking.md)).

## Tests

- `src/lib/server/trip.test.ts` ("live updates"): adding a chore and "I did it!" each move the family's version, and the other family's stays the same.
- `e2e/i-did-it.test.ts`: a second device watching Mia's trip shows "Grown-up checking" after "I did it!", and goes back after Undo, within 10 seconds and without a reload.
