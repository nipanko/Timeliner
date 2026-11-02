import { gt, inArray } from 'drizzle-orm';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

import { syncOnce, type Change, type LocalSide, type RemoteSide, type SyncState } from '@/core/sync';
import { supabase } from '@/lib/supabase';

import { getDb } from './client';
import { completions, dayLogs, entries, focusSessions, inbox, layers, milestones, settings } from './schema';

// Parents before children, so rows arriving together are written in a valid order.
const TABLES = [
  { name: 'layers', table: layers, key: 'id' },
  { name: 'entries', table: entries, key: 'id' },
  { name: 'completions', table: completions, key: 'id' },
  { name: 'focus_sessions', table: focusSessions, key: 'id' },
  { name: 'milestones', table: milestones, key: 'id' },
  { name: 'day_logs', table: dayLogs, key: 'day' },
  { name: 'settings', table: settings, key: 'key' },
  { name: 'inbox', table: inbox, key: 'id' },
] as const;
type Spec = (typeof TABLES)[number];
const byName = new Map<string, Spec>(TABLES.map((t) => [t.name, t]));
const PAGE = 500; // the server takes at most 500 rows per upload

// Drizzle's typed builders can't be indexed generically; these helpers keep the casts in one place.
const col = (t: Spec, name: string) => (t.table as unknown as Record<string, Parameters<typeof gt>[0]>)[name];
const keyOf = (t: Spec, row: Record<string, unknown>) => String(row[t.key]);
const keyValue = (t: Spec, key: string) => (t.key === 'day' ? Number(key) : key);

const local: LocalSide = {
  async changedSince(since) {
    const out: Change[] = [];
    for (const t of TABLES) {
      const rows = (await getDb().select().from(t.table).where(gt(col(t, 'updatedAt'), since))) as Record<string, unknown>[];
      for (const row of rows) out.push({ table: t.name, key: keyOf(t, row), updatedAt: Number(row.updatedAt), data: row });
    }
    return out;
  },
  async stamps(changes) {
    const found = new Map<string, number>();
    for (const t of TABLES) {
      const keys = changes.filter((c) => c.table === t.name).map((c) => keyValue(t, c.key));
      for (let i = 0; i < keys.length; i += PAGE) {
        const rows = (await getDb().select().from(t.table).where(inArray(col(t, t.key), keys.slice(i, i + PAGE)))) as Record<string, unknown>[];
        for (const row of rows) found.set(`${t.name}:${keyOf(t, row)}`, Number(row.updatedAt));
      }
    }
    return found;
  },
  async apply(changes) {
    for (const t of TABLES) {
      for (const c of changes) {
        if (c.table !== t.name) continue;
        // Written as received, updatedAt included, so the server's version stays the newest everywhere.
        const data = c.data as never;
        await getDb().insert(t.table).values(data).onConflictDoUpdate({ target: col(t, t.key) as never, set: data });
      }
    }
  },
};

const remote: RemoteSide = {
  async push(changes) {
    if (!supabase) return;
    for (let i = 0; i < changes.length; i += PAGE) {
      const rows = changes.slice(i, i + PAGE).map(({ table, key, updatedAt, data }) => ({ table, key, updatedAt, data }));
      const { error } = await supabase.rpc('push_rows', { rows });
      if (error) throw error;
    }
  },
  async pull(cursor) {
    if (!supabase) return { changes: [], cursor };
    const { data, error } = await supabase.from('sync_rows').select('tbl, row_key, data, updated_at, seq').gt('seq', cursor).order('seq').limit(PAGE);
    if (error) throw error;
    const rows = (data ?? []).filter((r) => byName.has(r.tbl));
    return {
      changes: rows.map((r) => ({ table: r.tbl, key: r.row_key, updatedAt: Number(r.updated_at), data: r.data })),
      cursor: data?.length ? Number(data[data.length - 1].seq) : cursor,
    };
  },
};

// Where this device is, per account (a different account on the same device starts fresh).
const kv = Platform.OS === 'web' ? { getItem: async (k: string) => localStorage.getItem(k), setItem: async (k: string, v: string) => localStorage.setItem(k, v) } : Storage;
const stateKey = (userId: string) => `timeliner-sync:${userId}`;

let running: Promise<number> | null = null;

/** One sync round for this account; overlapping calls share the same round. Resolves to when it finished. */
export function syncNow(userId: string): Promise<number> {
  running ??= (async () => {
    try {
      const saved = await kv.getItem(stateKey(userId));
      const state: SyncState = saved ? JSON.parse(saved) : { pushedUpTo: 0, pulledCursor: 0 };
      const next = await syncOnce(local, remote, state, Date.now());
      await kv.setItem(stateKey(userId), JSON.stringify(next));
      return Date.now();
    } finally {
      running = null;
    }
  })();
  return running;
}
