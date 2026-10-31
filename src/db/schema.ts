import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { EntryKind, Granularity } from '@/core/entries/timing';

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
  updatedAt: integer().notNull(),
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
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
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
});

/** One row per reviewed day (local midnight, epoch ms); each earns the daily review XP. */
export const dayLogs = sqliteTable('day_logs', {
  day: integer().primaryKey(),
  reviewedAt: integer().notNull(),
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
});

/** App preferences as key/value text (appearance, later week start, calm mode…). */
export const settings = sqliteTable('settings', {
  key: text().primaryKey(),
  value: text().notNull(),
});

/** Quick captures without a time (RESEARCH.md #6). Planning one turns it into an entry and removes it here. */
export const inbox = sqliteTable('inbox', {
  id: text().primaryKey(),
  title: text().notNull(),
  createdAt: integer().notNull(),
});
