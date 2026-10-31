/**
 * Sync merge rule (docs/LAUNCH.md §4): last write wins, per row.
 * The server stores an upload only if it is strictly newer than its copy; a device adopts the
 * server's row if it is newer OR equally new. With both rules, two devices always converge.
 */
export type Stamped = { updatedAt: number };

/** Rows from the server that this device should write (new to it, or at least as recent as its copy). */
export function rowsToApply<T extends Stamped>(local: readonly T[], remote: readonly T[], key: (row: T) => string | number): T[] {
  const mine = new Map(local.map((r) => [key(r), r.updatedAt]));
  return remote.filter((r) => {
    const at = mine.get(key(r));
    return at === undefined || r.updatedAt >= at;
  });
}

/** The server side of the rule, for its upsert: accept only strictly newer rows. */
export const serverAccepts = (incoming: Stamped, stored: Stamped | undefined) => !stored || incoming.updatedAt > stored.updatedAt;
