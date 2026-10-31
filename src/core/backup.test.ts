import { makeBackup, parseBackup, type BackupData } from './backup';

const sample = (): BackupData => ({
  layers: [{ id: 'work', name: 'Work', color: 'yellow', icon: 'briefcase', sort: 0, visible: true, createdAt: 0, updatedAt: 0, deletedAt: null }],
  entries: [
    { id: 'e1', layerId: 'work', kind: 'task', title: 'Write', startAt: 1, endAt: 2, granularity: 'moment', tz: 'Asia/Kolkata', status: 'done', createdAt: 0, updatedAt: 0, deletedAt: null },
  ],
  focus_sessions: [{ id: 'f1', entryId: 'e1', startedAt: 1, endedAt: 2, pausedMs: 0, pausedAt: null, deletedAt: null }],
  day_logs: [{ day: 20261101, reviewedAt: 5 }],
  milestones: [],
  settings: [{ key: 'theme', value: 'dark' }],
  inbox: [{ id: 'i1', title: 'Idea', createdAt: 3, deletedAt: null }],
});
const text = (data: unknown) => JSON.stringify({ app: 'timeliner', format: 1, exportedAt: 9, data });

describe('backup', () => {
  it('round-trips a backup and counts the rows', () => {
    const parsed = parseBackup(JSON.stringify(makeBackup(sample(), 9)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.backup.data).toEqual(sample());
      expect(parsed.counts.entries).toBe(1);
      expect(parsed.backup.exportedAt).toBe(9);
    }
  });

  it('drops unknown fields and fills missing optional ones with null', () => {
    const data = sample();
    const extra = { ...data.layers[0], hacked: '<script>' } as Record<string, unknown>;
    delete extra.icon;
    const parsed = parseBackup(text({ ...data, layers: [extra] }));
    expect(parsed.ok && parsed.backup.data.layers[0]).toEqual({ ...data.layers[0], icon: null });
  });

  it('rejects files that are not ours, newer formats and damaged rows', () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'other', data: {} })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'timeliner', format: 2, data: {} }))).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
    const bad = sample();
    bad.entries[0].kind = 'virus';
    expect(parseBackup(text(bad))).toMatchObject({ ok: false, error: expect.stringMatching(/entries row 1/) });
    const noTitle = sample();
    delete noTitle.entries[0].title;
    expect(parseBackup(text(noTitle)).ok).toBe(false);
  });

  it('rejects broken links and duplicates', () => {
    const orphan = sample();
    orphan.entries[0].layerId = 'gone';
    expect(parseBackup(text(orphan))).toMatchObject({ ok: false, error: expect.stringMatching(/missing layer/) });
    const dupe = sample();
    dupe.inbox.push({ ...dupe.inbox[0] });
    expect(parseBackup(text(dupe))).toMatchObject({ ok: false, error: expect.stringMatching(/duplicate/) });
    expect(parseBackup(text({ ...sample(), layers: [] })).ok).toBe(false);
  });
});

describe('backup and sync columns', () => {
  it('keeps tombstones, and older backups without the new fields still restore', () => {
    const data = sample();
    data.inbox[0] = { ...data.inbox[0], updatedAt: 4, deletedAt: 5 };
    const parsed = parseBackup(text(data));
    expect(parsed.ok && parsed.backup.data.inbox[0]).toEqual({ id: 'i1', title: 'Idea', createdAt: 3, updatedAt: 4, deletedAt: 5 });
    const old = parseBackup(text(sample()));
    // updatedAt is left out (the database stamps it); deletedAt becomes null (alive).
    expect(old.ok && old.backup.data.inbox[0]).toEqual({ id: 'i1', title: 'Idea', createdAt: 3, deletedAt: null });
  });
});
