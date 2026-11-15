# 3. Data model for stars

Status: accepted

## Context

Children earn stars for accepted chores and a daily bonus for finishing every stop. They spend stars on rewards. The balance only goes down when a grown-up confirms a reward claim, and there are no penalties.

Star changes must be reversible:

- a grown-up can undo an accepted chore for 1 minute, which must also take back the daily bonus if that chore finished the trip,
- a grown-up can move a chore and its stars to the right child ("That wasn't Mia").

The screens show each child's balance ("128 stars saved") and a rank ladder (Cadet 0, Pilot 50, Explorer 100, Captain 250, Commander 500). The spec does not say whether ranks use the current balance or all stars ever earned. Data is stored in SQLite ([ADR 0002](0002-database.md)).

For one family the log stays small, under about 4,000 rows a year for two children, so summing it is instant.

## Options considered

### Option 1: Counters on the child

Each child stores a current balance and an all-time total, updated in the same save as each change.

- Reading a balance is one number.
- Undo and moving stars mean reversing amounts by hand, including working out whether the bonus has to go too.
- No record of why a balance is what it is, so nothing to check or repair from.

### Option 2: Event log

Every star change is a row: chore accepted, daily bonus, reward claimed. The balance and the all-time total are sums of those rows.

- Undo removes the chore's rows, including its bonus row.
- Moving a chore to the right child moves its rows.
- A full history of where each child's stars came from and went.
- Every balance read is a sum, which is tiny at family scale.
- A few more rows and a slightly bigger schema.

### Option 3: Event log and counters

The same event log, plus a stored balance and total on each child, updated in the same save.

- A full history, and reading a balance is one number.
- The counters and the log can disagree if one update is ever missed.

### Option 4: Worked out from chores

No separate star table. Totals are worked out from accepted chore records, bonus records and confirmed claims.

- Undo and moving stars are a change to the chore's status or child.
- Removing or editing a chore would erase or change stars already earned, unless chores are only hidden and amounts are copied at the time.
- Bonuses and claims need their own tables anyway, and totals need joins across them.

## Decision

We chose **Option 2: Event log**.

- Undo, the daily bonus and "That wasn't Mia" become moving or removing rows.
- It gives a full history to check a child's stars against.
- A grown-up could see a child's star history on a screen.
- Option 3's counters add little at this scale, and can be added later from the log without losing anything.

The strongest alternative was Option 3, if summing the log ever became slow.

## Consequences

- Every star change must be written as a row. Code must never change a balance any other way.
- Each row stores its amount at the time, so editing a chore's star value later does not change past stars.
- Undo and "That wasn't Mia" change the log itself: undo deletes the chore's rows (and its bonus row), and moving a chore moves its rows to the other child. The log shows only what stands, not an audit trail of corrections.
- Ranks use the current balance, the sum of all rows. A child's rank can drop after a reward is handed out.
- A grown-up star history needs a new screen, Star history, one child at a time, opened from that child on the Ranks tab. Children never see the history, because it would show stars going down.
- If balances ever need to be faster to read, cached counters can be added and filled from the log (Option 3).
