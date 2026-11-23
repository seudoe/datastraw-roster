/**
 * Pure Calendar Operating Logic for RosterIQ
 * Single source of truth for all operational calendar semantics.
 */

import { getWeekday } from './dates';
import type {
  BrandModel,
  HolidayModel,
  OperatingCalendarModel,
  ProcessModel,
} from './types';

export interface CalendarLookupContext {
  calendars: OperatingCalendarModel[];
  brands: BrandModel[];
  holidays: HolidayModel[];
}

/**
 * Checks if a given process is operating on a specific calendar date.
 * Precedence: Process calendar override -> Brand calendar -> Rule & Weekday mask -> Observed Holidays.
 */
export function isOperating(
  process: ProcessModel,
  date: string,
  context: CalendarLookupContext,
): boolean {
  const brand = context.brands.find((b) => b.id === process.brandId);
  if (!brand || !brand.active) {
    return false;
  }

  // Determine which calendar applies: process-level override takes precedence over brand calendar
  const calendarId = process.calendarId || brand.calendarId;
  const calendar = context.calendars.find((c) => c.id === calendarId);
  if (!calendar) {
    // If no calendar found, default to non-operating
    return false;
  }

  // 1. ALL_365: Operates every single day without exception
  if (calendar.rule === 'ALL_365') {
    return true;
  }

  const weekday = getWeekday(date);

  // 2. SUN_AND_HOLIDAYS_OFF: Always closed on Sundays
  if (calendar.rule === 'SUN_AND_HOLIDAYS_OFF' && weekday === 0) {
    return false;
  }

  // 3. CUSTOM: Must be an allowed working weekday
  if (calendar.rule === 'CUSTOM') {
    if (!calendar.workingWeekdays.includes(weekday)) {
      return false;
    }
  }

  // 4. Holiday Check (applicable if calendar.observesHolidays is true)
  if (calendar.observesHolidays) {
    const isHoliday = isHolidayForBrand(date, brand.id, context.holidays);
    if (isHoliday) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a date is an observed holiday for a specific brand.
 * Matches company-wide holidays (brandId === null) or brand-specific holidays (brandId === brandId).
 */
export function isHolidayForBrand(
  date: string,
  brandId: string,
  holidays: HolidayModel[],
): boolean {
  return holidays.some(
    (h) => h.date === date && (h.brandId === null || h.brandId === undefined || h.brandId === brandId),
  );
}

/**
 * Returns holiday details if a date is a holiday for the brand.
 */
export function getHolidayForBrand(
  date: string,
  brandId: string,
  holidays: HolidayModel[],
): HolidayModel | undefined {
  return holidays.find(
    (h) => h.date === date && (h.brandId === null || h.brandId === undefined || h.brandId === brandId),
  );
}
