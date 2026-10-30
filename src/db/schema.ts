import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { EntryKind, Granularity } from '@/core/entries/timing';

// Times are epoch milliseconds (UTC). Data model: ARCHITECTURE.md §3.

export const layers = sqliteTable('layers', {
  id: text().primaryKey(),
  name: text().notNull(),
  /** Key into LAYER_COLORS. */
  color: text().notNull(),
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
