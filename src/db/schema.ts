import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { EntryKind, Granularity } from '@/core/entries/timing';

// Sync (docs/LAUNCH.md §4): every row knows when it last changed (stamped by Drizzle on each insert / update),
// and rows that can be deleted keep a tombstone (`deletedAt`) so the deletion reaches other devices.
const changed = () => integer().notNull().$defaultFn(() => Date.now()).$onUpdateFn(() => Date.now());
// Columns added to existing tables need a SQL default for the old rows (backfilled in the migration).
const stamped = () => changed().default(0);
const tombstone = () => integer();

// Times are epoch milliseconds (UTC). Data model: ARCHITECTURE.md §3.

export const layers = sqliteTable('layers', {
  id: text().primaryKey(),
  name: text().notNull(),
  /** Key into LAYER_COLORS. */
  color: text().notNull(),
  /** Ionicons name; null falls back to a dot. */
  icon: text(),
  sort: integer().notNull(),
  visible: integer({ mode: 'boolean' }).notNull().default(true),
  createdAt: integer().notNull(),
  updatedAt: changed(),
  deletedAt: tombstone(),
});

export const entries = sqliteTable('entries', {
  id: text().primaryKey(),
  layerId: text()
    .notNull()
    .references(() => layers.id),
  kind: text().$type<EntryKind>().notNull(),
  title: text().notNull(),
  startAt: integer().notNull(),
  endAt: integer(),
  granularity: text().$type<Granularity>().notNull(),
  /** IANA zone the entry was made in, so "November" stays November when travelling. */
  tz: text().notNull(),
  status: text().$type<'planned' | 'done' | 'cancelled'>().notNull().default('planned'),
  /** Repeat rule (core/entries/repeat.ts): null, "daily" or "weekly:1,3,5". */
  repeat: text(),
  createdAt: integer().notNull(),
  updatedAt: changed(),
  deletedAt: tombstone(),
});

/** One run of focus on a task; actual time feeds the calibration bonus (RESEARCH.md #2). */
export const focusSessions = sqliteTable('focus_sessions', {
  id: text().primaryKey(),
  entryId: text()
    .notNull()
    .references(() => entries.id, { onDelete: 'cascade' }),
  startedAt: integer().notNull(),
  endedAt: integer(),
  pausedMs: integer().notNull().default(0),
  pausedAt: integer(),
  updatedAt: stamped(),
  deletedAt: tombstone(),
});

/** One row per reviewed day (local midnight, epoch ms); each earns the daily review XP. */
export const dayLogs = sqliteTable('day_logs', {
  day: integer().primaryKey(),
  reviewedAt: integer().notNull(),
  updatedAt: stamped(),
});

/** Stops on a goal's branch (Journey). A goal is a task covering a month or a year. */
export const milestones = sqliteTable('milestones', {
  id: text().primaryKey(),
  goalId: text()
    .notNull()
    .references(() => entries.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  sort: integer().notNull(),
  doneAt: integer(),
  createdAt: integer().notNull(),
  updatedAt: stamped(),
  deletedAt: tombstone(),
});

/** App preferences as key/value text (appearance, later week start, calm mode…). */
export const settings = sqliteTable('settings', {
  key: text().primaryKey(),
  value: text().notNull(),
  updatedAt: stamped(),
});

/** Quick captures without a time (RESEARCH.md #6). Planning one turns it into an entry and removes it here. */
export const inbox = sqliteTable('inbox', {
  id: text().primaryKey(),
  title: text().notNull(),
  createdAt: integer().notNull(),
  updatedAt: stamped(),
  deletedAt: tombstone(),
});

/** One finished occurrence of a repeating entry (the series itself stays planned). Undo = tombstone. */
export const completions = sqliteTable('completions', {
  /** `${entryId}@${occurrenceStart}`, the same id the occurrence has on the timeline. */
  id: text().primaryKey(),
  entryId: text()
    .notNull()
    .references(() => entries.id, { onDelete: 'cascade' }),
  occurrenceStart: integer().notNull(),
  doneAt: integer().notNull(),
  updatedAt: changed(),
  deletedAt: tombstone(),
});
