/**
 * Backup file format (Settings › Your data). A backup is a plain JSON copy of every table.
 * Importing is a trust boundary: the file may be edited, truncated or not ours at all,
 * so everything is checked before a single row touches the database.
 */

type Field = 's' | 's?' | 'i' | 'i?' | 'i~' | 'b'; // string, integer, boolean; ? = may be null; ~ = left out when missing (the database fills it)
const SHAPES = {
  layers: { id: 's', name: 's', color: 's', icon: 's?', sort: 'i', visible: 'b', createdAt: 'i', updatedAt: 'i', deletedAt: 'i?' },
  entries: { id: 's', layerId: 's', kind: 's', title: 's', startAt: 'i', endAt: 'i?', granularity: 's', tz: 's', status: 's', repeat: 's?', createdAt: 'i', updatedAt: 'i', deletedAt: 'i?' },
  focus_sessions: { id: 's', entryId: 's', startedAt: 'i', endedAt: 'i?', pausedMs: 'i', pausedAt: 'i?', updatedAt: 'i~', deletedAt: 'i?' },
  day_logs: { day: 'i', reviewedAt: 'i', updatedAt: 'i~' },
  milestones: { id: 's', goalId: 's', title: 's', sort: 'i', doneAt: 'i?', createdAt: 'i', updatedAt: 'i~', deletedAt: 'i?' },
  settings: { key: 's', value: 's', updatedAt: 'i~' },
  inbox: { id: 's', title: 's', createdAt: 'i', updatedAt: 'i~', deletedAt: 'i?' },
  completions: { id: 's', entryId: 's', occurrenceStart: 'i', doneAt: 'i', updatedAt: 'i~', deletedAt: 'i?' },
} as const satisfies Record<string, Record<string, Field>>;

export type TableName = keyof typeof SHAPES;
export const TABLES = Object.keys(SHAPES) as TableName[];
export type Row = Record<string, string | number | boolean | null>;
export type BackupData = Record<TableName, Row[]>;
export type Backup = { app: 'timeliner'; format: 1; exportedAt: number; data: BackupData };

const ENUMS: Partial<Record<string, readonly string[]>> = {
  kind: ['task', 'todo', 'note', 'reminder'],
  granularity: ['moment', 'day', 'week', 'month', 'year'],
  status: ['planned', 'done', 'cancelled'],
};
const MAX_ROWS = 200_000;
const MAX_TEXT = 2_000;

export function makeBackup(data: BackupData, exportedAt: number): Backup {
  return { app: 'timeliner', format: 1, exportedAt, data };
}

export type Parsed = { ok: true; backup: Backup; counts: Record<TableName, number> } | { ok: false; error: string };

/** Reads and checks a backup file's text. Unknown fields are dropped; anything wrong rejects the whole file. */
export function parseBackup(text: string): Parsed {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not a TIMELINER backup (not valid JSON).' };
  }
  if (!isObject(raw) || raw.app !== 'timeliner' || !isObject(raw.data)) return { ok: false, error: 'This file is not a TIMELINER backup.' };
  if (raw.format !== 1) return { ok: false, error: 'This backup was made by a newer version of TIMELINER. Update the app first.' };
  const exportedAt = typeof raw.exportedAt === 'number' ? raw.exportedAt : 0;

  const data = {} as BackupData;
  let total = 0;
  for (const table of TABLES) {
    const rows = raw.data[table] ?? [];
    if (!Array.isArray(rows)) return { ok: false, error: `Damaged backup: "${table}" is not a list.` };
    total += rows.length;
    if (total > MAX_ROWS) return { ok: false, error: 'This backup is too large to import.' };
    const clean: Row[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = cleanRow(rows[i], SHAPES[table]);
      if (typeof row === 'string') return { ok: false, error: `Damaged backup: ${table} row ${i + 1}: ${row}.` };
      clean.push(row);
    }
    data[table] = clean;
  }

  // Links must point at rows in the same file, or the database would end up inconsistent.
  if (!data.layers.length) return { ok: false, error: 'Damaged backup: it has no layers.' };
  const layerIds = new Set(data.layers.map((r) => r.id));
  const entryIds = new Set(data.entries.map((r) => r.id));
  if (data.entries.some((r) => !layerIds.has(r.layerId))) return { ok: false, error: 'Damaged backup: an entry belongs to a missing layer.' };
  if (data.focus_sessions.some((r) => !entryIds.has(r.entryId))) return { ok: false, error: 'Damaged backup: a focus session belongs to a missing entry.' };
  if (data.milestones.some((r) => !entryIds.has(r.goalId))) return { ok: false, error: 'Damaged backup: a milestone belongs to a missing goal.' };
  if (data.completions.some((r) => !entryIds.has(r.entryId))) return { ok: false, error: 'Damaged backup: a completed repeat belongs to a missing entry.' };
  for (const table of TABLES) {
    const key = table === 'day_logs' ? 'day' : table === 'settings' ? 'key' : 'id';
    const seen = new Set(data[table].map((r) => r[key]));
    if (seen.size !== data[table].length) return { ok: false, error: `Damaged backup: duplicate rows in ${table}.` };
  }

  const counts = Object.fromEntries(TABLES.map((t) => [t, data[t].length])) as Record<TableName, number>;
  return { ok: true, backup: makeBackup(data, exportedAt), counts };
}

function cleanRow(value: unknown, shape: Record<string, Field>): Row | string {
  if (!isObject(value)) return 'not an object';
  const row: Row = {};
  for (const [name, field] of Object.entries(shape)) {
    const v = value[name];
    const optional = field.endsWith('?');
    if (v === null || v === undefined) {
      if (field.endsWith('~')) continue; // backups from before 1 Nov 2026 lack these
      if (!optional) return `"${name}" is missing`;
      row[name] = null;
      continue;
    }
    const base = field[0];
    if (base === 's' && (typeof v !== 'string' || v.length > MAX_TEXT)) return `"${name}" must be text`;
    if (base === 'i' && (typeof v !== 'number' || !Number.isSafeInteger(v))) return `"${name}" must be a whole number`;
    if (base === 'b' && typeof v !== 'boolean') return `"${name}" must be true or false`;
    const allowed = ENUMS[name];
    if (allowed && !allowed.includes(v as string)) return `"${name}" has an unknown value`;
    row[name] = v as string | number | boolean;
  }
  return row;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
