import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { useMemo } from 'react';

import type { EntryKind, Granularity } from '@/core/entries/timing';
import type { TimelineEntry } from '@/core/timeline/layout';
import { getDb } from '@/db/client';
import { entries, layers } from '@/db/schema';
import { LAYER_COLORS, type LayerColor } from '@/ui/theme';

export type Layer = { id: string; name: string; color: LayerColor; visible: boolean };
export type Entry = TimelineEntry & { kind: EntryKind; title: string; granularity: Granularity; done: boolean };
export type EntryDraft = Pick<Entry, 'layerId' | 'kind' | 'title' | 'start' | 'end' | 'granularity'>;

type EntryRow = typeof entries.$inferSelect;
const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  layerId: r.layerId,
  kind: r.kind,
  title: r.title,
  start: r.startAt,
  end: r.endAt,
  granularity: r.granularity,
  done: r.status === 'done',
});

export function useLayers(): Layer[] {
  const { data } = useLiveQuery(getDb().select().from(layers).orderBy(asc(layers.sort)));
  return useMemo(
    () => data.map((r) => ({ id: r.id, name: r.name, visible: r.visible, color: LAYER_COLORS[r.color as keyof typeof LAYER_COLORS] ?? LAYER_COLORS.yellow })),
    [data],
  );
}

// shortcut: loads every entry; switch to the windowed overlap query (ARCHITECTURE.md §3) once people have thousands.
export function useEntries(): Entry[] {
  const { data } = useLiveQuery(getDb().select().from(entries));
  return useMemo(() => data.map(toEntry), [data]);
}

/** One entry for the edit sheet; `undefined` while loading or if it was deleted. */
export function useEntry(id: string | null): Entry | undefined {
  const { data } = useLiveQuery(getDb().select().from(entries).where(eq(entries.id, id ?? '')), [id]);
  return data[0] ? toEntry(data[0]) : undefined;
}

export async function saveEntry(id: string | null, draft: EntryDraft) {
  const now = Date.now();
  const row = { layerId: draft.layerId, kind: draft.kind, title: draft.title, startAt: draft.start, endAt: draft.end, granularity: draft.granularity, updatedAt: now };
  if (id) await getDb().update(entries).set(row).where(eq(entries.id, id));
  else await getDb().insert(entries).values({ ...row, id: randomUUID(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, createdAt: now });
}

export async function deleteEntry(id: string) {
  await getDb().delete(entries).where(eq(entries.id, id));
}

export async function setLayerVisible(id: string, visible: boolean) {
  await getDb().update(layers).set({ visible, updatedAt: Date.now() }).where(eq(layers.id, id));
}
