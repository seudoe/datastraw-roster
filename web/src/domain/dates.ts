/**
 * Pure String-Based Date Arithmetic for RosterIQ
 * ZERO JavaScript Date object leaks outside this file.
 * All functions operate purely on UTC-free ISO date strings (YYYY-MM-DD) or months (YYYY-MM).
 */

const DAYS_IN_MONTH_NON_LEAP = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Check if a year is a leap year */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Get number of days in a given year and month (1-12) */
export function getDaysCount(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return DAYS_IN_MONTH_NON_LEAP[month] ?? 30;
}

/** Validate ISO date string format YYYY-MM-DD */
export function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12) return false;
  const maxDays = getDaysCount(year, month);
  return day >= 1 && day <= maxDays;
}

/** Validate ISO month string format YYYY-MM */
export function isValidMonthStr(monthStr: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return false;
  const [, month] = monthStr.split('-').map(Number);
  return month >= 1 && month <= 12;
}

/** Parse year and month from YYYY-MM or YYYY-MM-DD */
export function parseYearMonth(str: string): { year: number; month: number } {
  const parts = str.split('-').map(Number);
  return { year: parts[0], month: parts[1] };
}

/** Parse year, month, day from YYYY-MM-DD */
export function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

/** Format year, month, day into YYYY-MM-DD */
export function formatDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns Day of Week using Tomohiko Sakamoto's Algorithm
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
 * Pure integer math, immune to timezones and DST.
 */
export function getWeekday(dateStr: string): number {
  const { year, month, day } = parseDate(dateStr);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (month < 3) {
    y -= 1;
  }
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7;
}

/** Get short weekday letter (M, T, W, T, F, S, S) */
export function getWeekdayLetter(dateStr: string): string {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return letters[getWeekday(dateStr)];
}

/** Get short weekday name (Sun, Mon, Tue, Wed, Thu, Fri, Sat) */
export function getWeekdayName(dateStr: string): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[getWeekday(dateStr)];
}

/** Check if date is a weekend (Saturday or Sunday) */
export function isWeekend(dateStr: string): boolean {
  const wd = getWeekday(dateStr);
  return wd === 0 || wd === 6;
}

/** Generate array of all YYYY-MM-DD dates in a given month (YYYY-MM) */
export function getDaysInMonth(monthStr: string): string[] {
  const { year, month } = parseYearMonth(monthStr);
  const count = getDaysCount(year, month);
  const days: string[] = [];
  for (let d = 1; d <= count; d++) {
    days.push(formatDate(year, month, d));
  }
  return days;
}

/** Convert date to astronomical Julian Day Number for exact differences */
function toJulianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** Convert Julian Day Number back to YYYY-MM-DD */
function fromJulianDayNumber(jdn: number): string {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);

  return formatDate(year, month, day);
}

/** Add n days (positive or negative) to an ISO date string */
export function addDays(dateStr: string, n: number): string {
  const { year, month, day } = parseDate(dateStr);
  const jdn = toJulianDayNumber(year, month, day) + n;
  return fromJulianDayNumber(jdn);
}

/** Difference in days between dateB and dateA (dateB - dateA) */
export function diffInDays(dateA: string, dateB: string): number {
  const pA = parseDate(dateA);
  const pB = parseDate(dateB);
  return toJulianDayNumber(pB.year, pB.month, pB.day) - toJulianDayNumber(pA.year, pA.month, pA.day);
}

/** Check if date is within [startDate, endDate] inclusive */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

export interface IsoWeekSlice {
  weekNumber: number;
  year: number;
  daysInMonth: string[];
  totalDaysInWeek: number;
  daysCount: number;
  proratedOffTarget: number; // Pro-rated target for 1 off/week
}

/**
 * Calculates ISO week groupings for a month, including pro-rated weekly off targets.
 * ISO week starts on Monday.
 */
export function getIsoWeeksForMonth(monthStr: string, baseOffTargetPerWeek = 1): IsoWeekSlice[] {
  const days = getDaysInMonth(monthStr);
  const weekMap = new Map<string, string[]>();

  for (const day of days) {
    const { year, weekNumber } = getIsoWeek(day);
    const key = `${year}-W${String(weekNumber).padStart(2, '0')}`;
    const list = weekMap.get(key) ?? [];
    list.push(day);
    weekMap.set(key, list);
  }

  const slices: IsoWeekSlice[] = [];
  for (const [key, daysInSlice] of weekMap.entries()) {
    const [yearStr, weekStr] = key.split('-W');
    const daysCount = daysInSlice.length;
    // Pro-rate off target: for a full 7 days = base target; for partial week (e.g. 1-2 days) = round(daysCount/7 * base)
    const prorated = daysCount >= 5 ? baseOffTargetPerWeek : daysCount >= 3 ? Math.max(1, Math.round((daysCount / 7) * baseOffTargetPerWeek)) : 0;

    slices.push({
      weekNumber: Number(weekStr),
      year: Number(yearStr),
      daysInMonth: daysInSlice,
      totalDaysInWeek: 7,
      daysCount,
      proratedOffTarget: prorated,
    });
  }

  return slices;
}

/**
 * Get ISO week number and ISO week-numbering year
 */
export function getIsoWeek(dateStr: string): { year: number; weekNumber: number } {
  const { year, month, day } = parseDate(dateStr);
  const jdn = toJulianDayNumber(year, month, day);

  // Day of week: 1 = Mon, ..., 7 = Sun (for JDN, 0 = Mon, ..., 6 = Sun)
  const isoDay = (jdn % 7) + 1;

  // The Thursday of the current week determines the ISO year
  const thursdayJdn = jdn + (4 - isoDay);
  const thursdayDate = fromJulianDayNumber(thursdayJdn);
  const isoYear = parseDate(thursdayDate).year;

  // First Thursday of the ISO year is always in Week 1
  const jan4Jdn = toJulianDayNumber(isoYear, 1, 4);
  const jan4IsoDay = (jan4Jdn % 7) + 1;
  const firstThursdayJdn = jan4Jdn + (4 - jan4IsoDay);

  const weekNumber = Math.floor((thursdayJdn - firstThursdayJdn) / 7) + 1;
  return { year: isoYear, weekNumber };
}
