import { asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { getDb } from '@/db/client';
import { boardItems } from '@/db/schema';

export type BoardItem = typeof boardItems.$inferSelect;
export type BoardKind = BoardItem['kind'];

// shortcut: the board isn't synced yet (images exceed the server's 20 KB row limit); add it with file storage.
export function useBoardItems(): BoardItem[] {
  return useLiveQuery(getDb().select().from(boardItems).where(isNull(boardItems.deletedAt)).orderBy(asc(boardItems.z))).data;
}

/** `id` may be chosen by the caller (to show the item before it is saved). */
export async function addBoardItem({ id = randomUUID(), ...item }: Omit<BoardItem, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { id?: string }) {
  await getDb().insert(boardItems).values({ ...item, id, createdAt: Date.now() });
  return id;
}

export async function updateBoardItem(id: string, patch: Partial<Omit<BoardItem, 'id'>>) {
  await getDb().update(boardItems).set(patch).where(eq(boardItems.id, id));
}

export async function removeBoardItem(id: string) {
  await getDb().update(boardItems).set({ deletedAt: Date.now() }).where(eq(boardItems.id, id));
}
