import {
  LocalDateTimeSchema,
  TimeZoneSchema,
  isValidCalendarDate,
  type LocalDateTime,
} from './schema';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** UTC offset of `timeZone` at a UTC instant, in minutes (east positive). */
export function utcOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = formatter(timeZone).formatToParts(new Date(utcMs));
  const field = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((p) => p.type === type)?.value;
    if (value === undefined) {
      throw new Error(`Intl did not return ${type} for ${timeZone}`);
    }
    return Number(value);
  };
  const wall = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    // Some ICU builds print midnight as "24" despite hourCycle h23.
    field('hour') % 24,
    field('minute'),
    field('second'),
  );
  // Rounded to the minute: pre-1910 local-mean-time offsets carry seconds
  // (Istanbul IMT was +1:56:56); that error is < 1 minute of time,
  // i.e. < 1′ of Ascendant, and accepted.
  return Math.round((wall - utcMs) / MINUTE_MS);
}

function wallClockMs(local: LocalDateTime): number {
  // Date.UTC silently rolls 31 Feb into March; reject such dates.
  if (!isValidCalendarDate(local.year, local.month, local.day)) {
    throw new RangeError(
      `invalid calendar date ${local.year}-${local.month}-${local.day}`,
    );
  }
  return Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );
}

/**
 * The UTC instant at which the wall clock in `timeZone` read `local`.
 * Historical daylight-saving rules come from the platform's tzdata via
 * Intl. Overlap (clocks set back): the earlier instant. Gap (clocks set
 * forward, the wall time never happened): the offset in force before the
 * transition is applied, so 03:30 in a 03:00→04:00 gap maps to 04:30 of
 * the new offset.
 */
export function localToUtc(localRaw: LocalDateTime, timeZoneRaw: string): Date {
  const local = LocalDateTimeSchema.parse(localRaw);
  const timeZone = TimeZoneSchema.parse(timeZoneRaw);
  const wall = wallClockMs(local);

  // Candidate instants from the offsets on either side of the day; each
  // is valid when applying its own offset reproduces the wall time.
  const offsets = new Set([
    utcOffsetMinutes(wall - DAY_MS, timeZone),
    utcOffsetMinutes(wall, timeZone),
    utcOffsetMinutes(wall + DAY_MS, timeZone),
  ]);
  const valid: number[] = [];
  for (const offset of offsets) {
    const candidate = wall - offset * MINUTE_MS;
    if (utcOffsetMinutes(candidate, timeZone) === offset) valid.push(candidate);
  }
  if (valid.length > 0) return new Date(Math.min(...valid));

  // Gap: no offset reproduces the wall time; use the pre-transition offset.
  const before = utcOffsetMinutes(wall - DAY_MS, timeZone);
  return new Date(wall - before * MINUTE_MS);
}
