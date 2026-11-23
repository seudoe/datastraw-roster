import { describe, it, expect } from 'vitest';
import { buildProblem } from '../buildProblem';
import type { DomainSnapshot } from '../types';

describe('buildProblem.ts - Flat Problem Builder for Solver Contract', () => {
  const snapshot: DomainSnapshot = {
    employees: [
      {
        id: 'emp-1',
        code: 'E01',
        name: 'Aarav Sharma',
        podId: 'pod-1',
        skills: ['CS'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0], // Sun
        unavailableWeekdays: [],
        maxConsecutiveWorkDays: 6,
        maxBackupBrandsPerDay: 2,
        active: true,
      },
      {
        id: 'emp-2',
        code: 'E02',
        name: 'Inactive Employee',
        podId: 'pod-1',
        skills: ['CS'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
        active: false, // Inactive
      },
    ],
    pods: [{ id: 'pod-1', name: 'Pod Alpha', leadId: 'emp-1' }],
    calendars: [
      {
        id: 'cal-365',
        name: '365 Days',
        rule: 'ALL_365',
        workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
        observesHolidays: false,
      },
    ],
    brands: [
      { id: 'brand-1', code: 'B1', name: 'Brand 1', calendarId: 'cal-365', priority: 3, active: true },
    ],
    processes: [
      { id: 'proc-1', brandId: 'brand-1', type: 'CS', name: 'CS Operations', defaultMinStaff: 1 },
    ],
    coverageRules: [],
    holidays: [],
    assignments: [
      { id: 'asgn-1', employeeId: 'emp-1', processId: 'proc-1', role: 'PRIMARY', allocationPct: 100 },
    ],
    absences: [
      {
        id: 'abs-1',
        employeeId: 'emp-1',
        type: 'PLANNED_LEAVE',
        startDate: '2026-12-15',
        endDate: '2026-12-16',
        status: 'APPROVED',
      },
    ],
    settings: {
      maxConsecutiveWorkDays: 6,
      maxBackupBrandsPerDay: 2,
      fiscalWeekStart: 1,
      compOffValidityDays: 30,
    },
  };

  it('compiles clean SolverProblemSpec for December 2026', () => {
    const problem = buildProblem('2026-12', snapshot, { profile: 'BALANCED', seed: 123 });

    expect(problem.month).toBe('2026-12');
    expect(problem.days.length).toBe(31);
    expect(problem.profile).toBe('BALANCED');
    expect(problem.seed).toBe(123);

    // Only active employees compiled
    expect(problem.employees.length).toBe(1);
    expect(problem.employees[0].id).toBe('emp-1');
    expect(problem.employees[0].primaryProcessIds).toEqual(['proc-1']);

    // Processes have demand mapped for all 31 days
    expect(problem.processes.length).toBe(1);
    expect(Object.keys(problem.processes[0].demand).length).toBe(31);
    expect(problem.processes[0].demand['2026-12-01']).toBe(1);

    // Forced states include approved leave dates
    const forcedLeave = problem.forced.filter((f) => f.status === 'LEAVE');
    expect(forcedLeave.length).toBe(2);
    expect(forcedLeave.map((f) => f.date)).toEqual(['2026-12-15', '2026-12-16']);
  });

  it('respects locked entries when passed in options', () => {
    const lockedEntries = [
      { employeeId: 'emp-1', date: '2026-12-01', status: 'WORK' as const },
    ];
    const problem = buildProblem('2026-12', snapshot, { lockedEntries });
    expect(problem.locks.length).toBe(1);
    expect(problem.locks[0]).toEqual(lockedEntries[0]);
  });
});
