# Run the app on your machine

You need Node 24 and git.

## Quick start, with no Google account set up

1. Get the code and install it:

   ```
   git clone https://github.com/aiacuone/rocket-rewards.git
   cd rocket-rewards
   npm ci
   ```

2. Copy the settings file:

   ```
   cp .env.example .env
   ```

3. In `.env`, set `TEST_ROUTES=1`.

4. Start the app:

   ```
   npm run dev
   ```

5. Open http://localhost:5173/test/sign-in. It signs you in to a test family with two children, Mia and Leo. The grown-up PIN is `1234`.

With `TEST_ROUTES=1`, emails and alerts are kept in memory and not sent. You can read them at http://localhost:5173/test/outbox.

## Use real Google sign-in

1. In https://console.cloud.google.com/apis/credentials (sign-in needed), create an OAuth client of type "Web application".
2. Add this redirect address:

   ```
   http://localhost:5173/login/google/callback
   ```

3. Put the client's ID and secret in `.env`, and put your Google email in `ALLOWED_EMAILS`.
4. Remove `TEST_ROUTES=1`, restart the app, and open http://localhost:5173. The first listed account to sign in starts the family.

## Settings

| Setting | Needed for | Notes |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in | Sign-in stays off without both. |
| `ALLOWED_EMAILS` | The first family | Everyone else joins by invite. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Invites, recovery links and PIN reset codes | The password is a Gmail app password. |
| `TEST_ROUTES` | The test sign-in and Playwright | Works only on localhost. Never set it on the server. |
| `DATABASE_FILE` | A different database file | Defaults to `data/rocket-rewards.db`. |

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the app at http://localhost:5173. |
| `npm run check` | Checks types. |
| `npm test` | Runs the unit tests. |
| `npm run verify` | Runs the type check, the build and the unit tests. |
| `npx playwright install chromium` | Installs the browser for the browser tests, once. |
| `npm run test:e2e` | Builds the app and runs the browser tests. |

## Things to know

- **Restart `npm run dev` after pulling or making a database change.** Database changes run only when the server starts. Until then, a screen that needs a new table can stay empty, and the PIN pad can wrongly say "Wrong PIN".
- Your local data is in `data/`, which git ignores. To start again, stop the app and delete that folder.
- To change the database, follow [migrations.md](migrations.md).
