import { describe, it, expect } from 'vitest';
import { resolveAvailability } from '../availability';
import type {
  AbsenceModel,
  AssignmentModel,
  BrandModel,
  EmployeeModel,
  HolidayModel,
  OperatingCalendarModel,
  ProcessModel,
} from '../types';

describe('availability.ts - Employee Availability & Forced States', () => {
  const calendars: OperatingCalendarModel[] = [
    {
      id: 'cal-daily-holidays-off',
      name: 'Daily except Holidays',
      rule: 'DAILY_EXCEPT_HOLIDAYS',
      workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
      observesHolidays: true,
    },
    {
      id: 'cal-365',
      name: '365 Days',
      rule: 'ALL_365',
      workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
      observesHolidays: false,
    },
  ];

  const brands: BrandModel[] = [
    { id: 'brand-holiday-obs', code: 'BHO', name: 'Brand Holiday Observer', calendarId: 'cal-daily-holidays-off', priority: 2, active: true },
    { id: 'brand-365', code: 'B365', name: 'Brand 365', calendarId: 'cal-365', priority: 3, active: true },
  ];

  const proc1: ProcessModel = { id: 'proc-1', brandId: 'brand-holiday-obs', type: 'CS', name: 'CS 1', defaultMinStaff: 1 };
  const proc2: ProcessModel = { id: 'proc-2', brandId: 'brand-365', type: 'ACC', name: 'ACC 2', defaultMinStaff: 1 };

  const holidays: HolidayModel[] = [
    { id: 'h-xmas', date: '2026-12-25', name: 'Christmas', brandId: null },
  ];

  const empStandard: EmployeeModel = {
    id: 'emp-1',
    code: 'EMP001',
    name: 'Aarav Sharma',
    podId: 'pod-1',
    skills: ['CS'],
    weeklyOffsPerWeek: 1,
    preferredOffWeekdays: [0], // Sun
    unavailableWeekdays: [],
    active: true,
  };

  const empPartTime: EmployeeModel = {
    id: 'emp-2',
    code: 'EMP002',
    name: 'Diya Patel',
    podId: 'pod-1',
    skills: ['CS'],
    weeklyOffsPerWeek: 1,
    preferredOffWeekdays: [0],
    unavailableWeekdays: [3], // Blocked on Wednesdays (3)
    active: true,
  };

  const absences: AbsenceModel[] = [
    {
      id: 'abs-1',
      employeeId: 'emp-1',
      type: 'PLANNED_LEAVE',
      startDate: '2026-12-10',
      endDate: '2026-12-12',
      status: 'APPROVED',
      reason: 'Family event',
    },
    {
      id: 'abs-2',
      employeeId: 'emp-1',
      type: 'COMP_OFF',
      startDate: '2026-12-20',
      endDate: '2026-12-20',
      status: 'APPROVED',
      reason: 'Holiday comp-off credit',
    },
    {
      id: 'abs-pending',
      employeeId: 'emp-2',
      type: 'PLANNED_LEAVE',
      startDate: '2026-12-15',
      endDate: '2026-12-16',
      status: 'PENDING',
      reason: 'Pending request',
    },
  ];

  const assignments: AssignmentModel[] = [
    { id: 'a-1', employeeId: 'emp-1', processId: 'proc-1', role: 'PRIMARY', allocationPct: 100 },
    { id: 'a-2', employeeId: 'emp-2', processId: 'proc-2', role: 'PRIMARY', allocationPct: 100 },
  ];

  const context = {
    absences,
    assignments,
    processes: [proc1, proc2],
    brands,
    calendars,
    holidays,
  };

  it('returns FREE for regular available working days', () => {
    const res = resolveAvailability(empStandard, '2026-12-01', context);
    expect(res.state).toBe('FREE');
    expect(res.forcedStatus).toBeUndefined();
  });

  it('forces FORCED_L for approved planned leave', () => {
    const res = resolveAvailability(empStandard, '2026-12-10', context);
    expect(res.state).toBe('FORCED_L');
    expect(res.forcedStatus).toBe('LEAVE');
    expect(res.reason).toContain('Family event');
  });

  it('forces FORCED_C for approved comp-off', () => {
    const res = resolveAvailability(empStandard, '2026-12-20', context);
    expect(res.state).toBe('FORCED_C');
    expect(res.forcedStatus).toBe('COMP_OFF');
  });

  it('does NOT force absence for PENDING leave requests', () => {
    const res = resolveAvailability(empPartTime, '2026-12-15', context);
    // 2026-12-15 is Tuesday, emp-2 has pending leave -> should still be FREE
    expect(res.state).toBe('FREE');
  });

  it('forces UNAVAILABLE_WEEKDAY for contractual blocked weekdays', () => {
    // 2026-12-02 is Wednesday (3) -> emp-2 is unavailable on Wednesdays
    const res = resolveAvailability(empPartTime, '2026-12-02', context);
    expect(res.state).toBe('UNAVAILABLE_WEEKDAY');
    expect(res.forcedStatus).toBe('WEEKLY_OFF');
  });

  it('forces FORCED_H when all primary processes are closed due to holiday', () => {
    // empStandard is PRIMARY on proc-1 (brand-holiday-obs), which observes Christmas
    const res = resolveAvailability(empStandard, '2026-12-25', context);
    expect(res.state).toBe('FORCED_H');
    expect(res.forcedStatus).toBe('HOLIDAY');
  });

  it('does NOT force FORCED_H if primary brand does not observe holidays (e.g. 365 brand)', () => {
    // empPartTime is PRIMARY on proc-2 (brand-365), which operates ALL_365
    const res = resolveAvailability(empPartTime, '2026-12-25', context);
    expect(res.state).toBe('FREE');
  });
});
