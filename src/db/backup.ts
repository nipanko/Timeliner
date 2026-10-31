import { makeBackup, type Backup, type BackupData } from '@/core/backup';

import { getDb } from './client';
import { dayLogs, entries, focusSessions, inbox, layers, milestones, settings } from './schema';

const TABLES = {
  layers,
  entries,
  focus_sessions: focusSessions,
  day_logs: dayLogs,
  milestones,
  settings,
  inbox,
};
// Parents before children when inserting; the reverse when deleting (foreign keys).
const INSERT_ORDER = ['layers', 'entries', 'focus_sessions', 'milestones', 'day_logs', 'settings', 'inbox'] as const;
const CHUNK = 200; // rows per INSERT, well under SQLite's variable limit

export async function exportAll(): Promise<Backup> {
  const db = getDb();
  const data = {} as BackupData;
  for (const name of INSERT_ORDER) data[name] = (await db.select().from(TABLES[name])) as BackupData[typeof name];
  return makeBackup(data, Date.now());
}

/** Replaces everything on this device with a checked backup (see core/backup parseBackup). All or nothing. */
export async function replaceAll(data: BackupData) {
  await getDb().transaction(async (tx) => {
    for (const name of [...INSERT_ORDER].reverse()) await tx.delete(TABLES[name]);
    for (const name of INSERT_ORDER) {
      const rows = data[name];
      for (let i = 0; i < rows.length; i += CHUNK) {
        // Rows were validated against these tables' shapes by parseBackup.
        await tx.insert(TABLES[name]).values(rows.slice(i, i + CHUNK) as never[]);
      }
    }
  });
}
