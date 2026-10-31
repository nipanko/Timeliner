/**
 * Account age rules (decided 30 Oct; PRODUCT.md): under 13 no account, 13–17 need a parent's consent.
 * Only the birth year is asked, so we assume this year's birthday hasn't happened yet: the cautious
 * reading never treats a child as older than they may be. The database trigger applies the same rule.
 */
export type AgeGroup = 'child' | 'teen' | 'adult';

export function ageGroup(birthYear: number, now: Date): AgeGroup {
  const age = now.getFullYear() - birthYear - 1;
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  return 'adult';
}

/** A birth year someone could plausibly type. */
export const validBirthYear = (year: number, now: Date) => Number.isInteger(year) && year >= 1900 && year <= now.getFullYear();
