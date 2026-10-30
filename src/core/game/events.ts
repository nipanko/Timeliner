/** What the player has, as of one moment. */
export type ProgressSnapshot = { xp: number; level: number; badges: readonly string[] };

export type ProgressEvent = { type: 'xp'; amount: number } | { type: 'level'; level: number } | { type: 'badge'; id: string };

/**
 * What changed between two snapshots, for celebrations (ARCHITECTURE.md §11: core decides, UI shows).
 * Only gains are celebrated; undoing something is silent.
 */
export function progressEvents(before: ProgressSnapshot, after: ProgressSnapshot): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  if (after.xp > before.xp) events.push({ type: 'xp', amount: after.xp - before.xp });
  if (after.level > before.level) events.push({ type: 'level', level: after.level });
  for (const id of after.badges) if (!before.badges.includes(id)) events.push({ type: 'badge', id });
  return events;
}
