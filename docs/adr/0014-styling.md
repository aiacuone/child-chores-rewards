# 14. Styling

Status: accepted

## Context

`design/TOKENS.md` holds the colours, fonts and sizes, to be used "as CSS variables or theme values", never copied out of the screen HTML. The screens must be matched, and accessibility is part of the spec:

- 44 px touch targets and 13 px minimum text,
- never colour alone,
- labelled progress bars,
- the current tab and filter marked for screen readers.

The screens need a few interactive parts that are hard to make accessible by hand:

- switches (Notifications, Auto-Lock),
- two pop-up warnings ("Locking soon", "Still there?"),
- a date picker (Skip-Options "Pick a date…", and dates for Once and Monthly chores).

Most other choices are chip rows and full screens. shtrong, price-tracker and markdown-viewer use plain CSS with variables. todo uses Tailwind.

## Options considered

### Option 1: Plain CSS and variables

Tokens as CSS variables in a global stylesheet, with each component's own `<style>` block.

- Matches three existing apps, and reads like the screen files' CSS.
- Switches, dialogs and the date picker built by hand.

### Option 2: Tailwind

Tailwind utility classes with the tokens as theme values.

- Matches todo.
- Long class lists on busy elements.
- Switches, dialogs and the date picker built by hand.

### Option 3: shadcn-svelte

Ready-made components on Tailwind and Bits UI, restyled with the tokens.

- Accessible components ready-made.
- Its default look must be reworked to match the space theme.
- New to the existing apps.

### Option 4: Plain CSS and Bits UI where needed

Plain CSS with variables, plus Bits UI's unstyled components for the date picker, dialogs and switches.

- Accessible behaviour for the hard parts, styled our way.
- Bits UI is new to the existing apps.

### Option 5: Tailwind and Bits UI where needed

Tailwind with the tokens as theme values, plus Bits UI's unstyled components for the date picker, dialogs and switches, styled with Tailwind classes.

- Accessible behaviour for the hard parts, styled our way.
- Matches todo, and stays close to shadcn's examples.
- Long class lists on busy elements, and Bits UI is new to the existing apps.

## Decision

We chose **Option 5: Tailwind and Bits UI where needed**.

- Styling in the markup is preferred, as in todo.
- Bits UI gives an accessible date picker, dialogs and switches without building them by hand.

The strongest alternative was Option 4, plain CSS and Bits UI, which reads more like the screen files.

## Consequences

- The tokens go into Tailwind's theme once, with names from `TOKENS.md` (for example `bg`, `card`, `hi`, `ok`, `amber`). Raw colour or size values in class lists are avoided.
- Bits UI is used only where behaviour is hard: the date picker, dialogs and switches. Everything else is plain markup with Tailwind classes.
- The fonts (Lilita One and Nunito) are set in the theme. Whether to self-host them rather than load them from Google Fonts is a build detail, not decided here.
- Repeated patterns, such as the orange primary button and compact rows, become small Svelte components, so long class lists are written once.
