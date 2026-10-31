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

/** One synced row: which table, its key there, and the row itself (including updatedAt / deletedAt). */
export type Change = { table: string; key: string; updatedAt: number; data: Record<string, unknown> };
export const changeId = (c: Pick<Change, 'table' | 'key'>) => `${c.table}:${c.key}`;

export interface LocalSide {
  /** Rows (tombstones included) changed after `since`, by this device's clock. */
  changedSince(since: number): Promise<Change[]>;
  /** updatedAt of the given rows on this device, by changeId; missing = not on this device. */
  stamps(changes: readonly Change[]): Promise<Map<string, number>>;
  /** Writes rows from the server as they are (keeping their updatedAt). */
  apply(changes: readonly Change[]): Promise<void>;
}

export interface RemoteSide {
  /** Uploads rows; the server keeps only those strictly newer than its copy (serverAccepts). */
  push(changes: readonly Change[]): Promise<void>;
  /** Rows the server stored after `cursor` (its own sequence, immune to device clocks), oldest first. */
  pull(cursor: number): Promise<{ changes: Change[]; cursor: number }>;
}

/** Where this device is: everything it changed before `pushedUpTo` is uploaded; server rows up to `pulledCursor` are applied. */
export type SyncState = { pushedUpTo: number; pulledCursor: number };

/** One round: upload local changes, then download until the server has nothing newer. Returns the new state. */
export async function syncOnce(local: LocalSide, remote: RemoteSide, state: SyncState, now: number): Promise<SyncState> {
  // Read the clock before reading rows: anything edited during the upload is simply sent again next time.
  const outgoing = await local.changedSince(state.pushedUpTo);
  if (outgoing.length) await remote.push(outgoing);

  let cursor = state.pulledCursor;
  for (;;) {
    const page = await remote.pull(cursor);
    if (!page.changes.length) break;
    const stamps = await local.stamps(page.changes);
    const fresh = page.changes.filter((c) => {
      const mine = stamps.get(changeId(c));
      return mine === undefined || c.updatedAt >= mine;
    });
    if (fresh.length) await local.apply(fresh);
    cursor = page.cursor;
  }
  return { pushedUpTo: now, pulledCursor: cursor };
}
