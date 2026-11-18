# How the Ranks tab and star history work

The Ranks tab shows each child's rocket and rank, the rank ladder, and a link to the child's star history (docs/SPEC.md, "Trip, stars and bonus"; [ADR 0003](../adr/0003-data-model-for-stars.md); screens Ranks, R-Ranks, Star-History, Star-History-Empty). Both are for grown-ups only. The history rules are in `src/lib/server/history.ts`. The ranks themselves are in `src/lib/ranks.ts` ([database.md](database.md) explains the star ledger).

## The pages

| Page | Screen | Shows |
| --- | --- | --- |
| `/grown-up/ranks` | Ranks | A tile for each child (rocket, rank, stars), the rank ladder for the chosen child with their current rank outlined, and the "Star history" link. |
| `/grown-up/ranks/<child>/history` | Star-History, Star-History-Empty | The child's star changes grouped by day, or "No stars yet". |

Tapping a child's tile opens `/grown-up/ranks?who=<child>` and shows that child's ladder and history link. With no `who`, or an unknown one, the first child is shown. The designs only draw the first child, so the tile's teal outline (shown when there is more than one child) is not drawn.

Both pages are grown-up pages: the PIN pad first, then the page ([grown-up-mode.md](grown-up-mode.md)). The tab bar also shows on the history page, as drawn.

## The API

| Route | Does |
| --- | --- |
| `GET /api/grown-up/ranks` | The family's `version` and every child's card (`childCards`). |
| `GET /api/grown-up/history/<child>` | The family's `version`, the child's card and `starHistory`. 404 for a child in another family or an id that is not a whole number. |

Both need a grown-up token (`requireGrownUp`), so a child's device gets 401.

## The ladder

`RANKS` in `src/lib/ranks.ts` holds each rank's name, its star minimum and its one-line perk ("Plain rocket", "Side boosters"). The page draws each rung with the same `Rocket` the child sees, in the chosen child's colour. The current rung is the one `rankFor(stars)` returns for the child's balance, so it can move down after a reward is handed out.

## The history (`history.ts`)

`starHistory(scope, childId)` reads the child's `star_event` rows, newest first, and returns days of items.

| Item | Name shown | Amount |
| --- | --- | --- |
| `chore` | The chore's name, found through the chore copy in `source_id` | `+10` |
| `bonus` | "Daily bonus" | `+20` |
| `reward` | "Movie night handed out", found through the claim in `source_id` | `−150` |

Steps:

1. `scope.requireChild` refuses a child from another family (`NotInFamily`).
2. Read the newest `HISTORY_LIMIT` (500) rows for the child.
3. Look up the names for the chore and reward rows in one query each. Both joins also check the family, so a row can never take a name from another family's chore or reward.
4. Group by the Melbourne date of `created_at` (`melbourne`), not the chore day, so a row at 12:30 am is on the new calendar day. The label is "Sun 15 Nov" and the time is "9:14" or "18:05".

### Only what stands

The history keeps no copy of its own. Undo deletes the exact star row, and "That wasn't Mia" moves it to the other child ([checking.md](checking.md), [daily-bonus.md](daily-bonus.md)), so reading the rows already shows only what stands.

| Situation | What happens |
| --- | --- |
| Undo of the accept that finished the trip | The chore row and the daily bonus row are gone from the history. |
| "That wasn't Mia" | The row leaves Mia's history and shows in Leo's. |
| A chore or reward was removed later | The row stays, named "A removed chore" or "A removed reward handed out". |
| No rows | The page shows "No stars yet" and "Stars show up here when a grown-up accepts a chore." |

## Live updates

Both pages return the family's `version` and render `LiveUpdates` with `onchange`, so a new accept or hand-out shows within a few seconds ([live-updates.md](live-updates.md)). `star_event` already bumps the version.

## Accessibility

Each day is a labelled list ("Sun 15 Nov") and each row has a label such as "Earned 10 stars: Tidy the toy box, 9:14" or "Spent 150 stars: Movie night handed out, 18:05". The scrolling region can be focused so a keyboard can scroll it. The design drew one list with groups inside; the page uses a labelled region with a list for each day, because a list may only hold list items.

## Tests

- `src/lib/server/history.test.ts`: names, amounts, times and order; Melbourne midnight; rewards as spends; Undo and "That wasn't Mia"; removed chores and rewards; another family's rows and names never shown.
- `e2e/star-history.test.ts`: the empty history, the ladder, a full day (two chores, the bonus, a reward), and children and another family refused.
