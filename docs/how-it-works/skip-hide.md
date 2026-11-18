# How skipping and hiding a chore work

A grown-up can excuse a chore for some days, or hide it from the children (docs/SPEC.md, "Chores"; design/FLOWS.md, "A grown-up skips or hides a chore" and "A grown-up skips a chore for several days"). The rules are in `src/lib/server/chore-state.ts`, and the skip dates and wording are in `src/lib/skip.ts`.

Both belong to the **chore**, so they apply to every child it is assigned to. Neither changes a copy's status or any stars. The trip just leaves the chore out.

## The pages

| Page | Screen | Shows |
| --- | --- | --- |
| `/grown-up/chores/<id>` | Stop-Parent, R5-Stop-Parent | The Today row, and Skip… and Hide. While skipped or hidden they become **Turn back on** and **Unhide**. |
| `/grown-up/chores/<id>/skip` | Skip-Options | Today only, 2 days, 3 days, Pick a date… and Until I turn it back on. |
| `/grown-up/chores` | Parent-Stops-Skipped, -SkippedLong, -Hidden | The notice, the "Skipped today", "Skipped to Tue" or "Hidden" pill, and the Hidden chip. |

No screen is designed for turning a chore back on or for picking a date. Both were decided in #29: the buttons swap in place, and "Pick a date…" opens a date field on the Skip screen.

## What is stored

| Column on `chore` | Means |
| --- | --- |
| `hidden` | Off children's screens until unhidden. |
| `skip_until` | The first chore day it is back, a Melbourne date. |
| `skip_open` | Skipped until a grown-up turns it back on. |

A skip is a date rather than a status, so **it ends by itself**: no job runs when it finishes. `activeSkip(chore, day)` says whether one is in force on a chore day. Before 6:00 am the chore day is still yesterday, so "Today only" lasts until the reset ([repeats.md](repeats.md)). The `skipped` value of `chore_copy.status` is not used.

| Choice | `skip_until` |
| --- | --- |
| Today only | chore day + 1 |
| 2 days, 3 days | chore day + 2, + 3 |
| A picked date | that date: from chore day + 2 to chore day + 365, otherwise `BadSkip` (400) |
| Until I turn it back on | none, and `skip_open` is set |

## The API

`POST /api/grown-up/chores/<id>` with one action, checked by `parseChoreAction`:

| Body | Does |
| --- | --- |
| `{ "action": "skip", "length": "today" }` (or `"2"`, `"3"`, `"open"`) | Skips it. |
| `{ "action": "skipUntil", "date": "2026-12-25" }` | Skips it until that date. |
| `{ "action": "unskip" }` | Turns it back on at once. |
| `{ "action": "hide" }`, `{ "action": "unhide" }` | Hides or unhides it. |

`GET` on the same route also returns `today`, the chore screen's Today row, from `choreToday`.

| Function | What it does |
| --- | --- |
| `applyChoreAction(scope, chore, action)` | Makes the change and settles the daily bonus, in one transaction. False when the chore is not in this family. |
| `choreToday(scope, chore)` | "Mia: up next · Leo: done", "Skipped · back on Tuesday", "Hidden from children", "Not due today" or "Nobody yet". |

## What happens when

| Situation | What happens |
| --- | --- |
| The chore is skipped or hidden | It leaves the trip and can't be opened or sent (`tripStops`, `openStop`, `iDidIt`). |
| It is due later, within Coming up's 6 days | Coming up shows the first due day after the skip. A hidden or open-ended chore is left out. |
| A stop was already Done | It leaves the path too. Its stars stay. |
| A stop was waiting for a grown-up | It leaves the path, stays in TO CHECK, and can still be accepted. |
| That leaves the rest of the trip all Done | The child earns the daily bonus ([daily-bonus.md](daily-bonus.md)). A trip with no stops earns nothing. |
| The skip ends | The chore is back at that day's reset. The reset treats its copies as usual ([reset.md](reset.md)). |
| It is turned back on the same day | It returns with the status it had, so a Done stop is Done again. |
| It is both skipped and hidden | The pill says Hidden, the Today row names both, and each has its own button. |

## Security

- Both routes need a grown-up token. Only `applyChoreAction` changes these columns.
- The update is limited to the signed-in family, so another family's chore is 404 and does not change.
- Actions and dates are checked with Zod, and the date range is checked on the server.

## Tests

- `src/lib/server/chore-state.test.ts`: each skip length, the 6:00 am edge, Coming up, hiding, the bonus, stars kept, TO CHECK, the wording, the Today row, bad input and another family.
- `e2e/skip-hide.test.ts`: the whole flow with a second device, plus refusals without a token, with bad input and from another family.
