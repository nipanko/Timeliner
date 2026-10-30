import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDb } from '@/db/client';
import { settings } from '@/db/schema';

/** A saved preference, or `fallback` until one is set. */
export function useSetting<T extends string>(key: string, fallback: T): T {
  const { data } = useLiveQuery(getDb().select().from(settings).where(eq(settings.key, key)), [key]);
  return (data[0]?.value as T | undefined) ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await getDb().insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}
