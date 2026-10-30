import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDb } from '@/db/client';
import { dayLogs } from '@/db/schema';

export function useReviewedDays(): number[] {
  return useLiveQuery(getDb().select().from(dayLogs)).data.map((d) => d.day);
}

export async function closeDay(day: number) {
  await getDb().insert(dayLogs).values({ day, reviewedAt: Date.now() }).onConflictDoNothing();
}
