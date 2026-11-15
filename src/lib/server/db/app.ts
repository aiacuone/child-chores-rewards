import { DATABASE_FILE } from '$app/env/private';
import { openDatabase, type Db } from './index';

let instance: ReturnType<typeof openDatabase> | undefined;

/** The app's database, opened on first use. */
export function getDb(): Db {
	instance ??= openDatabase(DATABASE_FILE);
	return instance.db;
}
