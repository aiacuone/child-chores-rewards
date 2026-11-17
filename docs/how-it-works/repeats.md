# How repeats and the daily reset work

Each chore has a schedule, and every morning at 6:00 am finished chores that are due again go back to Pending (docs/SPEC.md, "Repeating chores"; [ADR 0010](../adr/0010-daily-reset.md)).

| File | Job |
| --- | --- |
| `src/lib/repeat.ts` | The rules: what day it is, whether a chore is due, and how a schedule reads. Shared by the server and the pages. |
| `src/lib/server/chores.ts` | Saves and reads a chore's schedule. |
| `src/lib/server/reset.ts` | The daily reset job ([reset.md](reset.md)). |

## Dates are Melbourne calendar dates

Every date is a string like `2026-11-17`, meaning that day in Melbourne. It is never a moment in time.

- The only place a clock is read is `melbourne(now)`, which asks the built-in `Intl` date formatter for the Melbourne date and time. The server's own time zone is never used, so a VM on UTC still resets at Melbourne's 6:00 am.
- Adding days, counting days and finding the weekday are done on the date strings, where every day is exactly 24 hours. Daylight saving cannot push a chore onto the wrong day.

### The chore day

`choreDay(now)` is the day whose chores are showing: the Melbourne date, except before 6:00 am, when it is still the day before.

| Melbourne time | Chore day |
| --- | --- |
| Tue 5:59 am | Monday |
| Tue 6:00 am | Tuesday |
| Wed 1:00 am | Tuesday |

The 6:00 am is `RESET_MINUTES`. Settings will make it adjustable (#31).

## The five kinds

A schedule is one object with a `kind` and only the settings that kind needs:

| Kind | Settings | Due when | Label |
| --- | --- | --- | --- |
| `daily` | none | Every day | Every day |
| `weekly` | `days`: 0 (Monday) to 6 (Sunday) | The weekday is one of `days` | Mon, Wed, Fri (all 7 reads "Every day") |
| `monthly` | `day`: 1 to 31 | That day of the month, or the last day in a shorter month | Monthly, on the 15th |
| `custom` | `every`: 1 to 30, `unit`: days or weeks, `start` | A whole number of steps after `start` | Every 3 days, Every 2 weeks |
| `once` | `date` | Only on `date` | Once, Sunday (or "Once, 3 Dec" outside the coming week) |

`isDue(repeat, day)` answers "is it due on this chore day?" and `repeatLabel(repeat, today)` writes the label.

### Custom's start

The page sends `every` and `unit` only. The server adds `start`:

- **A new custom schedule** starts today, so it is due today and then every few days.
- **Editing a chore without changing `every` or `unit`** keeps the old `start`, so renaming "Water the plants" does not move its days.

That is why there are two types: `RepeatInput` (what the form sends) and `Repeat` (what is saved).

### Once's date

The form offers today and the next 6 days. The server refuses any other date with `BadRepeat` (400), except the date the chore already has, so a passed Once chore can still be renamed.

## How a schedule is stored

The `chore` table has one column for the kind and one for each setting. Only the columns the kind uses are filled, the rest are empty:

| Column | Used by |
| --- | --- |
| `repeat_kind` | every chore (`daily` for chores made before #21) |
| `repeat_days` | weekly: one bit per day, Monday = 1, Tuesday = 2 … Sunday = 64. Mon, Wed, Fri is 1 + 4 + 16 = 21. |
| `repeat_day` | monthly |
| `repeat_every`, `repeat_unit` | custom |
| `repeat_date` | custom (the start) and once (the date) |

`toRepeat` turns a row into a schedule, and `repeatColumns` turns a schedule into columns.

## The daily reset

At 6:00 am, finished chores that are due again go back to Pending. The job, its steps, the catch-up and the log are explained in [reset.md](reset.md). It uses `choreDay` and `isDue` from `repeat.ts` to decide which day to reset for and which chores are due.

## Tests

- `src/lib/repeat.test.ts`: the chore day at 6:00 am, on both daylight-saving days and on a UTC server; every kind of repeat, including the 31st in short months, leap years and custom schedules across daylight saving; the labels.
- `src/lib/server/reset.test.ts`: the reset (see [reset.md](reset.md)).
- `src/lib/server/chores.test.ts`: saving each kind, custom's start, Once's date window, and the form checks.
- `e2e/chores.test.ts`: changing a chore to Weekly, Custom and Once in the browser, and the "Saved · now repeats …" line.
