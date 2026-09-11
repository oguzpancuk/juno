/**
 * Full years since a birth date, as the database counts them.
 *
 * Every age another person sees comes from a view computing
 * `extract(year from age(current_date, birth_date))`. The owner's own
 * page has no such view — `profiles` stores the date — so it computes
 * the number here, and it has to be the same number: a person who reads
 * "29" on their profile and is shown to others as "28" has found a bug.
 *
 * Postgres `age()` takes the year difference and borrows one when the
 * later month/day is before the earlier one. The consequence worth
 * naming: a 29 February birth turns a year older on 1 March of a common
 * year, not on 28 February (observed on the local database, see
 * `age.test.ts`). That differs from the CHECK on `birth_date`, whose
 * `current_date - interval '18 years'` clamps 29 Feb to 28 Feb — two
 * rules in the database, and this one mirrors the one the screens show.
 *
 * The calendar is UTC, like `current_date` on the server (its zone is
 * UTC) and like `isAtLeast18` in `profile.ts`.
 *
 * Returns null when the string is not a real `YYYY-MM-DD` date. The row
 * schema only promises a string, and a screen showing "NaN" is worse than
 * one showing the name alone.
 */
export function ageOn(birthDate: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // `Date.UTC` rolls 2001-02-29 over to 1 March rather than refusing it;
  // reading the fields back is the check that it did not.
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    return null;
  }
  const beforeBirthday =
    today.getUTCMonth() < month - 1 ||
    (today.getUTCMonth() === month - 1 && today.getUTCDate() < day);
  return today.getUTCFullYear() - year - (beforeBirthday ? 1 : 0);
}
