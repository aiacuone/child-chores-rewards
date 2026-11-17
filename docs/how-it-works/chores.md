# How the chores library works

The chores library is the family's list of chores, managed from the Chores tab in grown-up mode (docs/SPEC.md, "Chores"). The rules are in `src/lib/server/chores.ts`. The API routes only call it.

## A chore and its copies

| Table | Holds |
| --- | --- |
| `chore` | The chore itself: name, picture (`icon`), stars and when it repeats ([repeats.md](repeats.md)). One row per chore in the family. |
| `chore_copy` | One row per child the chore is assigned to, with that child's own `status` (pending, waiting, completed, skipped). |

- Ticking Mia and Leo under "Who does it?" gives the chore two copies, so Mia finishing hers does not finish Leo's.
- A chore with no copies is still in the library. The list shows it as "Nobody yet".
- A copy cannot be made twice for the same child (unique index on `chore_id` + `child_id`).
- Removing a chore or a child removes their copies too (the foreign keys cascade).

## The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `listChores(scope)` | `GET /api/grown-up/chores` | Every chore in the family, newest first, each with the ids of the children who have a copy. Two queries in all, not one per chore. |
| `getChore(scope, id)` | `GET /api/grown-up/chores/<id>` | One chore with each copy's child and status, or `null` when the id is not a positive whole number or the chore is not in this family. |
| `addChore(scope, input)` | `POST /api/grown-up/chores` | Checks the children, then in one transaction saves the chore and makes a copy for each ticked child. Returns the new id. |
| `updateChore(scope, id, input)` | `PUT /api/grown-up/chores/<id>` | Checks the children, then in one transaction changes the name, picture and stars and syncs the copies. Returns `false` when the chore is not in this family. |
| `removeChore(scope, id)` | `DELETE /api/grown-up/chores/<id>` | Deletes the chore, and with it every copy. Returns `false` when it is not in this family. |

Helpers inside the file:

- `checkChildren` calls `scope.requireChild` for each ticked child, which throws `NotInFamily` for a child from another family. It runs before anything is saved.
- `assign` makes the copies match the ticked children:
  - a child who is ticked and has no copy gets a new one, starting as pending,
  - a child who is unticked loses their copy,
  - a child who stays ticked keeps their copy and its status, so editing the name or stars does not reset a chore someone has already done.

## Removing a chore keeps earned stars

Stars are rows in `star_event` ([database.md](database.md)), and each row keeps its own amount. `star_event.source_id` is a plain number, not a foreign key, so deleting a chore and its copies leaves those rows untouched. Balances stay the same, which matches the confirm card: "Stars already earned stay."

## Family scope

Every function takes the scope from `forFamily`, and every query goes through `scope.where`, so it only reaches the signed-in family's rows:

| Someone tries to… | What happens |
| --- | --- |
| read, change or remove another family's chore | It is not found: `null` or `false`, and the route answers 404. |
| assign another family's child | `NotInFamily` is thrown before saving, and the route answers 400. |

## Where the checks on the input are

The input is checked before these functions run:

- `src/lib/server/read-json.ts` refuses a body over 2,000 characters, or one that is not JSON.
- `src/lib/server/forms/chores.ts` checks the shape with Zod (`parseChore`):

| Field | Allowed |
| --- | --- |
| `expectations` | Empty, or up to 200 characters with the same rules as the name. |
| `name` | 1 to 40 characters. Letters in any language, numbers, punctuation and emoji. No invisible or control characters, and no spaces at either end. |
| `icon` | One of the 6 pictures in `src/lib/chore-icons.ts`. |
| `stars` | 5 to 100, in steps of 5. |
| `childIds` | Up to 4 different child ids. Whether they belong to the family is checked by `checkChildren`. |
| `repeat` | One of the five kinds, with only its own settings ([repeats.md](repeats.md)). A Once date more than 6 days ahead, or in the past, is refused in `chores.ts` (`BadRepeat`), unless it is the date the chore already had. |

Anything else is refused with 400, not fixed.

## The API routes

All of them need the device to be signed in and a working grown-up token (`requireGrownUp`, [grown-up-mode.md](grown-up-mode.md)). Pages call them through `grownupFetch`.

| Route | Answers |
| --- | --- |
| `GET /api/grown-up/chores` | `{ children, chores }`: the family's children (for the chips and "Who does it?") and `listChores`. |
| `POST /api/grown-up/chores` | 201 `{ id }`, or 400 for bad input or another family's child. |
| `GET /api/grown-up/chores/<id>` | The chore from `getChore`, or 404. |
| `PUT /api/grown-up/chores/<id>` | 204, 400 for bad input or another family's child, or 404. |
| `DELETE /api/grown-up/chores/<id>` | 204, or 404. |

An `<id>` that is not 1 to 9 digits is treated as not found.

## Tests

- `src/lib/server/chores.test.ts`: copies per child, newest first, editing keeps other copies' status, removing keeps earned stars, another family's chores and children refused, and the form checks.
- `e2e/chores.test.ts`: adding, editing, the chips, the remove confirm card, and the API refusing another family's chore.
