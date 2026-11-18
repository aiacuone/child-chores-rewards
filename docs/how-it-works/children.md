# How managing children and picture passcodes work

Grown-ups add, edit and remove children in Settings, and can give a child an optional three-picture passcode (docs/SPEC.md, "Settings" and "Keeping children from mixing up trips"; Settings-Children, Child-Edit, Child-Remove, Children-Removed, Passcode-Setup and Passcode-Enter). The rules are in `src/lib/server/children.ts` and `src/lib/server/passcode.ts`.

## The pages

| Page | Screen | Shows |
| --- | --- | --- |
| `/grown-up/settings/children` | Settings-Children, Children-Removed | Each child, Add a child (up to 4), and "Leo was removed". |
| `/grown-up/settings/children/new` | Child-Edit, empty | Name and a free rocket colour. |
| `/grown-up/settings/children/<id>` | Child-Edit | Name, colour, Picture passcode, Save, Remove. |
| `/grown-up/settings/children/<id>/remove` | Child-Remove | What will be deleted, then "Yes, remove Leo" or Cancel. |
| `/grown-up/settings/children/<id>/passcode` | Passcode-Setup | Pick 3 pictures, and Turn off passcode when one is set. |
| `/passcode/<child>` | Passcode-Enter | "Tap your 3 secret pictures." For children, not grown-ups. It leads to the trip, or with `?to=rocket` to the rocket photo. |

The Rocket photo row is explained in [photos.md](photos.md).

## The API

| Route | Who | What it does |
| --- | --- | --- |
| `GET`, `POST /api/grown-up/children` | Grown-up mode | List the children, or add one. |
| `GET`, `PUT`, `DELETE /api/grown-up/children/<id>` | Grown-up mode | Read, change or remove one child. |
| `PUT`, `DELETE /api/grown-up/children/<id>/passcode` | Grown-up mode | Set or change the pictures, or turn the passcode off. |
| `POST /api/passcode/<child>` | Signed-in device | Check a child's try. |
| `POST /api/passcode/close` | Signed-in device | Close this device's open trips. |

## Rules for children

- Names and colours use the same checks as setup (`parseChild` in `forms/setup.ts`). Each child has their own name, ignoring capitals, and their own colour.
- A family has at most 4 children and at least 1. The last child has no Remove button and the server answers 409.
- `removeChild` deletes the child row. Database cascades remove their chore copies, stars, reward links, claims, notices, photo, passcode and open trips. The chores themselves stay in the library. It then calls `settleFamilyBonuses`.

## How the passcode is enforced

1. `child_passcode` holds the scrypt hash of the three pictures in order, never the pictures, plus the wrong-try count.
2. `src/hooks.server.ts` runs `tripOpen` for every request matched to `/trip/[childId]`, a route below it, or the rocket photo page and upload. If the trip is not open, it redirects to `/passcode/<child>`. This covers pages, their data requests and form actions. It reads the matched route and its params, so an address like `/trip/%31` cannot get past it.
3. The right pictures add a `child_unlock` row for this child and this device's session.
4. Who's flying calls `/api/passcode/close` when it opens, which removes this device's rows. It is not done in the page's `load`, because `load` also runs when a link is only hovered.
5. An open trip that is not used for an hour closes by itself (`OPEN_MS`). This covers a tablet left on a trip with the app closed.

## What happens when

| Situation | What happens |
| --- | --- |
| Wrong pictures | The dots clear and it says "Those aren't your pictures. Try again." |
| 5 wrong tries in a row | No try is checked for 30 seconds, for that child on every device. A reload does not end the wait. |
| A passcode is changed or turned off | Wrong tries reset and every open trip for that child closes. |
| A child has no passcode and `/passcode/<child>` is opened | It goes to the trip. |
| Who's flying is open when a passcode is set | Live updates refresh it. Wrong tries do not, because they change only `child_passcode` rows and its triggers fire on insert and delete. |

## Security

- Every query is scoped to the signed-in family. Another family's child answers 404.
- All input is checked on the server: three known pictures for a try, three different ones to set a passcode.
- With 9 pictures there are 504 passcodes, so this keeps a brother or sister out and is not strong security. The wait slows guessing to 10 tries a minute.
- The grown-up PIN is what protects changes to a passcode.

## Tests

- `src/lib/server/children.test.ts`: adding, editing and removing, what removal deletes, passcode checks, the wait, closing trips, and other families.
- `e2e/children.test.ts`: the whole flow in a browser, the ways around the passcode screen, accessibility, and another family getting 404.
