import { eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { useMemo } from 'react';

import { focusedMs, type FocusSession } from '@/core/game/focus';
import { getDb } from '@/db/client';
import { focusSessions } from '@/db/schema';

export type Session = FocusSession & { id: string; entryId: string };

export function useSessions(): Session[] {
  return useLiveQuery(getDb().select().from(focusSessions).where(isNull(focusSessions.deletedAt))).data;
}

/** Total focused time per entry, for the calibration bonus. */
export function useFocusedByEntry(now: number): Map<string, number> {
  const sessions = useSessions();
  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const s of sessions) totals.set(s.entryId, (totals.get(s.entryId) ?? 0) + focusedMs(s, now));
    return totals;
  }, [sessions, now]);
}

export async function startSession(entryId: string) {
  await getDb().insert(focusSessions).values({ id: randomUUID(), entryId, startedAt: Date.now() });
}

export async function pauseSession(s: Session) {
  await getDb().update(focusSessions).set({ pausedAt: Date.now() }).where(eq(focusSessions.id, s.id));
}

export async function resumeSession(s: Session) {
  if (s.pausedAt === null) return;
  await getDb().update(focusSessions).set({ pausedMs: s.pausedMs + Date.now() - s.pausedAt, pausedAt: null }).where(eq(focusSessions.id, s.id));
}

export async function endSession(s: Session) {
  const now = Date.now();
  const pausedMs = s.pausedMs + (s.pausedAt !== null ? now - s.pausedAt : 0);
  await getDb().update(focusSessions).set({ endedAt: now, pausedMs, pausedAt: null }).where(eq(focusSessions.id, s.id));
}
