import { describe, it, expect } from 'vitest';
import { validateRoster } from '../validator/validateRoster';
import { validateCellChange } from '../validator/validateCellChange';
import { generateConflictFingerprint } from '../validator/fingerprint';
import { analyzeStructuralFeasibility } from '../analysis/structural';
import type { DomainSnapshot } from '../types';
import type { RosterEntryValidationInput, ConflictAckInput } from '../validator/types';

// ============================================================================
// Mock Baseline Snapshot
// ============================================================================

const mockSnapshot: DomainSnapshot = {
  employees: [
    {
      id: 'emp_01',
      code: 'EMP001',
      name: 'Aarav Sharma',
      podId: 'pod_01',
      skills: ['CS'],
      weeklyOffsPerWeek: 1,
      preferredOffWeekdays: [0, 6], // Sun, Sat
      unavailableWeekdays: [3], // Wed
      maxConsecutiveWorkDays: 6,
      maxBackupBrandsPerDay: 2,
      active: true,
    },
    {
      id: 'emp_02',
      code: 'EMP002',
      name: 'Diya Patel',
      podId: 'pod_01',
      skills: ['CS'],
      weeklyOffsPerWeek: 1,
      preferredOffWeekdays: [0],
      unavailableWeekdays: [],
      maxConsecutiveWorkDays: 6,
      maxBackupBrandsPerDay: 2,
      active: true,
    },
    {
      id: 'emp_floater',
      code: 'EMP_FLT',
      name: 'Rohan Gupta',
      podId: 'pod_01',
      skills: ['CS', 'ACC'],
      weeklyOffsPerWeek: 1,
      preferredOffWeekdays: [],
      unavailableWeekdays: [],
      maxConsecutiveWorkDays: 6,
      maxBackupBrandsPerDay: 2,
      active: true,
    },
  ],
  pods: [{ id: 'pod_01', name: 'Alpha Pod', leadId: 'emp_01' }],
  calendars: [
    {
      id: 'cal_all_365',
      name: '365 Days',
      rule: 'ALL_365',
      workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
      observesHolidays: false,
    },
    {
      id: 'cal_5day',
      name: '5 Days',
      rule: 'CUSTOM',
      workingWeekdays: [1, 2, 3, 4, 5],
      observesHolidays: true,
    },
  ],
  brands: [
    {
      id: 'brand_01',
      code: 'BR_01',
      name: 'Brand Normal',
      calendarId: 'cal_5day',
      priority: 2,
      active: true,
    },
    {
      id: 'brand_365',
      code: 'BR_03',
      name: 'ChaiCraft Organics',
      calendarId: 'cal_all_365',
      priority: 3,
      active: true,
    },
  ],
  processes: [
    {
      id: 'proc_01',
      brandId: 'brand_01',
      type: 'CS',
      name: 'Chat Desk',
      calendarId: null,
      defaultMinStaff: 1,
    },
    {
      id: 'proc_365',
      brandId: 'brand_365',
      type: 'CS',
      name: 'All Day CS',
      calendarId: null,
      defaultMinStaff: 1,
    },
  ],
  coverageRules: [],
  holidays: [],
  assignments: [
    {
      id: 'a1',
      employeeId: 'emp_01',
      processId: 'proc_01',
      role: 'PRIMARY',
      allocationPct: 100,
    },
    {
      id: 'a2',
      employeeId: 'emp_02',
      processId: 'proc_365',
      role: 'PRIMARY',
      allocationPct: 100,
    },
    {
      id: 'a3',
      employeeId: 'emp_floater',
      processId: 'proc_365',
      role: 'BACKUP',
      allocationPct: 100,
    },
  ],
  absences: [
    {
      id: 'abs_01',
      employeeId: 'emp_01',
      type: 'PLANNED_LEAVE',
      startDate: '2026-12-10',
      endDate: '2026-12-12',
      status: 'APPROVED',
      reason: 'Vacation',
    },
  ],
  settings: {
    maxConsecutiveWorkDays: 6,
    maxBackupBrandsPerDay: 2,
    fiscalWeekStart: 1,
    compOffValidityDays: 30,
  },
};

describe('Independent Conflict Validator & Taxonomy Suite', () => {
  const days = [
    '2026-12-01',
    '2026-12-02',
    '2026-12-03',
    '2026-12-04',
    '2026-12-05',
    '2026-12-06',
    '2026-12-07',
  ];

  // ==========================================================================
  // Coverage Tests
  // ==========================================================================

  it('1. detects COVERAGE_ZERO when required process has 0 assigned workers', () => {
    // 2026-12-01 is a Tuesday (working day for 5-day calendar). No one assigned.
    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-01', status: 'WEEKLY_OFF' },
      { employeeId: 'emp_02', date: '2026-12-01', status: 'WEEKLY_OFF' },
    ];

    const result = validateRoster('2026-12', entries, [], mockSnapshot);
    const zeroConf = result.conflicts.find((c) => c.code === 'COVERAGE_ZERO');

    expect(zeroConf).toBeDefined();
    expect(zeroConf?.severity).toBe('ERROR');
    expect(zeroConf?.date).toBe('2026-12-01');
    expect(result.isValid).toBe(false);
  });

  it('2. detects COVERAGE_BELOW_MIN when process demand is 2 but only 1 assigned', () => {
    const customSnapshot: DomainSnapshot = {
      ...mockSnapshot,
      coverageRules: [
        {
          id: 'rule_min2',
          processId: 'proc_01',
          weekday: 2, // Tuesday
          date: null,
          minStaff: 2,
        },
      ],
    };

    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-01', status: 'WORK', processId: 'proc_01' },
    ];

    const result = validateRoster('2026-12', entries, [], customSnapshot);
    const belowMin = result.conflicts.find((c) => c.code === 'COVERAGE_BELOW_MIN');

    expect(belowMin).toBeDefined();
    expect(belowMin?.severity).toBe('WARN');
    expect(belowMin?.details?.deficit).toBe(1);
  });

  // ==========================================================================
  // Absence Tests
  // ==========================================================================

  it('3. detects WORKING_WHILE_ABSENT when employee works during approved leave', () => {
    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-10', status: 'WORK', processId: 'proc_01' },
    ];

    const result = validateRoster('2026-12', entries, [], mockSnapshot);
    const leaveConf = result.conflicts.find((c) => c.code === 'WORKING_WHILE_ABSENT');

    expect(leaveConf).toBeDefined();
    expect(leaveConf?.severity).toBe('ERROR');
    expect(leaveConf?.employeeId).toBe('emp_01');
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('4. passes when employee is marked LEAVE during approved leave', () => {
    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-10', status: 'LEAVE' },
    ];

    const result = validateRoster('2026-12', entries, [], mockSnapshot);
    const leaveConf = result.conflicts.find((c) => c.code === 'WORKING_WHILE_ABSENT');

    expect(leaveConf).toBeUndefined();
  });

  // ==========================================================================
  // Consecutive Days Tests
  // ==========================================================================

  it('5. detects MAX_CONSECUTIVE_EXCEEDED when employee works 7 consecutive days', () => {
    // 7 consecutive work days
    const entries: RosterEntryValidationInput[] = days.map((d) => ({
      employeeId: 'emp_01',
      date: d,
      status: 'WORK',
      processId: 'proc_01',
    }));

    const result = validateRoster('2026-12', entries, [], mockSnapshot);
    const consecConf = result.conflicts.find((c) => c.code === 'MAX_CONSECUTIVE_EXCEEDED');

    expect(consecConf).toBeDefined();
    expect(consecConf?.severity).toBe('ERROR');
    expect(consecConf?.date).toBe('2026-12-07');
  });

  it('6. passes consecutive days rule when employee works 6 days then rests 1 day', () => {
    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-01', status: 'WORK', processId: 'proc_01' },
      { employeeId: 'emp_01', date: '2026-12-02', status: 'WORK', processId: 'proc_01' },
      { employeeId: 'emp_01', date: '2026-12-03', status: 'WORK', processId: 'proc_01' },
      { employeeId: 'emp_01', date: '2026-12-04', status: 'WORK', processId: 'proc_01' },
      { employeeId: 'emp_01', date: '2026-12-05', status: 'WORK', processId: 'proc_01' },
      { employeeId: 'emp_01', date: '2026-12-06', status: 'WORK', processId: 'proc_01' },
      { employeeId: 'emp_01', date: '2026-12-07', status: 'WEEKLY_OFF' },
    ];

    const result = validateRoster('2026-12', entries, [], mockSnapshot);
    const consecConf = result.conflicts.find((c) => c.code === 'MAX_CONSECUTIVE_EXCEEDED');

    expect(consecConf).toBeUndefined();
  });

  // ==========================================================================
  // Availability & Preference Tests
  // ==========================================================================

  it('7. detects UNAVAILABLE_WEEKDAY_WORKED when working on Wednesday (weekday 3)', () => {
    // 2026-12-02 is Wednesday (weekday 3)
    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-02', status: 'WORK', processId: 'proc_01' },
    ];

    const result = validateRoster('2026-12', entries, [], mockSnapshot);
    const unavail = result.conflicts.find((c) => c.code === 'UNAVAILABLE_WEEKDAY_WORKED');

    expect(unavail).toBeDefined();
    expect(unavail?.severity).toBe('ERROR');
  });

  it('8. detects WEEKLY_OFF_PREFERENCE_VIOLATED when working on preferred Sunday', () => {
    // 2026-12-06 is Sunday (weekday 0)
    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-06', status: 'WORK', processId: 'proc_01' },
    ];

    const result = validateRoster('2026-12', entries, [], mockSnapshot);
    const pref = result.conflicts.find((c) => c.code === 'WEEKLY_OFF_PREFERENCE_VIOLATED');

    expect(pref).toBeDefined();
    expect(pref?.severity).toBe('INFO');
  });

  // ==========================================================================
  // Backup Overload Tests
  // ==========================================================================

  it('9. detects BACKUP_OVERLOAD when assigned to 3 backup brands on same day (limit 2)', () => {
    const multiBrandSnapshot: DomainSnapshot = {
      ...mockSnapshot,
      brands: [
        ...mockSnapshot.brands,
        { id: 'brand_extra', code: 'BR_EXTRA', name: 'Extra', calendarId: 'cal_5day', priority: 1, active: true },
      ],
      processes: [
        ...mockSnapshot.processes,
        { id: 'proc_extra', brandId: 'brand_extra', type: 'CS', name: 'Extra CS', calendarId: null, defaultMinStaff: 1 },
      ],
    };

    const backupDuties = [
      { employeeId: 'emp_floater', processId: 'proc_01', date: '2026-12-01' },
      { employeeId: 'emp_floater', processId: 'proc_365', date: '2026-12-01' },
      { employeeId: 'emp_floater', processId: 'proc_extra', date: '2026-12-01' },
    ];

    const result = validateRoster('2026-12', [], backupDuties, multiBrandSnapshot);
    const overload = result.conflicts.find((c) => c.code === 'BACKUP_OVERLOAD');

    expect(overload).toBeDefined();
    expect(overload?.severity).toBe('WARN');
    expect(overload?.details?.brandCount).toBe(3);
  });

  // ==========================================================================
  // Cascade Gap Tests
  // ==========================================================================

  it('10. detects CASCADE_GAP when primary owner pulled to backup leaves primary brand unfilled', () => {
    // emp_01 has PRIMARY proc_01. Pulled to proc_365 as BACKUP.
    // proc_01 has 0 workers and demand 1.
    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-01', status: 'WORK', processId: 'proc_365', role: 'BACKUP' },
    ];

    const result = validateRoster('2026-12', entries, [], mockSnapshot);
    const cascade = result.conflicts.find((c) => c.code === 'CASCADE_GAP');

    expect(cascade).toBeDefined();
    expect(cascade?.severity).toBe('WARN');
    expect(cascade?.employeeId).toBe('emp_01');
  });

  // ==========================================================================
  // Weekly Offs Tests
  // ==========================================================================

  it('11. detects WEEKLY_OFF_MISSING when total monthly offs fall below target', () => {
    // 31 days with only 1 day off (target is 4)
    const fullMonthDays = Array.from({ length: 31 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`);
    const entries: RosterEntryValidationInput[] = fullMonthDays.map((d, idx) => ({
      employeeId: 'emp_01',
      date: d,
      status: idx === 0 ? 'WEEKLY_OFF' : 'WORK',
      processId: 'proc_01',
    }));

    const result = validateRoster('2026-12', entries, [], mockSnapshot);
    const offMissing = result.conflicts.find((c) => c.code === 'WEEKLY_OFF_MISSING');

    expect(offMissing).toBeDefined();
    expect(offMissing?.severity).toBe('WARN');
  });

  // ==========================================================================
  // Conflict Fingerprint Stability & Acknowledgment Tests
  // ==========================================================================

  it('12. generates consistent, deterministic fingerprints for identical conflicts', () => {
    const fp1 = generateConflictFingerprint('COVERAGE_ZERO', '2026-12-01', 'proc_01');
    const fp2 = generateConflictFingerprint('COVERAGE_ZERO', '2026-12-01', 'proc_01');
    const fpDiff = generateConflictFingerprint('COVERAGE_ZERO', '2026-12-02', 'proc_01');

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fpDiff);
    expect(fp1.startsWith('cnf_cove_')).toBe(true);
  });

  it('13. marks conflict as acknowledged and unblocks publish when acknowledged by Ops Manager', () => {
    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-01', status: 'WEEKLY_OFF' },
      { employeeId: 'emp_02', date: '2026-12-01', status: 'WEEKLY_OFF' },
    ];

    const fp = generateConflictFingerprint('COVERAGE_ZERO', '2026-12-01', 'proc_01');
    const acks: ConflictAckInput[] = [
      { fingerprint: fp, reason: 'Client requested scheduled downtime', ackBy: 'Ops Manager' },
    ];

    const result = validateRoster('2026-12', entries, [], mockSnapshot, acks);
    const ackedConf = result.conflicts.find((c) => c.id === fp);

    expect(ackedConf).toBeDefined();
    expect(ackedConf?.acknowledged).toBe(true);
    expect(ackedConf?.ackReason).toBe('Client requested scheduled downtime');

    // The acknowledged conflict is not counted in unacknowledged errors
    const unackedZeroErrors = result.conflicts.filter(
      (c) => c.id === fp && c.severity === 'ERROR' && !c.acknowledged,
    );
    expect(unackedZeroErrors.length).toBe(0);
  });

  // ==========================================================================
  // Incremental Cell Change Validation Tests (<1ms)
  // ==========================================================================

  it('14. validates a single cell edit incrementally without scanning whole roster', () => {
    const currentEntries: RosterEntryValidationInput[] = days.map((d) => ({
      employeeId: 'emp_01',
      date: d,
      status: 'WORK',
      processId: 'proc_01',
    }));

    // User attempts to make day 7 a WORK day too
    const cellConflicts = validateCellChange(
      { employeeId: 'emp_01', date: '2026-12-07', newStatus: 'WORK', newProcessId: 'proc_01' },
      currentEntries,
      days,
      mockSnapshot,
    );

    const consec = cellConflicts.find((c) => c.code === 'MAX_CONSECUTIVE_EXCEEDED');
    expect(consec).toBeDefined();
  });

  it('15. verifies that turning a day into WEEKLY_OFF immediately resolves consecutive days violation', () => {
    const currentEntries: RosterEntryValidationInput[] = days.map((d) => ({
      employeeId: 'emp_01',
      date: d,
      status: 'WORK',
      processId: 'proc_01',
    }));

    // Edit day 4 to WEEKLY_OFF
    const cellConflicts = validateCellChange(
      { employeeId: 'emp_01', date: '2026-12-04', newStatus: 'WEEKLY_OFF' },
      currentEntries,
      days,
      mockSnapshot,
    );

    const consec = cellConflicts.find((c) => c.code === 'MAX_CONSECUTIVE_EXCEEDED');
    expect(consec).toBeUndefined();
  });

  // ==========================================================================
  // Pre-Solve Structural Feasibility Analysis Tests
  // ==========================================================================

  it('16. detects structurally uncoverable 365 brand with 1 primary and 0 backups', () => {
    // ChaiCraft Organics (BR_03) operates 365 with 1 primary and no backups
    const snapshotWithSolo365: DomainSnapshot = {
      ...mockSnapshot,
      assignments: [
        { id: 'a1', employeeId: 'emp_01', processId: 'proc_01', role: 'PRIMARY', allocationPct: 100 },
        { id: 'a2', employeeId: 'emp_02', processId: 'proc_365', role: 'PRIMARY', allocationPct: 100 },
        // Notice: emp_floater has NO backup assignment here!
      ],
    };

    const summary = analyzeStructuralFeasibility(snapshotWithSolo365);
    const br03Report = summary.reports.find((r) => r.brandCode === 'BR_03');

    expect(br03Report).toBeDefined();
    expect(br03Report?.isStructurallyUncoverable).toBe(true);
    expect(br03Report?.weeklyDeficitEstimate).toBe(1);
    expect(br03Report?.findings[0]).toContain('guaranteeing 1 weekly coverage gap');
    expect(br03Report?.suggestedAction).toContain('Assign at least 1 cross-trained floater');
  });

  it('17. structural report flags Single Point of Failure (SPOF) when busFactor is 1', () => {
    // Brand Normal (BR_01) has only emp_01 and 0 backups
    const summary = analyzeStructuralFeasibility(mockSnapshot);
    const br01Report = summary.reports.find((r) => r.brandCode === 'BR_01');

    expect(br01Report).toBeDefined();
    expect(br01Report?.busFactor).toBe(1);
    expect(br01Report?.findings[0]).toContain('Single Point of Failure');
  });

  it('18. structural report marks brand coverable when floater backup is assigned', () => {
    // BR_03 with emp_02 (PRIMARY) + emp_floater (BACKUP) has busFactor = 2
    const summary = analyzeStructuralFeasibility(mockSnapshot);
    const br03Report = summary.reports.find((r) => r.brandCode === 'BR_03');

    expect(br03Report?.busFactor).toBe(2);
    expect(br03Report?.isStructurallyUncoverable).toBe(false);
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  it('19. handles zero active brands gracefully without throwing', () => {
    const emptySnapshot: DomainSnapshot = {
      ...mockSnapshot,
      brands: [],
    };
    const summary = analyzeStructuralFeasibility(emptySnapshot);
    expect(summary.totalBrands).toBe(0);
    expect(summary.uncoverableCount).toBe(0);
  });

  it('20. handles inactive employees correctly by excluding them from checks', () => {
    const inactiveSnapshot: DomainSnapshot = {
      ...mockSnapshot,
      employees: mockSnapshot.employees.map((e) => ({ ...e, active: false })),
    };
    const result = validateRoster('2026-12', [], [], inactiveSnapshot);
    expect(result.conflicts.filter((c) => c.code === 'MAX_CONSECUTIVE_EXCEEDED').length).toBe(0);
  });

  it('21. handles multiple overlapping leave periods across employees', () => {
    const multiAbsenceSnapshot: DomainSnapshot = {
      ...mockSnapshot,
      absences: [
        {
          id: 'abs_01',
          employeeId: 'emp_01',
          type: 'PLANNED_LEAVE',
          startDate: '2026-12-01',
          endDate: '2026-12-03',
          status: 'APPROVED',
        },
        {
          id: 'abs_02',
          employeeId: 'emp_02',
          type: 'SICK',
          startDate: '2026-12-02',
          endDate: '2026-12-04',
          status: 'APPROVED',
        },
      ],
    };

    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-02', status: 'WORK', processId: 'proc_01' },
      { employeeId: 'emp_02', date: '2026-12-02', status: 'WORK', processId: 'proc_365' },
    ];

    const result = validateRoster('2026-12', entries, [], multiAbsenceSnapshot);
    const leaveConf = result.conflicts.filter((c) => c.code === 'WORKING_WHILE_ABSENT');

    expect(leaveConf.length).toBe(2);
  });

  it('22. ignores REJECTED and PENDING absences for hard WORKING_WHILE_ABSENT checks', () => {
    const pendingSnapshot: DomainSnapshot = {
      ...mockSnapshot,
      absences: [
        {
          id: 'abs_pend',
          employeeId: 'emp_01',
          type: 'PLANNED_LEAVE',
          startDate: '2026-12-05',
          endDate: '2026-12-05',
          status: 'PENDING',
        },
      ],
    };

    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-05', status: 'WORK', processId: 'proc_01' },
    ];

    const result = validateRoster('2026-12', entries, [], pendingSnapshot);
    const leaveConf = result.conflicts.find((c) => c.code === 'WORKING_WHILE_ABSENT');

    expect(leaveConf).toBeUndefined();
  });

  it('23. correctly identifies process specific date override demand in coverage', () => {
    const dateOverrideSnapshot: DomainSnapshot = {
      ...mockSnapshot,
      coverageRules: [
        {
          id: 'rule_date',
          processId: 'proc_01',
          weekday: null,
          date: '2026-12-04', // Friday (normal operating day)
          minStaff: 3, // Special surge staffing
        },
      ],
    };

    // Only 1 worker assigned
    const entries: RosterEntryValidationInput[] = [
      { employeeId: 'emp_01', date: '2026-12-04', status: 'WORK', processId: 'proc_01' },
    ];

    const result = validateRoster('2026-12', entries, [], dateOverrideSnapshot);
    const belowMin = result.conflicts.find(
      (c) => c.code === 'COVERAGE_BELOW_MIN' && c.date === '2026-12-04',
    );

    expect(belowMin).toBeDefined();
    expect(belowMin?.details?.required).toBe(3);
    expect(belowMin?.details?.actual).toBe(1);
  });

  it('24. respects custom maxConsecutiveWorkDays per employee override', () => {
    const customConsecSnapshot: DomainSnapshot = {
      ...mockSnapshot,
      employees: [
        {
          ...mockSnapshot.employees[0],
          maxConsecutiveWorkDays: 4, // Strict 4-day max
        },
      ],
    };

    // 5 consecutive days
    const entries: RosterEntryValidationInput[] = days.slice(0, 5).map((d) => ({
      employeeId: 'emp_01',
      date: d,
      status: 'WORK',
      processId: 'proc_01',
    }));

    const result = validateRoster('2026-12', entries, [], customConsecSnapshot);
    const consec = result.conflicts.find((c) => c.code === 'MAX_CONSECUTIVE_EXCEEDED');

    expect(consec).toBeDefined();
    expect(consec?.details?.maxConsecutive).toBe(4);
  });

  it('25. calculates total error, warn, and info counts accurately in ValidationResult', () => {
    const entries: RosterEntryValidationInput[] = [
      // 1. Error: Working while absent
      { employeeId: 'emp_01', date: '2026-12-10', status: 'WORK', processId: 'proc_01' },
      // 2. Info: Working on preferred Sunday (2026-12-06)
      { employeeId: 'emp_01', date: '2026-12-06', status: 'WORK', processId: 'proc_01' },
    ];

    const result = validateRoster('2026-12', entries, [], mockSnapshot);

    expect(result.errorCount).toBeGreaterThanOrEqual(1);
    expect(result.infoCount).toBeGreaterThanOrEqual(1);
    expect(result.isValid).toBe(false);
  });

  it('26. validates the December 2026 baseline seed roster with zero critical unacknowledged errors', () => {
    // When all demand is covered across the full month, valid state is achieved
    const fullMonthDays = Array.from({ length: 31 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`);
    const fullMockEntries: RosterEntryValidationInput[] = [];

    for (const d of fullMonthDays) {
      const weekday = new Date(`${d}T00:00:00.000Z`).getUTCDay();
      const isWeekend = weekday === 0 || weekday === 6;

      // emp_01 works on proc_01 on weekdays, off on weekends (avoiding Wed unavailable & Sun preferred off)
      // Note: emp_01 has unavailable Wed (3) and leave on Dec 10-12
      const isWed = weekday === 3;
      const isLeave = d >= '2026-12-10' && d <= '2026-12-12';

      if (isWeekend || isWed || isLeave) {
        fullMockEntries.push({
          employeeId: 'emp_01',
          date: d,
          status: isLeave ? 'LEAVE' : 'WEEKLY_OFF',
        });
      } else {
        fullMockEntries.push({
          employeeId: 'emp_01',
          date: d,
          status: 'WORK',
          processId: 'proc_01',
        });
      }

      // emp_02 works on proc_365 (off on Sun)
      fullMockEntries.push({
        employeeId: 'emp_02',
        date: d,
        status: weekday === 0 ? 'WEEKLY_OFF' : 'WORK',
        processId: weekday === 0 ? null : 'proc_365',
      });

      // emp_floater covers proc_365 on Sun, covers proc_01 on Wed & leaves
      const floaterNeedsToWork = weekday === 0 || isWed || isLeave;
      fullMockEntries.push({
        employeeId: 'emp_floater',
        date: d,
        status: floaterNeedsToWork ? 'WORK' : 'WEEKLY_OFF',
        processId: weekday === 0 ? 'proc_365' : (isWed || isLeave ? 'proc_01' : null),
        role: floaterNeedsToWork ? 'BACKUP' : undefined,
      });
    }

    const result = validateRoster('2026-12', fullMockEntries, [], mockSnapshot);
    const unacknowledgedErrors = result.conflicts.filter((c) => c.severity === 'ERROR' && !c.acknowledged);

    expect(unacknowledgedErrors.length).toBe(0);
  });
});
