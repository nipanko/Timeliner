import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';

import * as schema from './schema';

export type Db = ExpoSQLiteDatabase<typeof schema>;

let current: Db | null = null;

/**
 * Opens the database once. Async because on web SQLite runs in a worker that can only start after the page yields.
 * The change listener lets useLiveQuery re-render screens when a table changes.
 */
export async function openDb(): Promise<Db> {
  current ??= drizzle(await openDatabaseAsync('timeliner.db', { enableChangeListener: true }), { schema });
  return current;
}

/** The open database. The root layout renders screens only after `openDb()` finished. */
export function getDb(): Db {
  if (!current) throw new Error('Database is not open yet');
  return current;
}
