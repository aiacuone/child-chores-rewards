# Database migrations

1. Edit `schema.ts` to describe the new structure. No database changes yet.
2. Run `npx drizzle-kit generate`. It writes the SQL file (with a random name), a snapshot and a journal entry. It does not touch the database.
3. Read the SQL, run `npm run verify`, and commit `schema.ts` with everything new in `drizzle/`.
4. Push to `main`. CI runs the tests, then the deploy copies the `drizzle/` folder to the VM and restarts the app.
5. At startup the app runs every migration the database has not had yet, in order, in one transaction.
6. The database now has the new structure and Drizzle records that the migration ran. It never runs it again.
7. If a migration fails, it rolls back, the app does not start, and the deploy restores the previous code.
