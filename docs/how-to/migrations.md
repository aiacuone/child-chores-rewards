# Database migrations

1. Edit `schema.ts` to describe the new structure. No database changes yet.
2. Run `npx drizzle-kit generate`. It writes the SQL file (with a random name), a snapshot and a journal entry. It does not touch the database.
3. Read the SQL, run `npm run verify`, and commit `schema.ts` with everything new in `drizzle/`.
4. Push to `main`. CI runs the tests, then the deploy copies the `drizzle/` folder to the VM and restarts the app.
5. At startup the app runs every migration the database has not had yet, in order, in one transaction.
6. The database now has the new structure and Drizzle records that the migration ran. It never runs it again.
7. If a migration fails, it rolls back, the app does not start, and the deploy restores the previous code.

## Hand-written migrations

Some things cannot be described in `schema.ts`, such as triggers (for example `drizzle/0010_live_version.sql`, which bumps `family.version`). Write those by hand:

1. Make an empty migration with a name:

   ```
   npx drizzle-kit generate --custom --name <short_name>
   ```

   It writes `drizzle/00NN_<short_name>.sql`, a snapshot and a journal entry.
2. Write the SQL in that file. Put `--> statement-breakpoint` on its own line between statements, because each one is run on its own.
3. Keep comments inside a statement's chunk, such as above the first statement. A chunk that holds only a comment fails, because it has no SQL to run.
4. Carry on from step 3 above: run `npm run verify` (the tests build a fresh database from every migration) and commit everything new in `drizzle/`.
