import { rowsToApply, serverAccepts } from './sync';

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
