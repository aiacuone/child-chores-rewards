# How rewards and meters work

Rewards are what children spend stars on. A grown-up adds them, and each child they are for sees a meter of their stars against the cost (docs/SPEC.md, "Rewards"; Rewards.dc.html, Add-Reward.dc.html, Child-Rewards.dc.html). The rules are in `src/lib/server/rewards.ts`. The cost and meter rules shared with the pages are in `src/lib/rewards.ts`, and the planet colours in `src/lib/reward-planets.ts`.

Claiming, handing out and declining a reward are in [claims.md](claims.md).

## The pages

| Page | Screen | Shows |
| --- | --- | --- |
| `/grown-up/rewards` | Rewards, Rewards-Added | Every reward with a meter for each child it is for. A tap opens its edit form, or its hand-out when a claim is waiting ([claims.md](claims.md)). |
| `/grown-up/rewards/new` | Add-Reward | The reward form. |
| `/grown-up/rewards/<id>/edit` | (not designed: the same form, decided in #26) | The form with the reward's values, and Remove reward below it. |
| `/trip/<child>/rewards` | Child-Rewards | My rewards: the rewards for this child. Opened from the star count on the trip, and "See my rewards" on Trip complete and Nothing to do today. |

Grown-up pages load their data in the browser through `grownupFetch` ([grown-up-mode.md](grown-up-mode.md)). My rewards is a trip page, so it uses the trip layout's child check and live updates ([trip.md](trip.md)).

## The API

| Route | Does |
| --- | --- |
| `GET /api/grown-up/rewards` | The children, every reward with its meters, and the family's `version`. |
| `POST /api/grown-up/rewards` | Add a reward. 201 with its id. |
| `GET /api/grown-up/rewards/<id>` | One reward as the form edits it. |
| `PUT /api/grown-up/rewards/<id>` | Change it and who it is for. 204. |
| `DELETE /api/grown-up/rewards/<id>` | Remove it. 204. |

Every route needs grown-up mode (`requireGrownUp`). A reward from another family, or an id that is not a whole number, is 404. Bad input is 400.

## The data

Two tables ([database.md](database.md)):

- `reward`: the family's reward, with its `name`, `cost` (stars needed) and `colour` (the planet).
- `reward_child`: one row for each child a reward is for ("Who does it?"). A reward can be for nobody yet, as a chore can.

A child's stars are the sum of their `star_event` rows (`balance`, [database.md](database.md)). Rewards never change them: only a hand-out does ([claims.md](claims.md)).

## The functions

| Function | Used by | What it does |
| --- | --- | --- |
| `listRewards(scope)` | the Rewards tab API | Every reward, oldest first, with a meter row for each child it is for (their name, colour and stars), and its first waiting claim. |
| `getReward(scope, id)` | the edit page API | One reward with `childIds`, or `null` if it is not this family's. |
| `addReward(scope, input)` | `POST` | Adds the reward and its children in one transaction. |
| `updateReward(scope, id, input)` | `PUT` | Changes it and makes it for exactly the children picked. False when it is not this family's. |
| `removeReward(scope, id)` | `DELETE` | Removes it, and its children rows with it. Stars stay. |
| `childRewards(scope, child)` | My rewards | The rewards for one child, in My rewards order, each marked `asked` when a claim is waiting. |
| `reachedReward(scope, child)` | Mission control | The dearest reward the child can afford now, or `null`. |
| `meter(stars, cost)` in `src/lib/rewards.ts` | both screens | `{ ready, percent, toGo }`. |

## The meter

`meter(stars, cost)`:

1. `ready` is true when stars have reached the cost.
2. `percent` is stars over cost, from 0 to 100, for the width of the bar.
3. `toGo` is the stars still needed, or 0 when ready.

Both screens show the same three things, so a state is never shown by colour alone:

| | Grown-up's Rewards tab | Child's My rewards |
| --- | --- | --- |
| Not ready | amber bar, "22 to go" | amber bar, "22 stars to go" |
| Ready | teal bar, tick and "Ready", and a "Claimable" pill on the reward | teal bar and "Ready to claim!" |

Every bar is a `role="progressbar"` with a label ("Mia's stars" on the Rewards tab, the reward's name on My rewards) and `aria-valuetext` in words ("70 stars to go", "Ready").

## Order

- **Rewards tab:** oldest first, so a new reward goes at the end, as in Rewards-Added.
- **My rewards:** ready first, then the closest to ready, then the cheapest. Two ready rewards sort by cost.

## Adding, editing and removing

1. The form (`RewardForm.svelte`, with `ChildPicker.svelte` for "Who does it?") sends name, cost, colour and `childIds`.
2. `parseReward` (`src/lib/server/forms/rewards.ts`) checks it with Zod: a name of up to 40 printable characters with no spaces at either end, a whole-number cost from 1 to 1,000, one of the five planet colours, and up to 4 distinct child ids. Bad input is refused, not fixed.
3. `addReward` and `updateReward` first check every child is in this family (`requireChild`), so a reward can never be for another family's child.
4. Remove asks first ("Remove Movie night?"), and says stars stay with the children.

## What happens when

| Situation | What happens |
| --- | --- |
| A child's stars reach a reward's cost | Their meter turns teal with "Ready", and the reward shows "Claimable" for the grown-up. |
| A cost is lowered or raised | Every meter moves at once. Children never lose stars. |
| A child is taken off a reward | That meter goes, and the reward leaves their My rewards. |
| A reward is for nobody | The Rewards tab shows "Nobody yet", and no child sees it. |
| No rewards yet | The Rewards tab says "No rewards yet." and My rewards says "No rewards yet. A grown-up can add some." |
| A reward with a claim waiting is tapped on the Rewards tab | It opens that claim's hand-out. To edit it, answer the claim first. Any other reward opens Edit. |

## Live updates

Triggers bump `family.version` on every change to `reward` and `reward_child` (migration `0013`), and star changes already do ([live-updates.md](live-updates.md)). So the Rewards tab, Mission control and a child's My rewards update within a few seconds when a reward is added, edited or removed, or when stars change.

## Security

- All rewards routes need grown-up mode, and every query goes through `scope.where`, so one family never reads or changes another's rewards.
- My rewards is a trip page: the trip layout answers 404 for another family's child, and `childRewards` throws `NotInFamily` for one.
- Names are plain text, shown with Svelte's escaping. The only free text is the name, checked on the server.

## Temporary fixes

- **No "Use my own photo"** on the reward form, and no photo on the planet, until #36.
- **Who's flying** tiles have no reward line ("3 stops to Movie night", "Reached Park trip today!") yet. The spec does not say how it is worked out.

## Tests

- `src/lib/server/rewards.test.ts`: the meter, listing and My rewards order, adding, changing and removing, rewards for nobody, stars never changing, `reachedReward`, the Zod checks, live-update versions, and another family's rewards and children never reached.
- `e2e/rewards.test.ts`: adding, editing and removing rewards on a phone while a tablet follows, the meters and their words, the star count and "See my rewards" links, and another family getting 404 on every reward route and My rewards.
