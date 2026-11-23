import { describe, it, expect } from 'vitest';
import { isOperating, isHolidayForBrand, getHolidayForBrand } from '../calendar';
import type {
  BrandModel,
  HolidayModel,
  OperatingCalendarModel,
  ProcessModel,
} from '../types';

describe('calendar.ts - Pure Operating Calendar Logic', () => {
  const calendars: OperatingCalendarModel[] = [
    {
      id: 'cal-365',
      name: '365 Days',
      rule: 'ALL_365',
      workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
      observesHolidays: false,
    },
    {
      id: 'cal-daily-holidays-off',
      name: 'Daily except Holidays',
      rule: 'DAILY_EXCEPT_HOLIDAYS',
      workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
      observesHolidays: true,
    },
    {
      id: 'cal-sun-holidays-off',
      name: 'Sun & Holidays Off',
      rule: 'SUN_AND_HOLIDAYS_OFF',
      workingWeekdays: [1, 2, 3, 4, 5, 6],
      observesHolidays: true,
    },
    {
      id: 'cal-custom-mon-fri',
      name: 'Mon to Fri Only',
      rule: 'CUSTOM',
      workingWeekdays: [1, 2, 3, 4, 5],
      observesHolidays: true,
    },
  ];

  const brands: BrandModel[] = [
    { id: 'brand-all365', code: 'B365', name: 'Brand 365', calendarId: 'cal-365', priority: 3, active: true },
    { id: 'brand-sun-off', code: 'BSUN', name: 'Brand Sun Off', calendarId: 'cal-sun-holidays-off', priority: 2, active: true },
    { id: 'brand-daily', code: 'BDAILY', name: 'Brand Daily', calendarId: 'cal-daily-holidays-off', priority: 2, active: true },
    { id: 'brand-custom', code: 'BCUST', name: 'Brand Custom', calendarId: 'cal-custom-mon-fri', priority: 1, active: true },
    { id: 'brand-inactive', code: 'BINACT', name: 'Brand Inactive', calendarId: 'cal-365', priority: 1, active: false },
  ];

  const holidays: HolidayModel[] = [
    { id: 'h-xmas', date: '2026-12-25', name: 'Christmas', brandId: null }, // Company-wide
    { id: 'h-special', date: '2026-12-18', name: 'Brand Special Day', brandId: 'brand-sun-off' }, // Brand-specific
  ];

  const process365: ProcessModel = {
    id: 'p-365',
    brandId: 'brand-all365',
    type: 'CS',
    name: 'CS 365',
    calendarId: null,
    defaultMinStaff: 1,
  };

  const processSunOff: ProcessModel = {
    id: 'p-sun-off',
    brandId: 'brand-sun-off',
    type: 'CS',
    name: 'CS Sun Off',
    calendarId: null,
    defaultMinStaff: 1,
  };

  const processOverride: ProcessModel = {
    id: 'p-override',
    brandId: 'brand-sun-off', // Brand is Sun-off
    type: 'NDR',
    name: 'NDR 365 Override',
    calendarId: 'cal-365', // Overridden to 365
    defaultMinStaff: 1,
  };

  const context = { calendars, brands, holidays };

  describe('Operating Rule: ALL_365', () => {
    it('operates on regular weekdays, Sundays, and holidays', () => {
      expect(isOperating(process365, '2026-12-01', context)).toBe(true); // Tue
      expect(isOperating(process365, '2026-12-06', context)).toBe(true); // Sun
      expect(isOperating(process365, '2026-12-25', context)).toBe(true); // Christmas
    });
  });

  describe('Operating Rule: SUN_AND_HOLIDAYS_OFF', () => {
    it('operates on regular working days (Mon-Sat)', () => {
      expect(isOperating(processSunOff, '2026-12-01', context)).toBe(true); // Tue
      expect(isOperating(processSunOff, '2026-12-05', context)).toBe(true); // Sat
    });

    it('is closed on Sundays', () => {
      expect(isOperating(processSunOff, '2026-12-06', context)).toBe(false); // Sun
      expect(isOperating(processSunOff, '2026-12-13', context)).toBe(false); // Sun
    });

    it('is closed on company-wide holidays', () => {
      expect(isOperating(processSunOff, '2026-12-25', context)).toBe(false); // Christmas Friday
    });

    it('is closed on brand-specific holidays for this brand', () => {
      expect(isOperating(processSunOff, '2026-12-18', context)).toBe(false); // Friday special holiday
    });

    it('is not affected by other brands holidays', () => {
      const processDaily: ProcessModel = {
        id: 'p-daily',
        brandId: 'brand-daily',
        type: 'CS',
        name: 'CS Daily',
        calendarId: null,
        defaultMinStaff: 1,
      };
      // brand-daily does NOT observe the 2026-12-18 brand-specific holiday
      expect(isOperating(processDaily, '2026-12-18', context)).toBe(true);
      // but DOES observe company-wide Christmas
      expect(isOperating(processDaily, '2026-12-25', context)).toBe(false);
    });
  });

  describe('Process Calendar Override', () => {
    it('allows a process to override brand calendar (e.g. CS 365 on a Sun-off brand)', () => {
      // processOverride has calendarId = 'cal-365' on a Sun-off brand
      expect(isOperating(processOverride, '2026-12-06', context)).toBe(true); // Sun
      expect(isOperating(processOverride, '2026-12-25', context)).toBe(true); // Holiday
    });
  });

  describe('Operating Rule: CUSTOM (Mon-Fri)', () => {
    it('operates Monday to Friday and is closed on Saturday and Sunday', () => {
      const processCustom: ProcessModel = {
        id: 'p-cust',
        brandId: 'brand-custom',
        type: 'ACC',
        name: 'ACC Custom',
        calendarId: null,
        defaultMinStaff: 1,
      };
      expect(isOperating(processCustom, '2026-12-01', context)).toBe(true); // Tue
      expect(isOperating(processCustom, '2026-12-04', context)).toBe(true); // Fri
      expect(isOperating(processCustom, '2026-12-05', context)).toBe(false); // Sat
      expect(isOperating(processCustom, '2026-12-06', context)).toBe(false); // Sun
    });
  });

  describe('Inactive Brand Guard', () => {
    it('returns false for inactive brands', () => {
      const pInactive: ProcessModel = {
        id: 'p-inact',
        brandId: 'brand-inactive',
        type: 'CS',
        name: 'CS Inactive',
        calendarId: null,
        defaultMinStaff: 1,
      };
      expect(isOperating(pInactive, '2026-12-01', context)).toBe(false);
    });
  });

  describe('Holiday Matching Utilities', () => {
    it('correctly matches brand-specific and company-wide holidays', () => {
      expect(isHolidayForBrand('2026-12-25', 'brand-all365', holidays)).toBe(true);
      expect(isHolidayForBrand('2026-12-18', 'brand-sun-off', holidays)).toBe(true);
      expect(isHolidayForBrand('2026-12-18', 'brand-all365', holidays)).toBe(false);
      expect(getHolidayForBrand('2026-12-25', 'brand-daily', holidays)?.name).toBe('Christmas');
    });
  });
});
