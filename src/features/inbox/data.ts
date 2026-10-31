import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { getDb } from '@/db/client';
import { inbox } from '@/db/schema';

export type InboxItem = typeof inbox.$inferSelect;

/** Newest first. */
export function useInbox(): InboxItem[] {
  return useLiveQuery(getDb().select().from(inbox).orderBy(desc(inbox.createdAt))).data;
}

export async function addToInbox(title: string) {
  const clean = title.trim().slice(0, 200);
  if (clean) await getDb().insert(inbox).values({ id: randomUUID(), title: clean, createdAt: Date.now() });
}

export async function removeFromInbox(id: string) {
  await getDb().delete(inbox).where(eq(inbox.id, id));
}
