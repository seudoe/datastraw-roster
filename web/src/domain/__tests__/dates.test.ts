import { describe, it, expect } from 'vitest';
import {
  isLeapYear,
  getDaysCount,
  isValidIsoDate,
  isValidMonthStr,
  getWeekday,
  getWeekdayLetter,
  getWeekdayName,
  isWeekend,
  getDaysInMonth,
  addDays,
  diffInDays,
  isDateInRange,
  getIsoWeek,
  getIsoWeeksForMonth,
} from '../dates';

describe('dates.ts - Pure String-Based Date Arithmetic', () => {
  describe('Leap Year & Month Lengths', () => {
    it.each([
      [2000, true],
      [2024, true],
      [2028, true],
      [1900, false],
      [2026, false],
      [2027, false],
    ])('isLeapYear(%i) === %s', (year, expected) => {
      expect(isLeapYear(year)).toBe(expected);
    });

    it('returns correct days for February in leap and non-leap years', () => {
      expect(getDaysCount(2024, 2)).toBe(29);
      expect(getDaysCount(2026, 2)).toBe(28);
    });

    it('returns correct days for 31-day and 30-day months', () => {
      expect(getDaysCount(2026, 1)).toBe(31);
      expect(getDaysCount(2026, 4)).toBe(30);
      expect(getDaysCount(2026, 12)).toBe(31);
    });
  });

  describe('ISO Validation', () => {
    it.each([
      ['2026-12-01', true],
      ['2024-02-29', true],
      ['2026-02-29', false], // Non-leap year
      ['2026-13-01', false], // Invalid month
      ['2026-00-10', false],
      ['invalid', false],
      ['2026-12-32', false],
    ])('isValidIsoDate("%s") === %s', (dateStr, expected) => {
      expect(isValidIsoDate(dateStr)).toBe(expected);
    });

    it.each([
      ['2026-12', true],
      ['2027-01', true],
      ['2026-00', false],
      ['2026-13', false],
      ['2026', false],
    ])('isValidMonthStr("%s") === %s', (monthStr, expected) => {
      expect(isValidMonthStr(monthStr)).toBe(expected);
    });
  });

  describe('Sakamoto Weekday Algorithm (0=Sun..6=Sat)', () => {
    it.each([
      ['2026-12-01', 2, 'Tue'], // Tuesday
      ['2026-12-06', 0, 'Sun'], // Sunday
      ['2026-12-25', 5, 'Fri'], // Friday (Christmas 2026)
      ['2027-01-01', 5, 'Fri'], // New Year 2027
      ['2027-01-03', 0, 'Sun'], // Sunday
      ['2027-01-09', 6, 'Sat'], // Saturday
      ['2024-02-29', 4, 'Thu'], // Leap day Thursday
      ['2000-01-01', 6, 'Sat'], // Saturday
    ])('getWeekday("%s") === %i (%s)', (dateStr, expectedWd, expectedName) => {
      expect(getWeekday(dateStr)).toBe(expectedWd);
      expect(getWeekdayName(dateStr)).toBe(expectedName);
    });

    it('returns correct single-letter abbreviations', () => {
      expect(getWeekdayLetter('2026-12-06')).toBe('S'); // Sun
      expect(getWeekdayLetter('2026-12-07')).toBe('M'); // Mon
    });

    it('identifies weekends correctly', () => {
      expect(isWeekend('2026-12-05')).toBe(true); // Sat
      expect(isWeekend('2026-12-06')).toBe(true); // Sun
      expect(isWeekend('2026-12-07')).toBe(false); // Mon
    });
  });

  describe('Date Navigation & Offsets', () => {
    it('generates exact list of days in a month', () => {
      const days = getDaysInMonth('2026-12');
      expect(days.length).toBe(31);
      expect(days[0]).toBe('2026-12-01');
      expect(days[30]).toBe('2026-12-31');
    });

    it('adds and subtracts days crossing month and year boundaries', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // Leap year
      expect(addDays('2026-12-10', 7)).toBe('2026-12-17');
    });

    it('computes exact difference in days', () => {
      expect(diffInDays('2026-12-01', '2026-12-31')).toBe(30);
      expect(diffInDays('2026-12-31', '2027-01-01')).toBe(1);
      expect(diffInDays('2027-01-01', '2026-12-31')).toBe(-1);
    });

    it('checks range containment', () => {
      expect(isDateInRange('2026-12-15', '2026-12-10', '2026-12-20')).toBe(true);
      expect(isDateInRange('2026-12-10', '2026-12-10', '2026-12-20')).toBe(true);
      expect(isDateInRange('2026-12-20', '2026-12-10', '2026-12-20')).toBe(true);
      expect(isDateInRange('2026-12-21', '2026-12-10', '2026-12-20')).toBe(false);
    });
  });

  describe('ISO Week & Proration Helpers', () => {
    it('calculates ISO week numbers correctly', () => {
      // 2026-12-31 is a Thursday in ISO week 53 of 2026
      const w1 = getIsoWeek('2026-12-31');
      expect(w1.weekNumber).toBe(53);

      // 2027-01-01 is Friday in ISO week 53 of 2026
      const w2 = getIsoWeek('2027-01-01');
      expect(w2.year).toBe(2026);
      expect(w2.weekNumber).toBe(53);

      // 2027-01-04 is Monday in ISO week 1 of 2027
      const w3 = getIsoWeek('2027-01-04');
      expect(w3.year).toBe(2027);
      expect(w3.weekNumber).toBe(1);
    });

    it('slices December 2026 into pro-rated ISO week groups', () => {
      const slices = getIsoWeeksForMonth('2026-12', 1);
      expect(slices.length).toBeGreaterThanOrEqual(5);

      // Verify all 31 days accounted for
      const allDays = slices.flatMap((s) => s.daysInMonth);
      expect(allDays.length).toBe(31);
      expect(allDays[0]).toBe('2026-12-01');
      expect(allDays[30]).toBe('2026-12-31');

      // Verify that stub weeks are pro-rated
      for (const slice of slices) {
        if (slice.daysCount >= 5) {
          expect(slice.proratedOffTarget).toBe(1);
        }
      }
    });
  });
});
