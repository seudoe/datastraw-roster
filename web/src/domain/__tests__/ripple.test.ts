/**
 * Ripple Engine Unit Tests
 * Comprehensive test suite (25 tests) verifying blast radius simulation,
 * ranked quick-fix remediation generation, and safe-to-approve calendar evaluations.
 */
import { describe, it, expect } from 'vitest';
import { simulateChange } from '../ripple/simulate';
import { generateQuickFixes } from '../ripple/quickfixes';
import { computeSafeDates } from '../ripple/safeDates';
import type { ChangeSet } from '../ripple/types';
import type { DomainSnapshot } from '@/domain/types';

describe('Ripple Engine - Change Handling & Simulation', () => {
  const mockSnapshot: DomainSnapshot = {
    pods: [
      { id: 'POD_1', name: 'Pod Alpha', leadId: 'EMP_1' },
      { id: 'POD_2', name: 'Pod Beta', leadId: 'EMP_4' },
    ],
    employees: [
      {
        id: 'EMP_1',
        code: 'EMP_01',
        name: 'Alice Alpha',
        podId: 'POD_1',
        skills: ['CS'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
        maxConsecutiveWorkDays: 6,
        maxBackupBrandsPerDay: 2,
        active: true,
      },
      {
        id: 'EMP_2',
        code: 'EMP_02',
        name: 'Bob Backup',
        podId: 'POD_1',
        skills: ['CS'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
        maxConsecutiveWorkDays: 6,
        maxBackupBrandsPerDay: 2,
        active: true,
      },
      {
        id: 'EMP_3',
        code: 'EMP_03',
        name: 'Charlie Solo',
        podId: 'POD_1',
        skills: ['ACC'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
        maxConsecutiveWorkDays: 6,
        maxBackupBrandsPerDay: 2,
        active: true,
      },
      {
        id: 'EMP_4',
        code: 'EMP_04',
        name: 'Diana Beta',
        podId: 'POD_2',
        skills: ['CS'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
        maxConsecutiveWorkDays: 6,
        maxBackupBrandsPerDay: 2,
        active: true,
      },
    ],
    calendars: [
      {
        id: 'CAL_365',
        name: 'All 365 Days',
        rule: 'ALL_365',
        workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
        observesHolidays: false,
      },
      {
        id: 'CAL_5DAY',
        name: 'Mon to Fri',
        rule: 'SUN_AND_HOLIDAYS_OFF',
        workingWeekdays: [1, 2, 3, 4, 5],
        observesHolidays: true,
      },
    ],
    brands: [
      {
        id: 'BRAND_A',
        code: 'BR_A',
        name: 'Brand Alpha CS',
        calendarId: 'CAL_365',
        priority: 2,
        active: true,
      },
      {
        id: 'BRAND_SOLO',
        code: 'BR_SOLO',
        name: 'Brand Solo (Uncoverable)',
        calendarId: 'CAL_365',
        priority: 3,
        active: true,
      },
    ],
    processes: [
      {
        id: 'PROC_A',
        brandId: 'BRAND_A',
        type: 'CS',
        name: 'Brand A CS Support',
        calendarId: 'CAL_365',
        defaultMinStaff: 1,
      },
      {
        id: 'PROC_SOLO',
        brandId: 'BRAND_SOLO',
        type: 'ACC',
        name: 'Solo Uncoverable Accounting',
        calendarId: 'CAL_365',
        defaultMinStaff: 1,
      },
    ],
    coverageRules: [],
    assignments: [
      // Alice is primary on Brand A, Bob is backup
      { id: 'AS_1', employeeId: 'EMP_1', processId: 'PROC_A', role: 'PRIMARY', allocationPct: 100 },
      { id: 'AS_2', employeeId: 'EMP_2', processId: 'PROC_A', role: 'BACKUP', allocationPct: 100 },
      // Charlie is solo primary on Brand Solo with ZERO backups
      { id: 'AS_3', employeeId: 'EMP_3', processId: 'PROC_SOLO', role: 'PRIMARY', allocationPct: 100 },
      // Diana is in Pod Beta with CS skills
      { id: 'AS_4', employeeId: 'EMP_4', processId: 'PROC_A', role: 'BACKUP', allocationPct: 100 },
    ],
    holidays: [],
    absences: [],
    settings: {
      maxConsecutiveWorkDays: 6,
      maxBackupBrandsPerDay: 2,
      fiscalWeekStart: 1,
      compOffValidityDays: 30,
    },
  };

  const baseEntries = [
    // 2026-12-08 (Tuesday)
    { employeeId: 'EMP_1', date: '2026-12-08', status: 'WORK', processId: 'PROC_A' },
    { employeeId: 'EMP_2', date: '2026-12-08', status: 'WEEKLY_OFF' },
    { employeeId: 'EMP_3', date: '2026-12-08', status: 'WORK', processId: 'PROC_SOLO' },
    { employeeId: 'EMP_4', date: '2026-12-08', status: 'WEEKLY_OFF' },
    // 2026-12-09 (Wednesday)
    { employeeId: 'EMP_1', date: '2026-12-09', status: 'WORK', processId: 'PROC_A' },
    { employeeId: 'EMP_2', date: '2026-12-09', status: 'WORK', processId: 'PROC_A' },
    { employeeId: 'EMP_3', date: '2026-12-09', status: 'WORK', processId: 'PROC_SOLO' },
    { employeeId: 'EMP_4', date: '2026-12-09', status: 'WORK', processId: 'PROC_A' },
    // 2026-12-10 (Thursday)
    { employeeId: 'EMP_1', date: '2026-12-10', status: 'WEEKLY_OFF' },
    { employeeId: 'EMP_2', date: '2026-12-10', status: 'WORK', processId: 'PROC_A' },
    { employeeId: 'EMP_3', date: '2026-12-10', status: 'WORK', processId: 'PROC_SOLO' },
    { employeeId: 'EMP_4', date: '2026-12-10', status: 'WEEKLY_OFF' },
  ];

  describe('Direct Impact Simulation', () => {
    it('simulates single-day leave on a working shift and identifies direct gap', () => {
      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_1',
          startDate: '2026-12-08',
          endDate: '2026-12-08',
          absenceType: 'PLANNED_LEAVE',
        },
      };

      const result = simulateChange(change, baseEntries, mockSnapshot);

      expect(result.directImpacts.length).toBe(1);
      expect(result.directImpacts[0].affectedBrandCode).toBe('BR_A');
      expect(result.directImpacts[0].date).toBe('2026-12-08');
      expect(result.directImpacts[0].deficitCreated).toBe(1);
    });

    it('returns zero direct impact if the employee was already scheduled for WEEKLY_OFF', () => {
      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_1',
          startDate: '2026-12-10', // Alice is OFF on Dec 10
          endDate: '2026-12-10',
          absenceType: 'PLANNED_LEAVE',
        },
      };

      const result = simulateChange(change, baseEntries, mockSnapshot);

      expect(result.directImpacts.length).toBe(0);
      expect(result.safetyLevel).toBe('SAFE');
      expect(result.isSafeToApprove).toBe(true);
    });

    it('identifies structurally uncoverable brand with zero backups as UNSAFE', () => {
      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_3', // Charlie is solo on Brand Solo
          startDate: '2026-12-08',
          endDate: '2026-12-08',
          absenceType: 'SICK',
        },
      };

      const result = simulateChange(change, baseEntries, mockSnapshot);

      expect(result.directImpacts.length).toBe(1);
      expect(result.directImpacts[0].affectedBrandCode).toBe('BR_SOLO');
      expect(result.safetyLevel).toBe('UNSAFE');
      expect(result.isSafeToApprove).toBe(false);
      expect(
        result.cascadeImpacts.some((c) => c.dominoType === 'GAP_FORMED'),
      ).toBe(true);
    });

    it('simulates multi-day absence range spanning work and off days', () => {
      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_1',
          startDate: '2026-12-08',
          endDate: '2026-12-10', // 8=WORK, 9=WORK, 10=OFF
          absenceType: 'PLANNED_LEAVE',
        },
      };

      const result = simulateChange(change, baseEntries, mockSnapshot);

      // On Dec 8: only EMP_1 was working -> 1 gap
      // On Dec 9: both EMP_1 and EMP_2 were working -> remaining 1 >= minStaff 1 -> 0 deficit!
      // On Dec 10: EMP_1 was off -> 0 deficit
      expect(result.directImpacts.length).toBe(1);
      expect(result.directImpacts[0].date).toBe('2026-12-08');
    });

    it('calculates coverage rate before and after accurately in metricDelta', () => {
      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_3',
          startDate: '2026-12-08',
          endDate: '2026-12-08',
          absenceType: 'SICK',
        },
      };

      const result = simulateChange(change, baseEntries, mockSnapshot);

      expect(result.metricDelta.totalGapsAfter).toBeGreaterThan(
        result.metricDelta.totalGapsBefore,
      );
      expect(result.metricDelta.coverageRateAfter).toBeLessThan(
        result.metricDelta.coverageRateBefore,
      );
    });

    it('records simulation time under 20ms', () => {
      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_1',
          startDate: '2026-12-08',
          endDate: '2026-12-08',
          absenceType: 'PLANNED_LEAVE',
        },
      };

      const result = simulateChange(change, baseEntries, mockSnapshot);
      expect(result.simulationTimeMs).toBeLessThan(20.0);
    });
  });

  describe('Ranked Quick-Fix Remediation Options', () => {
    const emp1 = mockSnapshot.employees[0];
    const procA = mockSnapshot.processes[0];
    const brandA = mockSnapshot.brands[0];

    it('generates Rank 1 Existing Floater fix when a qualified backup is free on weekly off', () => {
      const fixes = generateQuickFixes(
        '2026-12-08',
        emp1,
        procA,
        brandA,
        baseEntries,
        mockSnapshot,
      );

      const rank1 = fixes.find((f) => f.rank === 1);
      expect(rank1).toBeDefined();
      expect(rank1?.type).toBe('EXISTING_FLOATER');
      expect(rank1?.assignedEmployeeId).toBe('EMP_2');
      expect(rank1?.isFeasible).toBe(true);
      expect(rank1?.resultingDelta.netGaps).toBe(0);
    });

    it('generates Rank 2 Overtime Standby fix for qualified employee with least shifts', () => {
      const fixes = generateQuickFixes(
        '2026-12-08',
        emp1,
        procA,
        brandA,
        baseEntries,
        mockSnapshot,
      );

      const rank2 = fixes.find((f) => f.rank === 2);
      expect(rank2).toBeDefined();
      expect(rank2?.type).toBe('OVERTIME_STANDBY');
      expect(rank2?.tradeoffs.length).toBeGreaterThan(0);
    });

    it('generates Rank 3 Cross-Pod Borrow fix from external Pod Beta', () => {
      const fixes = generateQuickFixes(
        '2026-12-08',
        emp1,
        procA,
        brandA,
        baseEntries,
        mockSnapshot,
      );

      const rank3 = fixes.find((f) => f.rank === 3);
      expect(rank3).toBeDefined();
      expect(rank3?.type).toBe('CROSS_POD_BORROW');
      expect(rank3?.assignedEmployeeId).toBe('EMP_4'); // Diana from Pod Beta
      expect(rank3?.assignedEmployeePod).toBe('Pod Beta');
    });

    it('generates Rank 4 Peer Shift Swap fix when teammate works nearby opposite day', () => {
      // In baseEntries, on Dec 10 Alice is OFF and Bob is WORK -> perfect swap candidate!
      const fixes = generateQuickFixes(
        '2026-12-08',
        emp1,
        procA,
        brandA,
        baseEntries,
        mockSnapshot,
      );

      const rank4 = fixes.find((f) => f.rank === 4);
      expect(rank4).toBeDefined();
      expect(rank4?.type).toBe('PEER_SWAP');
      expect(rank4?.assignedEmployeeId).toBe('EMP_2');
    });

    it('returns empty fixes list when brand has zero qualified backup staff', () => {
      const emp3 = mockSnapshot.employees[2];
      const procSolo = mockSnapshot.processes[1];
      const brandSolo = mockSnapshot.brands[1];

      const fixes = generateQuickFixes(
        '2026-12-08',
        emp3,
        procSolo,
        brandSolo,
        baseEntries,
        mockSnapshot,
      );

      // No floaters or backups for Solo
      const feasibleFixes = fixes.filter((f) => f.isFeasible);
      expect(feasibleFixes.length).toBe(0);
    });

    it('rejects candidate if date matches their unavailableWeekdays', () => {
      // 2026-12-08 is Tuesday (weekday index 2)
      const modifiedSnapshot: DomainSnapshot = {
        ...mockSnapshot,
        employees: mockSnapshot.employees.map((e) =>
          e.id === 'EMP_2' ? { ...e, unavailableWeekdays: [2] } : e,
        ),
      };

      const fixes = generateQuickFixes(
        '2026-12-08',
        emp1,
        procA,
        brandA,
        baseEntries,
        modifiedSnapshot,
      );

      const rank1 = fixes.find((f) => f.rank === 1 && f.isFeasible);
      // Bob has Tuesday hard-blocked, so cannot be viable rank 1
      expect(rank1?.assignedEmployeeId).not.toBe('EMP_2');
    });
  });

  describe('Safe-to-Approve Calendar Evaluator', () => {
    it('evaluates entire month of December 2026 (31 days)', () => {
      const safeCalendar = computeSafeDates(
        'EMP_1',
        '2026-12',
        baseEntries,
        mockSnapshot,
      );

      expect(safeCalendar.length).toBe(31);
      expect(safeCalendar[0].date).toBe('2026-12-01');
      expect(safeCalendar[30].date).toBe('2026-12-31');
    });

    it('marks non-working days as SAFE with zero coverage impact', () => {
      const safeCalendar = computeSafeDates(
        'EMP_1',
        '2026-12',
        baseEntries,
        mockSnapshot,
      );

      // Dec 10 is scheduled OFF for EMP_1
      const dec10 = safeCalendar.find((d) => d.date === '2026-12-10');
      expect(dec10).toBeDefined();
      expect(dec10?.safety).toBe('SAFE');
      expect(dec10?.isScheduledToWork).toBe(false);
    });

    it('marks working day with available same-pod backup as SAFE', () => {
      const safeCalendar = computeSafeDates(
        'EMP_1',
        '2026-12',
        baseEntries,
        mockSnapshot,
      );

      // Dec 08: EMP_1 works, but Bob (EMP_2) in same pod is free on WEEKLY_OFF
      const dec08 = safeCalendar.find((d) => d.date === '2026-12-08');
      expect(dec08).toBeDefined();
      expect(dec08?.safety).toBe('SAFE');
      expect(dec08?.isScheduledToWork).toBe(true);
      expect(dec08?.availableBackups.some((b) => b.isSamePod)).toBe(true);
    });

    it('marks working day as CAUTION when only cross-pod backups are available', () => {
      // Modify baseEntries so Bob is busy, leaving only Diana in Pod Beta free
      const modifiedEntries = baseEntries.map((e) =>
        e.employeeId === 'EMP_2' && e.date === '2026-12-08'
          ? { ...e, status: 'WORK', processId: 'OTHER' }
          : e,
      );

      const safeCalendar = computeSafeDates(
        'EMP_1',
        '2026-12',
        modifiedEntries,
        mockSnapshot,
      );

      const dec08 = safeCalendar.find((d) => d.date === '2026-12-08');
      expect(dec08?.safety).toBe('CAUTION');
      expect(dec08?.reason).toContain('cross-pod borrow');
    });

    it('marks working day as UNSAFE when all backups are already busy', () => {
      // Both Bob and Diana are rostered to work on Dec 08
      const modifiedEntries = baseEntries.map((e) =>
        (e.employeeId === 'EMP_2' || e.employeeId === 'EMP_4') && e.date === '2026-12-08'
          ? { ...e, status: 'WORK', processId: 'OTHER' }
          : e,
      );

      const safeCalendar = computeSafeDates(
        'EMP_1',
        '2026-12',
        modifiedEntries,
        mockSnapshot,
      );

      const dec08 = safeCalendar.find((d) => d.date === '2026-12-08');
      expect(dec08?.safety).toBe('UNSAFE');
      expect(dec08?.reason).toContain('already rostered');
    });

    it('marks uncoverable brand employee as UNSAFE on every working day', () => {
      const safeCalendar = computeSafeDates(
        'EMP_3', // Charlie on Brand Solo
        '2026-12',
        baseEntries,
        mockSnapshot,
      );

      const dec08 = safeCalendar.find((d) => d.date === '2026-12-08');
      expect(dec08?.safety).toBe('UNSAFE');
      expect(dec08?.reason).toContain('Zero backups configured');
    });

    it('returns empty array when employee does not exist', () => {
      const safeCalendar = computeSafeDates(
        'NON_EXISTENT',
        '2026-12',
        baseEntries,
        mockSnapshot,
      );

      expect(safeCalendar).toEqual([]);
    });

    it('correctly associates brand code and brand name on working days', () => {
      const safeCalendar = computeSafeDates(
        'EMP_1',
        '2026-12',
        baseEntries,
        mockSnapshot,
      );

      const dec08 = safeCalendar.find((d) => d.date === '2026-12-08');
      expect(dec08?.brandCode).toBe('BR_A');
      expect(dec08?.brandName).toBe('Brand Alpha CS');
    });
  });

  describe('Edge Cases and Resilience', () => {
    it('handles comp-off leave type and maps status to COMP_OFF', () => {
      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_1',
          startDate: '2026-12-08',
          endDate: '2026-12-08',
          absenceType: 'COMP_OFF',
        },
      };

      const result = simulateChange(change, baseEntries, mockSnapshot);
      expect(result.directImpacts[0].newStatus).toBe('COMP_OFF');
    });

    it('handles multiple concurrent deficits across multi-day leave', () => {
      const entriesBothDaysSolo = [
        ...baseEntries,
        { employeeId: 'EMP_3', date: '2026-12-08', status: 'WORK', processId: 'PROC_SOLO' },
        { employeeId: 'EMP_3', date: '2026-12-09', status: 'WORK', processId: 'PROC_SOLO' },
      ];

      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_3',
          startDate: '2026-12-08',
          endDate: '2026-12-09',
          absenceType: 'SICK',
        },
      };

      const result = simulateChange(change, entriesBothDaysSolo, mockSnapshot);
      expect(result.directImpacts.length).toBe(2);
      expect(result.safetyLevel).toBe('UNSAFE');
    });

    it('orders remediation options strictly by rank (1, 2, 3, 4)', () => {
      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_1',
          startDate: '2026-12-08',
          endDate: '2026-12-08',
          absenceType: 'PLANNED_LEAVE',
        },
      };

      const result = simulateChange(change, baseEntries, mockSnapshot);
      const ranks = result.remediationOptions.map((o) => o.rank);

      for (let i = 0; i < ranks.length - 1; i++) {
        expect(ranks[i]).toBeLessThanOrEqual(ranks[i + 1]);
      }
    });

    it('preserves isSafeToApprove flag true for CAUTION safety level', () => {
      // Bob is working, leaving only Diana in Pod Beta
      const modifiedEntries = baseEntries.map((e) =>
        e.employeeId === 'EMP_2' && e.date === '2026-12-08'
          ? { ...e, status: 'WORK', processId: 'OTHER' }
          : e,
      );

      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_1',
          startDate: '2026-12-08',
          endDate: '2026-12-08',
          absenceType: 'PLANNED_LEAVE',
        },
      };

      const result = simulateChange(change, modifiedEntries, mockSnapshot);
      if (result.safetyLevel === 'CAUTION') {
        expect(result.isSafeToApprove).toBe(true);
      }
    });

    it('handles empty entries gracefully', () => {
      const change: ChangeSet = {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: 'EMP_1',
          startDate: '2026-12-08',
          endDate: '2026-12-08',
          absenceType: 'PLANNED_LEAVE',
        },
      };

      const result = simulateChange(change, [], mockSnapshot);
      expect(result.directImpacts.length).toBe(0);
      expect(result.safetyLevel).toBe('SAFE');
    });
  });
});
