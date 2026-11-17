# How grown-up setup works

Setup is the four steps a new family goes through after signing in with Google (docs/SPEC.md, "Devices and sign-in"). The rules are in `src/lib/server/setup.ts`. The pages in `src/routes/setup/` only call them.

| Step | Page | Screen | What it saves |
| --- | --- | --- | --- |
| 1 | `/setup/children` | Setup-Children | The children, with a name and colour each |
| 2 | `/setup/pin` | Setup-PIN | `family.pin_hash` |
| 3 | `/setup/email` | Setup-Email | A confirm link ([recovery-email.md](recovery-email.md)) |
| 4 | `/setup/alerts` | Setup-Alerts | `family.ntfy_topic`, then `family.setup_done_at` on Finish |
| | `/setup/done` | Setup-Done | Nothing |

## Working out the step

Nothing stores "which step we are on". `setupStep(scope)` works it out from what the family has saved, checked in this order:

| If the family… | The step is |
| --- | --- |
| has `setup_done_at` set | `done` |
| has a PIN and has sent a confirm link | `alerts` |
| has a PIN but no confirm link | `email` |
| has children but no PIN | `pin` |
| has no children | `children` |

So a family that stops halfway carries on at the right step on any device, and nothing can get out of step with the data.

## Which pages can open

`OPEN_PAGES` lists the pages a family may open on each step:

| Step | Pages that open |
| --- | --- |
| `children` | children |
| `pin` | children, pin (Back from the PIN step) |
| `email` | email |
| `alerts` | email, alerts (Back from the alerts step) |
| `done` | none (only `/setup/done`) |

- The setup layout (`src/routes/setup/+layout.server.ts`) checks this on every page load. Any other page sends the family to their own step. Once setup is done, every setup page sends them to `/`.
- `/` sends a family to their setup step until it is done (`src/routes/+page.server.ts`).
- A form post skips the layout check, so each action checks again before saving.

## Two locks

- **Steps 1 and 2 lock once the PIN is set.** Setup can then never replace the PIN or the children, even from a tablet signed in to the same Google account. Changing them later is in Settings, behind the PIN.
- **Steps 3 and 4 stay open until Finish.** Then every setup page and form post is refused.

## The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `setupStep(scope)` | the setup layout, `/`, the actions | Works out the family's step, as above. |
| `saveChildren(scope, rows)` | step 1 | In one transaction: refuses with `SetupClosed` if the PIN is set, then replaces the family's children with the new list. Saving again after Back replaces them, which is how Back keeps editing simple. |
| `setFirstPin(scope, pin)` | step 2 | Needs children first. Saves the hashed PIN only where `pin_hash` is still empty, in the same statement. A second tab or a repeated post changes nothing and gets `SetupClosed`. |
| `finishSetup(scope)` | Finish on step 4 | Refuses with `SetupClosed` unless the family is on the `alerts` step, then sets `setup_done_at`. |

Helpers inside the file:

- `familyRow` reads the family's `pin_hash` and `setup_done_at`.
- `pinIsSet` is true when `pin_hash` is filled in.

Every function takes the family scope from `forFamily`, so it only reaches the signed-in grown-up's own family.

## Where the checks on the input are

The forms' fields are checked before these functions run, in `src/lib/server/forms/setup.ts` with Zod (`parseChildren`, `parsePin`, `parseEmail`). These functions trust that the input is already the right shape. They only decide whether the step is allowed.

## Tests

- `src/lib/server/setup.test.ts` checks the step order, both locks, and that one family's setup never touches another's.
- `e2e/setup.test.ts` runs the four steps in a browser, and checks that every setup page and post is refused once setup is done.
