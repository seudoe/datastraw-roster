import { describe, it, expect } from 'vitest';
import { resolveDemand, resolveAllDemands } from '../demand';
import type {
  BrandModel,
  CoverageRuleModel,
  HolidayModel,
  OperatingCalendarModel,
  ProcessModel,
} from '../types';

describe('demand.ts - Pure Demand Resolution Logic', () => {
  const calendars: OperatingCalendarModel[] = [
    {
      id: 'cal-365',
      name: '365 Days',
      rule: 'ALL_365',
      workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
      observesHolidays: false,
    },
    {
      id: 'cal-sun-off',
      name: 'Sun Off',
      rule: 'SUN_AND_HOLIDAYS_OFF',
      workingWeekdays: [1, 2, 3, 4, 5, 6],
      observesHolidays: true,
    },
  ];

  const brands: BrandModel[] = [
    { id: 'brand-A', code: 'BA', name: 'Brand A', calendarId: 'cal-365', priority: 2, active: true },
    { id: 'brand-B', code: 'BB', name: 'Brand B', calendarId: 'cal-sun-off', priority: 2, active: true },
  ];

  const processA: ProcessModel = {
    id: 'proc-A1',
    brandId: 'brand-A',
    type: 'CS',
    name: 'CS Brand A',
    calendarId: null,
    defaultMinStaff: 1,
  };

  const processB: ProcessModel = {
    id: 'proc-B1',
    brandId: 'brand-B',
    type: 'CS',
    name: 'CS Brand B',
    calendarId: null,
    defaultMinStaff: 1,
  };

  const holidays: HolidayModel[] = [
    { id: 'h-1', date: '2026-12-25', name: 'Christmas', brandId: null },
  ];

  const coverageRules: CoverageRuleModel[] = [
    // Weekday rule: minStaff = 2 on Saturdays (6) and Sundays (0) for proc-A1
    { id: 'r-wknd-sat', processId: 'proc-A1', weekday: 6, minStaff: 2 },
    { id: 'r-wknd-sun', processId: 'proc-A1', weekday: 0, minStaff: 2 },
    // Date-specific rule: minStaff = 3 on 2026-12-31 for New Year's Eve spike
    { id: 'r-nye', processId: 'proc-A1', date: '2026-12-31', minStaff: 3 },
  ];

  const context = { calendars, brands, holidays, coverageRules };

  it('returns 0 demand when the process is closed (e.g. Sunday on Sun-off brand)', () => {
    // 2026-12-06 is Sunday
    const demandSun = resolveDemand(processB, '2026-12-06', context);
    expect(demandSun).toBe(0);

    // 2026-12-25 is Christmas
    const demandHoliday = resolveDemand(processB, '2026-12-25', context);
    expect(demandHoliday).toBe(0);
  });

  it('uses defaultMinStaff when no specific rule applies', () => {
    // 2026-12-01 is Tuesday (no rule)
    const demand = resolveDemand(processA, '2026-12-01', context);
    expect(demand).toBe(1);
  });

  it('applies weekday-specific rule when matched', () => {
    // 2026-12-05 is Saturday -> rule specifies minStaff = 2
    const demandSat = resolveDemand(processA, '2026-12-05', context);
    expect(demandSat).toBe(2);

    // 2026-12-06 is Sunday -> rule specifies minStaff = 2
    const demandSun = resolveDemand(processA, '2026-12-06', context);
    expect(demandSun).toBe(2);
  });

  it('prioritizes exact date rule over weekday rule and defaultMinStaff', () => {
    // 2026-12-31 is Thursday (normally default 1, but exact date rule specifies 3)
    const demand = resolveDemand(processA, '2026-12-31', context);
    expect(demand).toBe(3);
  });

  it('resolves batch demand matrix across an entire month', () => {
    const days = ['2026-12-01', '2026-12-05', '2026-12-06', '2026-12-31'];
    const matrix = resolveAllDemands([processA, processB], days, context);

    expect(matrix['proc-A1']['2026-12-01']).toBe(1);
    expect(matrix['proc-A1']['2026-12-05']).toBe(2);
    expect(matrix['proc-A1']['2026-12-31']).toBe(3);

    expect(matrix['proc-B1']['2026-12-01']).toBe(1);
    expect(matrix['proc-B1']['2026-12-06']).toBe(0); // Sun-off
  });
});
