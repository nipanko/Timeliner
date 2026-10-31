import { ageGroup, validBirthYear } from './age';

const now = new Date(2026, 10, 1);

describe('ageGroup', () => {
  it('reads the birth year cautiously (birthday assumed still ahead)', () => {
    expect(ageGroup(2013, now)).toBe('child'); // may still be 12
    expect(ageGroup(2012, now)).toBe('teen'); // at least 13
    expect(ageGroup(2008, now)).toBe('teen'); // may still be 17
    expect(ageGroup(2007, now)).toBe('adult'); // at least 18
    expect(ageGroup(1980, now)).toBe('adult');
  });
  it('accepts only plausible years', () => {
    expect(validBirthYear(1990, now)).toBe(true);
    expect(validBirthYear(1899, now)).toBe(false);
    expect(validBirthYear(2027, now)).toBe(false);
    expect(validBirthYear(1990.5, now)).toBe(false);
  });
});
