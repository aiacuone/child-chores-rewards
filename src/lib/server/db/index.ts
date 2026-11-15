import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

/** Open a SQLite database file, apply any pending migrations and return it. */
export function openDatabase(file: string) {
	if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
	const sqlite = new Database(file);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
	return { db, sqlite };
}

export { schema };
