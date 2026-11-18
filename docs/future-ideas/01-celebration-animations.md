# 01. Celebration animations

Status: Idea

## The problem

The app records effort and reward, but the moments that should feel good (a chore accepted, a reward claimed) are plain screen changes. A little fun, excitement and a sense of achievement would make the effort feel noticed.

## The idea

Short, joyful animations at the moments that matter. Everything fits the space theme.

| Moment | Animation |
| --- | --- |
| Chore accepted by a grown-up | Stars burst from the stop and fly into the star count, which ticks up |
| Tap "I did it!" | A small rocket boost, then the calm "Grown-up checking" state |
| Rocket moves to the next stop | The rocket flies along the path to the next stop |
| Last stop done (daily bonus) | The rocket lands on the bonus planet, with confetti and the bonus stars counting up |
| Reward claimed | A gift opens or lifts off, with a "Your grown-up is on the way" feel |
| Rank up | The rocket upgrades with a glow, and the new rank name appears |
| Reward becomes affordable | A gentle sparkle on the reward card |
| New day, new trip | The rocket takes off at the start of the trip |
| Sent back with a kind message | A soft nudge, no negative effect |

## Rules to keep

- Never animate a loss. A claim shows the reward, not stars draining away. This follows "never show a penalty or a loss of stars".
- Respect `prefers-reduced-motion`: show a still version with the same words and icons.
- No flashing or strobing, and never colour alone.
- Short (under about 2 seconds) and skippable by tapping, so a child is never held up.
- Use light CSS or SVG so it runs smoothly on an older tablet.
- Meaning is always carried by words and icons too, not the animation alone.
- Grown-up screens stay calm. Celebrations are for the child's screens.

## Open questions

- Should there be optional sound? If so, off by default, with a grown-up setting.
- Should a grown-up be able to turn animations off in Settings?
- Should the celebration vary with effort (a bigger one for the daily bonus than for one chore)?
- Which animation library, if any, or hand-written CSS and SVG? This would be an ADR.
- Does the child see the celebration at the moment of acceptance (live update, ADR 0006), or the next time they open the trip?

## Notes

- Touches the spec for the trip, daily bonus, rewards and ranks, and the screens in `design/screens/`. New motion needs design approval first, as the screens are the source of truth for appearance.
- No new attack surface: no new route, form, upload or secret.
