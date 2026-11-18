# How grown-ups and invites work

A family can have several grown-ups, each signing in with their own Google account and sharing one PIN. An invite is how the app knows a new Google account belongs to the family ([ADR 0017](../adr/0017-grown-up-invites.md); docs/SPEC.md, "Grown-ups"; Grown-ups, Invite, Grown-ups-Invited). The rules are in `src/lib/server/invites.ts`, and sign-in is `signInGoogleUser` in `src/lib/server/auth.ts`.

## The pages and API

| Address | Who | What it does |
| --- | --- | --- |
| `/grown-up/settings/grown-ups` | Grown-up mode | The grown-ups and invites. Tap an invite to cancel it. The owner taps a grown-up to remove them. |
| `/grown-up/settings/grown-ups/invite` | Grown-up mode | "Their Google email" and Send invite. |
| `GET`, `POST /api/grown-up/grown-ups` | Grown-up mode | Read the list, or send an invite. |
| `DELETE /api/grown-up/grown-ups/invites/<id>` | Grown-up mode | Cancel an invite. |
| `DELETE /api/grown-up/grown-ups/<id>` | Grown-up mode, signed in as the owner | Remove a grown-up. |

## Who gets in

`signInGoogleUser` runs in one transaction, on the verified email Google returns:

1. A known Google account signs in.
2. An email that already belongs to another account is refused.
3. A working invite for the email creates a `grownup` in the inviting family and marks the invite accepted.
4. If no family exists yet and the email is on `ALLOWED_EMAILS`, it creates the first family with this account as owner.
5. Anyone else gets `null`, and the sign-in page says "That Google account is not on the list."

## What happens when

| Situation | What happens |
| --- | --- |
| The invite is 7 days old | It no longer works, and the row reads "Expired". |
| The same email is invited again | The older invite is cancelled and a new one starts. |
| The email fails to send | The invite is deleted, so it neither works nor counts. |
| More than 5 invites in an hour | "Too many emails. Try again in an hour." Cancelled invites still count. |
| The email already has an account | "That Google account already uses Rocket Rewards." |
| A grown-up is removed | Their `user` row goes. Cascades end their sessions and grown-up tokens, and their used invite does not work again. |

## Security

- The invite has no secret: Google proves the person owns the email, and the email itself holds no names of children.
- Every invite and grown-up query is scoped to the family. The one exception is `acceptInvite`, which looks up the verified email at sign-in.
- Anyone in grown-up mode can invite, so the PIN protects this. Removing a grown-up also checks that the signed-in account is the owner.
- Emails are masked on the list and are not logged.

## Tests

- `src/lib/server/invites.test.ts`: who gets in, expiry, cancelling, the hourly limit, removal, and other families.
- `e2e/grown-ups.test.ts`: inviting, being refused, joining, removing, accessibility and other families.
