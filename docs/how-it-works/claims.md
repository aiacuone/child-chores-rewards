# How reward claims work

A child asks for a reward they have enough stars for, and a grown-up hands it out or declines it (docs/SPEC.md, "Rewards"; [ADR 0003](../adr/0003-data-model-for-stars.md); [ADR 0009](../adr/0009-ntfy-alerts.md); design/FLOWS.md, "A child claims a reward" and "A grown-up declines a reward claim"). The rules are in `src/lib/server/claims.ts`. The decline wording is in `src/lib/claims.ts`.

The key rule: **stars are taken only when a grown-up confirms.** A claim never changes a balance.

## The flow

1. **Claim.** On My rewards, a reward with enough stars shows "Ready to claim!" and a Claim button. The child taps it and sees "Asked a grown-up!".
2. **Alert.** Every grown-up gets "A reward was claimed" ("A child wants a reward. Open Rocket Rewards to hand it out."), with no names. A tap opens the PIN pad, then that claim's hand-out screen.
3. **Hand out.** The grown-up sees the reward, who, the cost and "Mia's stars 40 → 15", and taps "Yes, I handed it out". The cost comes off the child's stars.
4. **Or decline.** "Not now" offers three kind messages or the grown-up's own. No stars move, and the child can ask again straight away.
5. **The child sees the answer once** on My rewards: "Extra screen time handed out! −25 stars", or "Grown-up says: “Maybe on the weekend!” Your stars are safe."

## The pages

| Page | Screen | Shows |
| --- | --- | --- |
| `/trip/<child>/rewards` | Child-Rewards, -Claimed, -Declined | My rewards, with Claim buttons, "Asked a grown-up!" and the answer ([rewards.md](rewards.md)). |
| `/trip/<child>/rewards/<reward>/asked` | Claim-Waiting | "Asked a grown-up!", while this child's claim for the reward is waiting. |
| `/grown-up/claim/<claim>` | Claim-Parent | The hand-out screen. |
| `/grown-up/claim/<claim>/decline` | Claim-Decline | Pick a message. |
| `/grown-up` | Parent-Home | "N rewards to hand out" on Mission control. |
| `/grown-up/rewards` | Rewards-Claimed, -Declined | The notice after an answer. A reward with a claim waiting opens its hand-out; any other opens Edit. |

## The API

| Route | Does |
| --- | --- |
| `GET /api/grown-up/claims/<id>` | One claim: the reward, the child, its status, the declined message, and the child's stars now. |
| `POST /api/grown-up/claims/<id>` | `{ "action": "handOut" }` or `{ "action": "decline", "message": "…" }`. 204 when saved. 409 when it no longer fits, with `{ "reason": "short" }` when the child no longer has the stars. |

Both need grown-up mode. A claim from another family, or an id that is not a whole number, is 404. Bad input is 400, checked with Zod in `src/lib/server/forms/claims.ts` (a message is up to 100 printable characters, as for a sent-back chore). The child's own Claim is a form action on the My rewards page, not an API route.

## The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `claimReward(scope, child, reward)` | the My rewards `?/claim` action | Makes a waiting claim. Returns its id and whether it is new, or `null` when the reward is not for the child or they cannot afford it. |
| `waitingClaim(scope, child, reward)` | the Asked page | The child's waiting claim for a reward. |
| `waitingClaims(scope)` | Mission control, the Rewards tab, My rewards | Every claim waiting for a grown-up, oldest first. |
| `claimDetails(scope, claim)` | the hand-out pages and notices | One claim with its reward, child and the child's stars. `null` if it is not this family's. |
| `handOut(scope, claim)` | `POST` | Takes the cost as one `star_event` row and closes the claim. Returns `'ok'`, `'short'` or `'gone'`. |
| `decline(scope, claim, message)` | `POST` | Closes the claim with the message. False when it is not waiting. |
| `claimNotice(scope, child)` | My rewards | The newest answer the child has not seen yet. |
| `clearClaimNotices(scope, child, upTo)` | My rewards `?/seen` | Marks answers up to that one as seen. |

## Rules in detail

**Claiming (`claimReward`)** runs in one transaction:

1. The reward must be for the child (`reward_child`), in this family, and the child's balance must be at least its cost.
2. The claim is inserted with `onConflictDoNothing`. A partial unique index on `(reward_id, child_id)` where the status is `waiting` lets a child have only one waiting claim for a reward, so a double tap finds the first one. Only a new claim sends an alert.
3. After a hand-out or a decline the claim is no longer `waiting`, so the child can claim again.

**Handing out (`handOut`)** runs in one transaction:

1. The claim must still be `waiting`, or the answer is `'gone'` (another grown-up answered it first, or its reward was removed).
2. The child's balance must be at least the reward's **current** cost, or the answer is `'short'`. This keeps stars from going below 0 when the balance dropped after the claim (for example a chore accept was undone). The grown-up sees "Mia doesn't have enough stars for this now.", and "Yes, I handed it out" is disabled. "Not now" still works.
3. `addStars` writes one row of kind `reward` (stored negative, source: the claim's id), and the claim becomes `handed_out` with the stars taken.

The cost is read at the moment of the hand-out, so editing a reward's cost while a claim waits changes what is taken. The screen shows the same cost.

## "Seen once"

The answer shows on My rewards once, like "checked!" on the trip ([checking.md](checking.md)):

- The page's `load` reads the newest unseen answer (`claimNotice`) without changing it. Link preloading can run `load` without the page showing, so reading must not use it up.
- When the page shows it, the page posts `?/seen` with the claim's id, and `clearClaimNotices` sets `seen_at` on the child's answered claims up to it.

## What happens when

| Situation | What happens |
| --- | --- |
| The child taps Claim twice | One claim and one alert. The second tap lands on "Asked a grown-up!" again. |
| A grown-up answers while the child is on "Asked a grown-up!" | The page refreshes by itself ([live-updates.md](live-updates.md)) and goes to My rewards, where the answer shows. |
| Two grown-ups answer at once | One wins. The other's screen leaves the claim, or gets 409. |
| The reward is removed while a claim waits | The claim goes with it (`ON DELETE CASCADE`). |
| The child is taken off the reward | The claim still stands. The grown-up decides. |
| The child's stars drop below the cost before the hand-out | The hand-out is refused (`'short'`). |
| A child claims two rewards, and the stars only cover one | Both claims wait. Whichever is handed out first uses the stars, and the other is then refused as `'short'`. |
| The reward is handed out, and the child wants it again | The reward stays in the library. The child can claim it again when their stars reach the cost. |

## Live updates

Triggers bump `family.version` on every change to `reward_claim` (migration `0015`). A new claim appears in "N rewards to hand out" within a few seconds, and an answer reaches the child's tablet the same way.

## Security

- The grown-up routes need grown-up mode, and every query goes through `scope.where` and checks the reward's and the child's family too, so one family never reads or answers another's claims.
- The child's Claim is a form action: SvelteKit checks the request's origin. The action only works for a child in the signed-in family and a reward that is for that child, and `claimReward` returns `null` for anything else.
- Stars are only written by `handOut`, inside a transaction that first checks the claim and the balance.
- The alert carries no names, only the claim's id in its link ([ADR 0009](../adr/0009-ntfy-alerts.md)).

## Temporary fixes

- **The alert is always on** until Settings gives each alert a switch (#31).
- A hand-out cannot be undone. Only chore accepts have an undo in the spec.

## Tests

- `src/lib/server/claims.test.ts`: who may claim, no stars taken at a claim, a double tap, handing out once and its star row, the cost at hand-out, refusing a hand-out when the stars have gone, claiming again, the reward being removed, declining and "seen once", the Zod checks, live-update versions, and another family's claims never claimed, read or answered.
- `e2e/claim.test.ts`: the whole flow on a tablet and a phone (Claim, the alert, the PIN from its link, Mission control, hand-out, decline, the answer shown once), a hand-out refused when the stars are gone, and another family getting 404 or a redirect everywhere.
