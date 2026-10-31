import { isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { expandEntries } from '@/core/entries/repeat';
import { badges, badgeStats } from '@/core/game/badges';
import { focusedMs } from '@/core/game/focus';
import { streak } from '@/core/game/streaks';
import { levelFor, MILESTONE_XP, REVIEW_XP, totalXp } from '@/core/game/xp';
import { getDb } from '@/db/client';
import { completions, dayLogs, entries, focusSessions, milestones } from '@/db/schema';
import { useNow } from '@/hooks/useNow';

/**
 * Everything the game shows: XP, level, streak, badges and focus. All derived from saved data.
 * `ready` is false until every table has loaded once, so nothing celebrates the initial load.
 */
export function useProgress() {
  const db = getDb();
  const e = useLiveQuery(db.select().from(entries).where(isNull(entries.deletedAt)));
  const s = useLiveQuery(db.select().from(focusSessions).where(isNull(focusSessions.deletedAt)));
  const d = useLiveQuery(db.select().from(dayLogs));
  const m = useLiveQuery(db.select().from(milestones).where(isNull(milestones.deletedAt)));
  const c = useLiveQuery(db.select({ id: completions.id }).from(completions).where(isNull(completions.deletedAt)));
  const now = useNow(60_000);

  return useMemo(() => {
    const focused = new Map<string, number>();
    for (const x of s.data) focused.set(x.entryId, (focused.get(x.entryId) ?? 0) + focusedMs(x, now));
    const rows = e.data.map((r) => ({
      id: r.id,
      repeat: r.repeat,
      kind: r.kind,
      start: r.startAt,
      end: r.endAt,
      done: r.status === 'done',
      createdAt: r.createdAt,
      granularity: r.granularity,
    }));
    // Repeats count once per occurrence, from their first one up to today.
    const first = Math.min(now, ...rows.map((r) => r.start));
    const scored = expandEntries(rows, new Set(c.data.map((x) => x.id)), first, now + 86_400_000).map((x) => ({
      ...x,
      // shortcut: focus time is kept per series, so only one-off entries earn the focus bonus; split sessions by occurrence when it matters.
      focusedMs: x.seriesId ? undefined : focused.get(x.id),
    }));
    const xp = totalXp(scored) + REVIEW_XP * d.data.length + MILESTONE_XP * m.data.filter((x) => x.doneAt !== null).length;
    const stats = badgeStats(scored, now);
    return {
      ready: !!(e.updatedAt && s.updatedAt && d.updatedAt && m.updatedAt && c.updatedAt),
      xp,
      level: levelFor(xp),
      streak: streak(scored.filter((x) => x.done && (x.kind === 'task' || x.kind === 'todo')).map((x) => x.start), now),
      badges: badges(stats),
      focusedHours: stats.focusedHours,
    };
  }, [e.data, e.updatedAt, s.data, s.updatedAt, d.data, d.updatedAt, m.data, m.updatedAt, c.data, c.updatedAt, now]);
}
