# How a child's trip works

A child's trip is the path of today's chores, from the home planet to the bonus planet (docs/SPEC.md, "Trip, stars and bonus"; Space-Child.dc.html). It has two halves:

| Half | File | Job |
| --- | --- | --- |
| Rules | `src/lib/server/trip.ts` | Which stops are on the trip, in what order, which can open, and what is coming up. |
| Layout | `src/lib/trip-path.ts` | Where each stop, the rocket and the path go on the screen. |

## The pages

| Page | Screen | Shows |
| --- | --- | --- |
| `/trip/<child>` | Space-Child, Space-Child-Open, Space-Child-Waiting, Space-Child-Empty | The path, the count and the Coming up button, or "Nothing to do today!" |
| `/trip/<child>/stop/<chore>` | Stop | One unfinished stop: picture, name, stars, repeat, expectations and "I did it!". |
| `/trip/<child>/stop/<chore>/confirm` | Confirm-Who | "Are you Mia?" before the stop is sent. |
| `/trip/<child>/coming-up` | Child-Coming | Chores due on the next 6 days instead of today. |
| `/trip/<child>/bonus` | Child-Bonus, Space-Child-AllDone | "Finish the whole trip" with a progress bar, or "Trip complete!" once the bonus is earned. |

`src/routes/trip/[childId]/+layout.server.ts` finds the child for all of them. It refuses with 404 when the id is not a whole number or the child is not in the signed-in family, so a page below it never runs for another family's child. `+layout.svelte` adds the stars background, the child's colour along the top, the return to Who's flying when nobody touches the screen (`StillThere`), and live updates (`LiveUpdates`).

These pages need a signed-in device, not grown-up mode: children use them.

## What is on the trip (`trip.ts`)

All three functions start from `copies`: the child's copies of chores, joined to their chores, oldest chore first. Both the copy and the chore must belong to the signed-in family.

| Function | Used by | What it does |
| --- | --- | --- |
| `tripStops(scope, child)` | the trip | The child's copies that are due on today's chore day and not skipped, in path order, each with a state. |
| `comingUp(scope, child)` | the trip (for the count), Coming up | The child's chores that are not due today but are due in the next 6 days, soonest first, with the day name. |
| `openStop(scope, child, chore)` | the stop page | The stop's details, or `null` unless it is the child's own, due today and still pending. The page then goes back to the trip. |

"Due today" and "the chore day" come from `src/lib/repeat.ts` ([repeats.md](repeats.md)), so before 6:00 am the trip still shows yesterday's stops.

### Order and states

From the start of the path:

| Copy status | State | Looks like |
| --- | --- | --- |
| completed | `done` | Teal, with a tick. "Done!" |
| waiting | `waiting` | Yellow, with a clock. "Grown-up checking" |
| pending (the first one) | `next` | Orange with a halo. "Up next · +10 stars" |
| pending (the rest) | `open` | Plain. "+10 stars" |

Skipped copies are left out. Within each group, the oldest chore comes first.

Only `next` and `open` stops are links. Done and waiting stops cannot be opened, and their stop address goes back to the trip.

### The count

| Finished (done + waiting) | Text |
| --- | --- |
| None | "5 stops today · do them in any order!" |
| Some | "2 of 5 stops · 3 more for +20 bonus stars" |
| All | "5 of 5 stops", as on Trip complete |

The +20 is `DAILY_BONUS` in `src/lib/bonus.ts`, until Settings makes it adjustable (#31).

### Step by step

`tripStops`:

1. Work out the chore day with `choreDay(now)`.
2. Read the child's copies with `copies`, each with its repeat (`toRepeat`).
3. Keep the copies that are not skipped and are due on the chore day (`isDue`).
4. Sort by status: completed, then waiting, then pending (`ORDER`). The sort is stable, so the oldest chore stays first within each group.
5. Give each a state. The first pending copy becomes `next`, and the rest become `open`.

`comingUp`:

1. Read the child's copies and drop the ones due today. Today's chores are on the trip, whatever their status.
2. For each chore that is left, look at the next 6 days in turn and take the first one it is due on (`nextDue`). A chore with no such day, such as a past Once chore, is dropped.
3. Sort by that date, soonest first, and name the day ("Thursday") with `WEEKDAYS[weekday(date)].long`.

`openStop`:

1. Refuse a chore id that is not a positive whole number.
2. Find the child's copy of that chore with `copies`.
3. Return `null` unless the copy is pending and due today.
4. Otherwise return the name, picture, stars, expectations and the repeat label (`repeatLabel`) for the stop page.

### What happens when

| Situation | What happens |
| --- | --- |
| The child has no copies due today, or they are all skipped | `tripStops` is empty and the page shows "Nothing to do today!" |
| It is before 6:00 am | The chore day is still yesterday, so yesterday's stops show until the reset ([reset.md](reset.md)) |
| A chore due today was skipped | It is on neither the trip nor Coming up, because Coming up only lists chores not due today |
| A Weekly chore is due today and again on Thursday | It is on the trip only |
| Coming up has nothing | The trip hides the Coming up button. The page at `/coming-up` still works, with an empty list |
| A child opens the address of a done, waiting, skipped or not-due stop | `openStop` returns `null` and the page goes back to the trip |
| A chore id in the address is not a number, or is another child's chore | The same: back to the trip |

### Family scope

`copies` is the only query, and it checks the family twice. `scope.where` limits the copies to the signed-in family, and `eq(schema.chore.familyId, scope.familyId)` does the same for the joined chores. A copy can never bring in another family's chore, even if the ids were mixed up. The layout has already refused another family's child with 404.

## "I did it!" and Undo

The flow (design/FLOWS.md, "A child does a chore" and "A child does chores in any order"):

1. The stop page's **I did it!** opens `/confirm`, "Are you Mia?". **No, that's not me** goes back to Who's flying.
2. **Yes, I'm Mia** posts the page's form action. `iDidIt` sets the copy to `waiting` and `done_at` to now, but only if `openStop` would open it and it is still `pending`. A double tap finds it already waiting, so nothing changes and no second alert is sent.
3. When it changed, every grown-up gets the "A chore is ready to check" alert (`ALERTS.choreWaiting`), with no names ([ADR 0009](../adr/0009-ntfy-alerts.md)). It is sent without waiting for ntfy, so the child is never held up.
4. The trip opens with `?sent=<chore>`. `justSent` returns the stop's name and the seconds of Undo left, or `null` once a grown-up has checked it or the minute is up. The message is "Sent! A grown-up will check it." when the stop was Up next, and "Set the table moved to the front!" when it jumped ahead (`&moved=1`). Both have **Undo**.
5. **Undo** posts `?/undo`. `undoIDidIt` puts the copy back to `pending` only while it is still `waiting` and `done_at` is within `UNDO_SECONDS` (60) plus 10 seconds' grace, so a tap at 0:59 still counts.

| Function | What it does |
| --- | --- |
| `iDidIt(scope, child, chore)` | Pending to waiting, once. Returns `{ name, moved }`, or `null` when nothing changed. |
| `justSent(scope, child, chore)` | The message and Undo time left, while Undo is allowed. |
| `undoIDidIt(scope, child, chore)` | Waiting back to pending, within the minute. Returns whether it changed. |

The daily reset clears `done_at` along with the status ([reset.md](reset.md)).

## The daily bonus

Finishing every stop earns +20 stars once a day, and the bonus planet at the end of the path opens "Finish the whole trip" or "Trip complete!". How the bonus is earned and taken back: [daily-bonus.md](daily-bonus.md).

## Messages from a grown-up

The trip also shows "Feed Biscuit the dog checked! +15 stars" once after a grown-up accepts, and "Grown-up says: “…”" after "Not done yet", until the child taps "I did it!" again. How they work: [checking.md](checking.md).

## Live updates

The trip pages and Who's flying refresh on their own when something changes on another device. The trip layout returns the family's `version` and renders `LiveUpdates`. How it works: [live-updates.md](live-updates.md).

## Where things go (`trip-path.ts`)

The design draws 5 stops on a 390 px wide board. `tripPath(count, finished)` works out the same layout for any number of stops:

- **Stops** zig-zag up from the bottom: the first at x 110 (left), the next at x 280 (right), and so on, 100 px apart. More stops make the board taller.
- **The home planet** sits below the first stop, and **the bonus planet** at the top right.
- **The path** joins home, every stop and the bonus planet with S-shaped curves, each step bending at its halfway height, as in the design. It is drawn dotted.
- **The rocket** sits halfway along the step after the last finished stop, tilted towards where it is going.
- **The teal trail** follows the path from home to the rocket. Its last half step is cut from the curve (de Casteljau's rule), so it lines up with the dotted path exactly.

The page turns each x into a percentage of the board's width (`pct`), so the layout fits phones narrower than 390 px.

`src/lib/trip-path.test.ts` checks that 5 stops with 2 finished land exactly where the design puts them.

## Test-only status route

Until the grown-up check (#24) exists, nothing in the app can mark a copy done. `/test/chore-status` sets a copy's status for Playwright. Like every `/test/` page, it answers 404 unless test routes are allowed (local test runs only).

## Tests

- `src/lib/server/trip.test.ts`: only the child's own stops due today and not skipped, the order and Up next, Coming up's 6 days, which stops open, and another family's chores never shown or opened.
- `src/lib/trip-path.test.ts`: the layout against the design.
- `e2e/trip.test.ts`: the trip with done and waiting stops, opening a stop, Coming up, the "any order" count, and another family getting 404 on every trip page.
- `src/lib/server/trip.test.ts` also checks "I did it!" (once only, moved or not, only open stops), Undo (within the minute, not after a grown-up checks it), another family's chores, and that only the changed family's version goes up.
- `e2e/bonus.test.ts`: the bonus planet before and after finishing every stop ([daily-bonus.md](daily-bonus.md)).
- `e2e/i-did-it.test.ts`: the whole flow with a second device following within seconds, the alert with no names, Undo, "No, that's not me", and a second confirm doing nothing.
