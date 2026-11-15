# Run the app locally

You need Node 24, and your secrets files in `~/.config/rocket-rewards/` (`google.env` and `allowed.env`).

1. Install the packages:

   ```
   npm ci
   ```

2. Create `.env` in the repo folder. It is ignored by git. Use this command, because the secrets files have no newline at the end and a plain `cat` would glue lines together:

   ```
   { cat ~/.config/rocket-rewards/google.env; echo; cat ~/.config/rocket-rewards/allowed.env; } | grep -v '^$' > .env
   chmod 600 .env
   ```

3. Make sure the Google client allows the local address. Open the client at https://console.cloud.google.com/apis/credentials (sign-in needed) and check that this redirect URI is listed:

   http://localhost:5173/login/google/callback

4. Start the dev server:

   ```
   npm run dev
   ```

5. Open http://localhost:5173 and choose Continue with Google. Use an email that is in `ALLOWED_EMAILS`.

6. Run the checks before committing:

   ```
   npm run verify
   ```

## Notes

- Restart the dev server after changing `.env`.
- The local database is `data/rocket-rewards.db`. Delete it, and the `-wal` and `-shm` files next to it, to start again from the Welcome screen.
- If Google sign-in fails with `redirect_uri_mismatch`, the redirect in step 3 is missing or has not taken effect yet.
- Without `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, the Continue with Google button returns to the login page with an error line.
