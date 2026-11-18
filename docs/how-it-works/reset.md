# How the daily reset works

The daily reset puts finished chores back to Pending each morning, so a child can do them again (docs/SPEC.md, "Repeating chores"; [ADR 0010](../adr/0010-daily-reset.md)). All of it is in `src/lib/server/reset.ts`. What counts as "due" and "the chore day" come from `src/lib/repeat.ts` ([repeats.md](repeats.md)).

## What a reset does

For one family, on one chore day:

| Copy of a chore | Due on this chore day | Not due |
| --- | --- | --- |
| Completed | Back to Pending | Left alone |
| Skipped | Back to Pending | Left alone |
| Waiting (a grown-up has not checked it yet) | Left alone | Left alone |
| Pending | Already pending | Left alone |

A copy that goes back to Pending also loses what the last round left on it: `done_at` ("I did it!" time), `checked_at` and `star_event_id` (the grown-up's accept), and `message`.

Two more things are cleared:

- **"Not done yet" messages** on every copy of a due chore, including Pending ones, so yesterday's message does not show today.
- **Unseen "checked!" notices** (`checked_notice`) for the whole family, even on a day with nothing due ([checking.md](checking.md)).

Stars are never read or changed. They are rows in `star_event` ([database.md](database.md)). Clearing `star_event_id` only forgets which row the last accept added; the row stays.

## The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `startResetJob(db)` | `init` in `src/hooks.server.ts` | Runs a reset check at once, then every minute. Starting it twice does nothing. |
| `resetAll(db, now)` | the job | Checks every family with `resetFamily`, and writes one log line for each family that reset. |
| `resetFamily(scope, now)` | `resetAll`, the tests | Resets one family for the current chore day. Returns how many copies went back to Pending, or `null` when that day had already been reset. |

Helpers inside the file:

- `CHECK_EVERY` is how often the job checks: 60 seconds.
- `timer` holds the running job, so `startResetJob` can tell it has started. It is `unref`'d, so it never keeps the app from stopping.

## Steps of `resetFamily`

It runs in one transaction, so a reset is never half done.

1. **Work out the chore day** with `choreDay(now)`: the Melbourne date, or the day before when it is earlier than 6:00 am.
2. **Claim the day.** Insert a row into `chore_reset` with the family and the chore day. A unique index on the two means a second insert does nothing (`onConflictDoNothing`). No row came back means the day was already reset, so it stops and returns `null`.
3. **Clear unseen "checked!" notices** for the family.
4. **Find the chores due today.** Read the family's chores and keep those where `isDue(toRepeat(chore), day)` is true. If none are due, stop and return 0.
5. **Reset their copies.** One update sets the family's Completed and Skipped copies of those chores to Pending, and clears `done_at`, `checked_at`, `star_event_id` and `message`.
6. **Clear messages** on every copy of those chores, so Pending copies that were sent back lose theirs too.
7. **Write the count** to the claimed `chore_reset` row (`copies_reset`) and return it.

The claim comes first, so even two checks running at the same moment can never both reset the same day. The second finds the row already there.

## When it runs

| Situation | What happens |
| --- | --- |
| The app has been running over 6:00 am | The first check after 6:00 finds no row for the new chore day and resets. That is up to a minute after 6:00. |
| The app was stopped over 6:00 am (a deploy or a restart) | The check on start finds no row and resets straight away. This is the catch-up the ADR asks for. |
| Several days were missed | It resets for today only. A chore that was due on a missed day but not today is not on today's trip, and resets on its next due day. |
| Later checks the same day | They find today's row and change nothing, so a chore finished at 9:00 am is not undone. |
| Daylight saving starts or ends | The chore day comes from the Melbourne clock, so 6:00 am is still 6:00 am. |
| Settings changes the reset time | The next check uses the new time. Nothing needs rescheduling, because the job only asks "has this chore day been reset?" |
| A family is created during the day | Its first check records today as reset, with nothing to reset. |
| A grown-up accepted a chore just before 6:00 am | The reset puts it back to Pending, so the 1-minute undo no longer applies. The stars stay. |
| A chore is Waiting at 6:00 am | Left alone, with its "I did it!" time, so a grown-up can still check it later ([checking.md](checking.md)). |

### The first run after #21 is deployed

No family has a `chore_reset` row yet, so the first check after the deploy resets today for every family, even in the middle of the day. Nothing is harmed now, because no child can finish a chore until the child's trip is built (#22 onwards). Remember this if a later item makes resetting mid-day matter.

## Family scope

`resetAll` reads the family ids, then calls `resetFamily` with `forFamily(db, id)` for each. Every query goes through `scope.where`, so one family's reset only touches its own chores, copies and log rows.

## The log

- **In the database:** each `chore_reset` row has the family, the chore day, when it ran (`ran_at`) and how many copies it reset. A missing day, or a `ran_at` long after 6:00 am, shows a missed or late reset.
- **In the app's log:** one line per reset: `daily reset: family 3, chore day 2026-11-17, 2 copies`. It has the family's id, never names.
- **Failures:** if a check throws, `startResetJob` logs "daily reset failed" and the job carries on with the next check. Because the transaction rolls back, the day is not claimed, and the next check tries again.

## Tests

`src/lib/server/reset.test.ts` checks:

- Completed and Skipped copies go back to Pending, and Waiting ones are left alone.
- It waits for 6:00 am, then runs once per chore day.
- Chores that are not due today are left alone, and a Once chore is never brought back.
- The catch-up after a missed reset, and the log rows.
- Stars are untouched.
- One family's reset never changes another family's chores.

`src/lib/server/check.test.ts` also checks that the reset clears yesterday's "Not done yet" messages, and an unseen "checked!" even on a day with nothing due.
