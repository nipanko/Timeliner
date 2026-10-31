import { changeId, rowsToApply, serverAccepts, syncOnce, type Change, type LocalSide, type RemoteSide, type SyncState } from './sync';

type Row = { id: string; title: string; updatedAt: number };
const key = (r: Row) => r.id;

describe('sync merge', () => {
  it('applies new and newer server rows, ignores older ones', () => {
    const local: Row[] = [
      { id: 'a', title: 'mine', updatedAt: 10 },
      { id: 'b', title: 'mine', updatedAt: 30 },
    ];
    const remote: Row[] = [
      { id: 'a', title: 'theirs', updatedAt: 20 },
      { id: 'b', title: 'theirs', updatedAt: 25 },
      { id: 'c', title: 'new', updatedAt: 5 },
    ];
    expect(rowsToApply(local, remote, key).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('two devices editing the same row at the same moment end up identical', () => {
    // Device A uploads first; the server keeps it and refuses B's equally new edit.
    const a: Row = { id: 'x', title: 'from A', updatedAt: 50 };
    const b: Row = { id: 'x', title: 'from B', updatedAt: 50 };
    expect(serverAccepts(a, undefined)).toBe(true);
    expect(serverAccepts(b, a)).toBe(false);
    // B then pulls the server's copy and adopts it, because equally new counts.
    expect(rowsToApply([b], [a], key)).toEqual([a]);
  });
});

/** In-memory server with the real rules: newest wins, and a sequence number for pulling. */
function fakeServer(): RemoteSide & { rows: Map<string, Change & { seq: number }> } {
  const rows = new Map<string, Change & { seq: number }>();
  let seq = 0;
  return {
    rows,
    async push(changes) {
      for (const c of changes) if (serverAccepts(c, rows.get(changeId(c)))) rows.set(changeId(c), { ...c, seq: ++seq });
    },
    async pull(cursor) {
      const page = [...rows.values()].filter((r) => r.seq > cursor).sort((a, b) => a.seq - b.seq).slice(0, 2); // small pages: exercises paging
      return { changes: page.map(({ seq: _seq, ...c }) => c), cursor: page.length ? page[page.length - 1].seq : cursor };
    },
  };
}

/** In-memory device with its own clock. */
function fakeDevice(name: string): LocalSide & { rows: Map<string, Change>; clock: number; edit: (key: string, data: Record<string, unknown>) => void; state: SyncState } {
  const rows = new Map<string, Change>();
  const device = {
    rows,
    clock: 1000,
    state: { pushedUpTo: 0, pulledCursor: 0 },
    edit(key: string, data: Record<string, unknown>) {
      device.clock += 1;
      rows.set(changeId({ table: 'inbox', key }), { table: 'inbox', key, updatedAt: device.clock, data: { ...data, by: name } });
    },
    async changedSince(since: number) {
      return [...rows.values()].filter((r) => r.updatedAt > since);
    },
    async stamps(changes: readonly Change[]) {
      return new Map(changes.flatMap((c) => (rows.has(changeId(c)) ? [[changeId(c), rows.get(changeId(c))!.updatedAt] as const] : [])));
    },
    async apply(changes: readonly Change[]) {
      for (const c of changes) rows.set(changeId(c), c);
    },
  };
  return device;
}

const sync = async (d: ReturnType<typeof fakeDevice>, server: RemoteSide) => {
  d.state = await syncOnce(d, server, d.state, d.clock);
};
const view = (d: ReturnType<typeof fakeDevice>) => Object.fromEntries([...d.rows.entries()].map(([k, v]) => [k, v.data]));

describe('syncOnce', () => {
  it('brings a phone and a laptop to the same data, newest edit winning, deletions included', async () => {
    const server = fakeServer();
    const phone = fakeDevice('phone');
    const laptop = fakeDevice('laptop');
    laptop.clock = 5000; // devices' clocks disagree; the server's sequence keeps pulling correct anyway

    phone.edit('a', { title: 'Buy milk' });
    phone.edit('b', { title: 'Call home' });
    phone.edit('c', { title: 'Old idea' });
    await sync(phone, server);
    await sync(laptop, server);
    expect(view(laptop)).toEqual(view(phone));

    laptop.edit('a', { title: 'Buy oat milk' }); // newer (laptop clock is ahead)
    phone.edit('c', { title: 'Old idea', deletedAt: 1 }); // a deletion is just a newer row (tombstone)
    laptop.edit('d', { title: 'New on laptop' });
    await sync(phone, server);
    await sync(laptop, server);
    await sync(phone, server);

    expect(view(phone)).toEqual(view(laptop));
    expect(view(phone)['inbox:a']).toMatchObject({ title: 'Buy oat milk', by: 'laptop' });
    expect(view(phone)['inbox:c']).toMatchObject({ deletedAt: 1 });
    expect(Object.keys(view(phone)).sort()).toEqual(['inbox:a', 'inbox:b', 'inbox:c', 'inbox:d']);
  });

  it('is safe to run again with nothing new', async () => {
    const server = fakeServer();
    const phone = fakeDevice('phone');
    phone.edit('a', { title: 'x' });
    await sync(phone, server);
    const before = view(phone);
    await sync(phone, server);
    await sync(phone, server);
    expect(view(phone)).toEqual(before);
    expect(server.rows.size).toBe(1);
  });
});
