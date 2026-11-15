# 1. App stack

Status: accepted

## Context

We needed a framework for both the screens and the server code behind them. The app is a web app used on a grown-up's phone and a children's tablet, with no installs.

Some features need a server, not only a browser:

- emailing the one-time PIN reset code and the grown-up invites,
- storing photos in the family account so they show on every signed-in device,
- signing out all other devices.

So a browser-only app with no server was ruled out.

The screens in `design/screens/` are static pictures with hard-coded inline styles, and `design/TOKENS.md` says not to copy values out of them. They are rebuilt with the design tokens whatever the framework, so the designs favour none of them.

We checked the project's most interactive screens (photo move and zoom, the skip date picker, switches, dialogs, tabs, the rank ladder) for anything a React-only library would handle much better. Nothing needs one badly enough to switch:

- React has a small edge for the photo cropper and for mature accessible widgets.
- Svelte has a cropper port and Bits UI, and Cropper.js works with any framework.
- Sign-in, email, ntfy, photo resizing, repeat rules, live updates and the installable web app work the same either way.

## Options considered

### Option 1: SvelteKit

One SvelteKit project holds the pages, the server routes and any background jobs, and runs as a Node server.

- Pages, server code and jobs in one codebase and one deploy.
- Small page bundles, kinder to an older kids' tablet.
- Matches three existing apps (shtrong, todo, price-tracker), and the Node server setup that shtrong and price-tracker already run.
- Fewer ready-made component libraries than React.

### Option 2: Next.js

One Next.js (App Router) project with React pages and server actions or route handlers.

- The largest ecosystem of components and examples.
- Easy to host on Netlify or Vercel.
- Used before in transcripts.
- Server components and the App Router's caching add moving parts that are easy to get wrong.
- Markup needs converting to JSX.

### Option 3: Svelte app and a separate API

A Svelte app built with Vite for the screens, plus a separate small API server (for example Hono).

- A clean split between screens and server.
- Two projects to build, deploy and keep in step.
- Sign-in cookies across two addresses need extra setup.

### Option 4: Svelte app on Firebase

A Svelte app with no server of its own. Firebase handles sign-in, the database, photos, and email and alerts through Cloud Functions.

- No server to patch or keep running.
- Live updates between devices built in.
- Settles the database, hosting, sign-in and photo storage decisions all at once.
- Needs the pay-as-you-go Blaze plan for Functions and new Storage.
- Locks data, photos and sign-in into one vendor.
- Backups need extra setup.
- New to all the existing apps.

## Decision

We chose **Option 1: SvelteKit**.

- Pages, server code and jobs live in one project with one deploy.
- Nothing in the project needs a React library badly enough to switch.

The strongest alternative was Option 2, Next.js, for React's larger ecosystem.

## Consequences

- Fewer ready-made components than React. The photo cropper and accessible widgets (date picker, switches, dialogs, tabs) come from smaller Svelte libraries such as Bits UI and svelte-easy-crop, framework-agnostic ones such as Cropper.js, or native inputs.
- The app needs a running Node server, which shapes [Decision 4: Hosting and deploy](https://github.com/aiacuone/child-chores-rewards/issues/1). It rules out purely static hosting.
- Live updates between devices have to be built (for example with server-sent events). They don't come for free as they would with Firebase.
