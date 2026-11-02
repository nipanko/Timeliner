import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDb } from '@/db/client';
import { settings } from '@/db/schema';

/** A saved preference, or `fallback` until one is set. */
export function useSetting<T extends string>(key: string, fallback: T): T {
  const { data } = useLiveQuery(getDb().select().from(settings).where(eq(settings.key, key)), [key]);
  return (data[0]?.value as T | undefined) ?? fallback;
}

// The device's own habit, used until the clock is set in Settings.
const DEVICE_12H = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? true;

/** true = 24-hour clock ("21:05"), false = 12-hour with AM/PM ("9:05 PM"). */
export function useClock24(): boolean {
  return useSetting<string>('clock', DEVICE_12H ? '12' : '24') === '24';
}

export async function setSetting(key: string, value: string) {
  await getDb().insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}
