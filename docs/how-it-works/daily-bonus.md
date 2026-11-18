# How the daily bonus works

A child earns a bonus (+20 stars by default) once per chore day, when every stop on their trip is Done (docs/SPEC.md, "Trip, stars and bonus"; [ADR 0003](../adr/0003-data-model-for-stars.md); Child-Bonus.dc.html, Space-Child-AllDone.dc.html). All the rules are in `src/lib/server/bonus.ts`. The amount, `DAILY_BONUS`, is in `src/lib/bonus.ts` and stays fixed until Settings makes it adjustable (#31).

## The idea

- **Done means accepted by a grown-up.** A stop that is still "Grown-up checking" does not count yet ([checking.md](checking.md)).
- **Skipped, hidden and not-due chores are not on the trip**, so they never block it. A trip with no stops never earns a bonus.
- **It is one `star_event` row** of kind `bonus` ([database.md](database.md)). Its `source_id` is the chore day as a number (2026-11-17 is `20261117`), so looking for "today's row" is how the code knows the bonus was already earned.
- **It is never taken away** by anything except undoing the accept that finished the trip. A chore added later in the day leaves it alone, because children never see a loss of stars.
- **The row keeps its amount** from the day it was earned, so changing `DAILY_BONUS` later does not change past bonuses.

## The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `settleBonus(scope, child, now)` | `accept`, `moveTo` in `check.ts` | Adds today's bonus when the trip is all Done and the bonus has not been earned. Returns whether it added one. |
| `settleFamilyBonuses(scope, now)` | the chore API (`PUT` and `DELETE` on `/api/grown-up/chores/<id>`) | `settleBonus` for every child in the family. |
| `undoBonus(scope, child, now)` | `undoAccept` in `check.ts` | Deletes today's bonus row if the trip is no longer all Done. Returns whether it deleted one. |
| `bonusToday(scope, child, now)` | `/trip/<child>/bonus` | Today's bonus as `{ stars }`, or `null`. |
| `bonusSource(day)` | this file | Turns `"2026-11-17"` into `20261117`. |

Helpers inside the file:

- `bonusRow` finds the child's `bonus` row for one chore day, in this family only.
- `tripDone` is true when the child has at least one stop today and every stop's state is `done` (from `tripStops`, [trip.md](trip.md)).

## When the bonus is settled

| Moment | Call | Why |
| --- | --- | --- |
| A grown-up accepts a chore | `settleBonus` for that child | It may be the last stop. It runs inside `accept`'s transaction, so the chore's stars and the bonus are saved together or not at all. |
| "That wasn't Mia" gives a chore to a child who has their own copy | `settleBonus` for that child | Their copy turns Done, which may finish their trip. |
| A grown-up edits a chore | `settleFamilyBonuses` | Unassigning a child, or changing the repeat so it is not due today, can leave the trip all Done. |
| A grown-up removes a chore | `settleFamilyBonuses` | The same, by removing the last open stop. |
| A grown-up undoes an accept | `undoBonus` for that child | If that accept had finished the trip, the bonus goes with it. |

## Steps

`settleBonus`:

1. Work out the chore day with `choreDay(now)` ([repeats.md](repeats.md)).
2. If today's bonus row exists, stop: it was already earned.
3. If the trip is not all Done (`tripDone`), stop.
4. Add the row with `addStars` (kind `bonus`, amount `DAILY_BONUS`, source: today's number).

`undoBonus`:

1. Find today's bonus row. If there is none, stop.
2. If the trip is still all Done, stop. The accept that was undone had not finished it, so the bonus stands.
3. Delete that one row by its id.

## What happens when

| Situation | What happens |
| --- | --- |
| The last stop is accepted twice (a double tap) | `accept` refuses the second answer, and `settleBonus` would find the row anyway. One bonus. |
| A chore is added after the bonus was earned | Nothing. The trip is no longer all Done, but the bonus stays. |
| The last accept is undone within the minute | The chore's stars and the bonus both go, and the chore waits for a check again. This is a correction, not a penalty: the star history shows only what stands. |
| An earlier accept is undone after a later chore was added | The trip is not all Done, so `undoBonus` removes the bonus, even if the undone chore was not the last one. |
| A chore is moved with "That wasn't Mia" to a child with no copy | They get the chore's stars only. Their trip is unchanged, so `settleBonus` is not called for them. |
| The next chore day | A new day has a new source number, so a new bonus can be earned. Yesterday's row is untouched. |
| Two families finish trips at once | Every query goes through `scope.where`, so each family only reads and writes its own rows. |

## Security and safety

- **No route adds a bonus directly.** It is only added by the server, as a result of a grown-up's accept or a chore edit, so there is nothing for a child or another family to send.
- **Family scope:** `bonusRow` and every star write go through `scope`, and `tripStops` reads only this family's chores. A test checks that settling for a child from another family does nothing.
- **Once per day relies on check-then-insert.** There is no unique index on bonus rows. This is safe because `better-sqlite3` is synchronous and the checks and the insert run with no `await` between them, so two requests in one process cannot interleave. If the app ever ran in several processes, a unique index would be needed.

## Known gaps

- **Skip and hide** change what is on the trip, so `applyChoreAction` calls `settleFamilyBonuses`, as the chore edit does ([skip-hide.md](skip-hide.md)). Removing a child (#32) must do the same.
- **Undo across 6:00 am:** `undoBonus` looks for the bonus of the chore day at the moment of the undo. An accept at 5:59 am undone at 6:00 am, for a chore not due that day, would remove the accept's stars but leave the earlier day's bonus. The reset would normally have put a due chore back to Pending first, which makes the undo refuse. It is a one-minute window and is left as it is.

## Tests

- `src/lib/server/bonus.test.ts`: the bonus once on the last accept, waiting stops not counting, a skipped chore not blocking, undo taking it back, a chore added later leaving it, removing the last open chore earning it, "That wasn't Mia" earning it for the right child, a new bonus on the next day, and another family's children.
- `src/lib/server/check.test.ts`: the accept and undo totals include the bonus for a one-stop trip.
- `e2e/bonus.test.ts`: the bonus planet before and after finishing every stop, and the star total.
