import { asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';

import { getDb } from '@/db/client';
import { milestones } from '@/db/schema';

export type Milestone = typeof milestones.$inferSelect;

export function useMilestones(): Milestone[] {
  return useLiveQuery(getDb().select().from(milestones).where(isNull(milestones.deletedAt)).orderBy(asc(milestones.sort))).data;
}

export async function addMilestone(goalId: string, title: string, sort: number) {
  await getDb().insert(milestones).values({ id: randomUUID(), goalId, title, sort, createdAt: Date.now() });
}

export async function setMilestoneReached(m: Milestone, reached: boolean) {
  await getDb().update(milestones).set({ doneAt: reached ? Date.now() : null }).where(eq(milestones.id, m.id));
}

export async function deleteMilestone(m: Milestone) {
  await getDb().update(milestones).set({ deletedAt: Date.now() }).where(eq(milestones.id, m.id));
}
