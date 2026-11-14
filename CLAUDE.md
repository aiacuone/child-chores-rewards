# Chore Rockets (child-chores-rewards)

A kids chores-and-rewards web app for children aged 5 to 12, for one family's own use. Children fly a rocket along a trip of chores; a grown-up checks each one; finished chores earn stars; stars buy rewards.

## Where things are

- `docs/SPEC.md`: the rules and decisions. This is the source of truth for **behaviour**.
- `design/screens/*.dc.html`: one standalone HTML file per screen. These are the source of truth for **appearance and wording**. Open the file for any screen before building it.
- `design/FLOWS.md`: every user flow, with its screens in order. Use it to find which screens belong together.
- `design/TOKENS.md`: colours, fonts and sizes. Use them as variables.
- `design/canvas.json`: the canvas layout (board positions and titles).

## Ground rules

- It is a **web app** used on a grown-up's phone and a children's tablet. Google sign-in only. No native app, no passwords.
- Match the screen files. Do not invent new screens or change wording without asking. If a screen is missing, check `docs/SPEC.md` ("Not designed yet") and ask.
- The screens are static pictures with links, not working code. State, storage, the 6:00 am reset, the PIN window, photos and ntfy alerts all need to be built.
- Build one flow at a time. Suggested order: grown-up setup, Who's flying, the child's trip and chore screen, "I did it" and grown-up check, rewards and claiming, settings, photos.
- Accessibility is part of the spec: 44 px touch targets, 13 px minimum text, never colour alone, labelled progress bars.
- Children use this app unsupervised. Keep copy kind and short, and never show a penalty or a loss of stars.
- Keep the family's data private: photos and names stay in the family account.

## Open decisions

See "Not designed yet" at the end of `docs/SPEC.md`. Decide these while building and add the answer to the spec.
