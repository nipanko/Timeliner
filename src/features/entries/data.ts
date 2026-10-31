import { and, asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { useMemo } from 'react';

import type { EntryKind, Granularity } from '@/core/entries/timing';
import type { TimelineEntry } from '@/core/timeline/layout';
import { getDb } from '@/db/client';
import { entries, focusSessions, layers, milestones } from '@/db/schema';
import { LAYER_COLORS, type IconName, type LayerColor, type LayerColorKey } from '@/ui/theme';

export type Layer = { id: string; name: string; colorKey: LayerColorKey; color: LayerColor; icon: IconName; visible: boolean };
export type Entry = TimelineEntry & { kind: EntryKind; title: string; granularity: Granularity; done: boolean; createdAt: number };
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
  createdAt: r.createdAt,
});

export function useLayers(): Layer[] {
  const { data } = useLiveQuery(getDb().select().from(layers).where(isNull(layers.deletedAt)).orderBy(asc(layers.sort)));
  return useMemo(
    () =>
      data.map((r) => {
        const colorKey = r.color in LAYER_COLORS ? (r.color as LayerColorKey) : 'yellow';
        return { id: r.id, name: r.name, visible: r.visible, colorKey, color: LAYER_COLORS[colorKey], icon: (r.icon ?? 'ellipse') as IconName };
      }),
    [data],
  );
}

// shortcut: loads every entry; switch to the windowed overlap query (ARCHITECTURE.md §3) once people have thousands.
export function useEntries(): Entry[] {
  const { data } = useLiveQuery(getDb().select().from(entries).where(isNull(entries.deletedAt)));
  return useMemo(() => data.map(toEntry), [data]);
}

/** One entry for the edit sheet; `undefined` while loading or if it was deleted. */
export function useEntry(id: string | null): Entry | undefined {
  const { data } = useLiveQuery(getDb().select().from(entries).where(and(eq(entries.id, id ?? ''), isNull(entries.deletedAt))), [id]);
  return data[0] ? toEntry(data[0]) : undefined;
}

export async function saveEntry(id: string | null, draft: EntryDraft) {
  const now = Date.now();
  const row = { layerId: draft.layerId, kind: draft.kind, title: draft.title, startAt: draft.start, endAt: draft.end, granularity: draft.granularity, updatedAt: now };
  if (id) await getDb().update(entries).set(row).where(eq(entries.id, id));
  else await getDb().insert(entries).values({ ...row, id: randomUUID(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, createdAt: now });
}

export async function setDone(id: string, done: boolean) {
  await getDb().update(entries).set({ status: done ? 'done' : 'planned', updatedAt: Date.now() }).where(eq(entries.id, id));
}

export async function deleteEntry(id: string) {
  // Tombstones, not deletes, so the deletion can sync to other devices; children go with the entry.
  const deletedAt = Date.now();
  await getDb().update(focusSessions).set({ deletedAt }).where(eq(focusSessions.entryId, id));
  await getDb().update(milestones).set({ deletedAt }).where(eq(milestones.goalId, id));
  await getDb().update(entries).set({ deletedAt }).where(eq(entries.id, id));
}

export async function setLayerVisible(id: string, visible: boolean) {
  await getDb().update(layers).set({ visible, updatedAt: Date.now() }).where(eq(layers.id, id));
}

export async function updateLayer(id: string, change: { name?: string; color?: LayerColorKey; icon?: IconName }) {
  await getDb().update(layers).set({ ...change, updatedAt: Date.now() }).where(eq(layers.id, id));
}

/** A new layer goes last and starts visible. */
export async function addLayer(name: string, color: LayerColorKey, icon: IconName, sort: number) {
  const now = Date.now();
  await getDb().insert(layers).values({ id: randomUUID(), name, color, icon, sort, visible: true, createdAt: now, updatedAt: now });
}
