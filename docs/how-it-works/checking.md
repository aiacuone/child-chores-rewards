# How the grown-up check works

A chore a child sends with "I did it!" waits for a grown-up, who accepts it, sends it back with a kind message, or gives it to the child who really did it (docs/SPEC.md, "Checking, undo and send back"; [ADR 0003](../adr/0003-data-model-for-stars.md); design/FLOWS.md, "A grown-up checks a chore"). The rules are in `src/lib/server/check.ts`. The wording and limits shared with the pages are in `src/lib/check.ts`.

## The pages

All are grown-up pages: they show the PIN pad first, and load their data in the browser through `grownupFetch` ([grown-up-mode.md](grown-up-mode.md)).

| Page | Screen | Shows |
| --- | --- | --- |
| `/grown-up` | Parent-Home | Mission control: the day's count, "N stops to check", each child's progress, Add chore. |
| `/grown-up/chores` | Parent-Stops, Parent-Stops-Done, -Undone, -SentBack, -Moved | TO CHECK above the library, and the notice after each answer. |
| `/grown-up/check/<copy>` | Stop-Waiting | One chore to check, and the three answers. The chore alert opens this page. |
| `/grown-up/check/<copy>/send-back` | Not-Done | Pick a kind message or write one. |
| `/grown-up/check/<copy>/who` | Reassign | Who really did it? |

A check page whose copy is no longer waiting (another grown-up answered it) goes to the Chores tab.

## The API

| Route | Does |
| --- | --- |
| `GET /api/grown-up/home` | Mission control's data: the day, each child's stop states and next stop, the chores to check. |
| `GET /api/grown-up/checks` | The chores to check (TO CHECK). |
| `GET /api/grown-up/checks/<copy>` | One copy: chore, child, status, when it was marked done, the undo seconds left, and the children for "Who really did it?". |
| `POST /api/grown-up/checks/<copy>` | An answer: `{ "action": "accept" }`, `"undo"`, `"sendBack"` with `message`, or `"move"` with `childId`. 204 when saved, 409 when it no longer fits. |

Every route needs grown-up mode (`requireGrownUp`), and every answer is checked by Zod in `src/lib/server/forms/check.ts`.

## The functions

| Function | What it does |
| --- | --- |
| `toCheck(scope)` | Copies waiting for a grown-up, oldest "I did it!" first. |
| `checkDetails(scope, copy)` | One copy for the pages and notices, or `null` if it is not this family's. |
| `accept(scope, copy)` | Waiting to completed. Adds one `star_event` row and remembers its id on the copy (`star_event_id`), with `checked_at`. |
| `undoAccept(scope, copy)` | Within the minute: deletes that one star row and puts the copy back to waiting. |
| `sendBack(scope, copy, message)` | Waiting to pending, with the message on the copy. |
| `moveTo(scope, copy, child)` | The stars go to the other child. The marker's copy goes back to pending. |
| `checkedNotice(scope, child)` / `clearCheckedNotices` | "Feed Biscuit the dog checked! +15 stars" for the child's trip, shown once. |

Each answer runs in one transaction and starts by checking the copy is still waiting, so two grown-ups answering at once cannot both win. The second gets 409.

## Accept and undo

1. **Accept** adds the star row (`addStars`, source: the copy), sets the copy to `completed`, records `checked_at` and `star_event_id`, and clears any old message. If that was the last stop, `settleBonus` adds the daily bonus ([daily-bonus.md](daily-bonus.md)).
2. It also adds a `checked_notice` row for the child.
3. The Chores tab shows "Checked! Mia's rocket flew on (+15 stars)" with "Undo 0:52" counting down from the server's undo seconds.
4. **Undo** works for `UNDO_CHECK_SECONDS` (60) plus 10 seconds' grace. It deletes the star row by its id, and only for the copy's own child. A daily chore's copy collects one star row per day, and a moved chore's stars can share the copy as their source. Deleting by id never touches those.
5. The copy goes back to waiting, and the notice goes. If the accept had finished the trip, the daily bonus goes too (`undoBonus`, [daily-bonus.md](daily-bonus.md)).

## Send back

- The message is one of `SEND_BACK_MESSAGES` or the grown-up's own: up to `MAX_MESSAGE` (100) characters of printable text.
- It is saved on the copy (`chore_copy.message`). The child's trip shows "Grown-up says: “Almost! Give it another go.”" (`asSaid` adds the full stop), with the chore's picture.
- "I did it!" clears the message. So does the next daily reset ([reset.md](reset.md)).

## "That wasn't Mia"

Decided in #24: the stars go to the child picked, and nothing else changes for them unless they are assigned.

| The child picked | What happens |
| --- | --- |
| Has their own copy of the chore | Their copy is completed with the stars (source: their copy), and their trip shows Done and "checked!". |
| Has no copy | They get the star row (source: the marker's copy). The chore is not added to their trip or assigned to them. |
| Is the marker, or not in this family | Refused. |

Either way the marker's copy goes back to pending, so the stop opens again.

## "checked!" on the child's trip

- The trip's `load` reads the newest notice (`checkedNotice`) without changing it. Link preloading can run `load` without the page showing, so reading must not use it up.
- When the page shows it, the page posts the `?/seen` action with the notice's id, and `clearCheckedNotices` deletes the child's notices up to it.
- `checked_notice` has no live-updates trigger, so clearing it does not make every screen reload.
- The message after "I did it!" comes first. "checked!" comes next, then "Grown-up says".

## Live updates

Mission control, the Chores tab and the check screen pass `onchange={load}` to `LiveUpdates`, with the version their API returned ([live-updates.md](live-updates.md)). A new "I did it!" appears in TO CHECK within a few seconds, and a check answered on another phone leaves this one.

## Mission control

- "Wednesday · 2 of 3 stops done today": done and waiting stops count, for every child (`tripStops`).
- "N stops to check" lists every one. With one, it opens that check. With more, it opens the Chores tab.
- "N rewards to hand out" lists the waiting claims. With one it opens that hand-out, and with more the Rewards tab ([claims.md](claims.md)).
- Each child's row: the count, a labelled progress bar (teal done, yellow waiting, the rest track blue), and "Next stop: … · 128 stars saved", "All done today · reached Park trip" (the dearest reward the child can afford, or "· 128 stars saved" when none) or "Nothing to do today · …".

## Temporary fixes


## Tests

- `src/lib/server/check.test.ts`: accept once, undo only within the minute and only that accept's row, "checked!" once, send back and its message, the reset clearing messages, moving to an unassigned and an assigned child, refusing the same child or another family's, and another family's copies never listed, read or answered.
- `e2e/check.test.ts`: the whole flow on a phone and a tablet (the alert's link, accept, undo, send back from Mission control, "That wasn't Mia"), and another family getting 404.
