import { HOUR, MINUTE } from '../time/units';
import { dayFacts, dayQuests, questDaysDone, questsFor } from './quests';

const day = (d: number) => new Date(2026, 10, d).getTime();
const at = (d: number, h: number) => new Date(2026, 10, d, h).getTime();
const task = (start: number, done = true, createdAt = start - HOUR) => ({ kind: 'task' as const, start, done, createdAt });
const session = (start: number, minutes: number) => ({ startedAt: start, endedAt: start + minutes * MINUTE, pausedMs: 0, pausedAt: null });

describe('questsFor', () => {
  it('picks 3 different quests, the same all day, varied across days', () => {
    const q = questsFor(day(2));
    expect(new Set(q).size).toBe(3);
    expect(questsFor(day(2))).toEqual(q);
    const week = Array.from({ length: 7 }, (_, i) => questsFor(day(2 + i)).join());
    expect(new Set(week).size).toBeGreaterThan(1);
  });
});

describe('dayFacts', () => {
  it('measures finished and planned work, plans for tomorrow, focus and the review', () => {
    const entries = [task(at(2, 9)), task(at(2, 14)), task(at(2, 16), false), task(at(3, 9), false, at(2, 20)), task(at(4, 9), false, at(2, 20))];
    const facts = dayFacts(day(2), entries, [session(at(2, 10), 30), session(at(3, 10), 60)], [day(2)], at(3, 12));
    expect(facts).toEqual({ done: 2, doneBeforeNoon: 1, planned: 3, plannedTomorrow: 1, focusMin: 30, closed: true });
  });
});

describe('quest progress and the bonus days', () => {
  // A day that meets every quest in the pool, whichever three it picks.
  const full = [task(at(2, 8)), task(at(2, 9)), task(at(2, 10)), task(at(3, 9), false, at(2, 20))];
  const sessions = [session(at(2, 11), 25)];

  it('completes all three on a full day and shows partial progress otherwise', () => {
    const quests = dayQuests(day(2), dayFacts(day(2), full, sessions, [day(2)], at(3, 12)));
    expect(quests.every((q) => q.done)).toBe(true);
    const empty = dayQuests(day(2), dayFacts(day(2), [], [], [], at(2, 12)));
    expect(empty.every((q) => !q.done && q.progress === 0)).toBe(true);
  });

  it('counts the days with all three quests done', () => {
    expect(questDaysDone(full, sessions, [day(2)], at(3, 12))).toBe(1);
    expect(questDaysDone(full.slice(0, 1), [], [], at(3, 12))).toBe(0);
  });
});
