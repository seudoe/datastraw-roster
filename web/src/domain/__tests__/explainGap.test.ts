/**
 * Unit Tests for Grounded Gap Explanations
 * Verifies that mathematical coverage deficits are converted into operational,
 * human-readable explanations citing labor constraints and topology.
 */
import { describe, it, expect } from 'vitest';
import { explainCoverageGap } from '../analysis/explainGap';
import type { DomainSnapshot } from '@/domain/types';

describe('Grounded Gap Explanation Engine', () => {
  const mockSnapshot: DomainSnapshot = {
    pods: [{ id: 'POD_1', name: 'Pod Alpha' }],
    employees: [
      {
        id: 'EMP_1',
        code: 'EMP_01',
        name: 'Arjun Verma',
        podId: 'POD_1',
        skills: ['CS'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
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
    ],
    brands: [
      {
        id: 'BR_03',
        code: 'BR_03',
        name: 'IndiSpices Gourmet',
        calendarId: 'CAL_365',
        priority: 3,
        active: true,
      },
    ],
    processes: [
      {
        id: 'PROC_03',
        brandId: 'BR_03',
        type: 'CS',
        name: 'Gourmet CS',
        calendarId: 'CAL_365',
        defaultMinStaff: 1,
      },
    ],
    coverageRules: [],
    assignments: [
      { id: 'A1', employeeId: 'EMP_1', processId: 'PROC_03', role: 'PRIMARY', allocationPct: 100 },
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

  it('explains structural 365-day gap on single-resource brand with zero backups', () => {
    const explanation = explainCoverageGap(
      { brandCode: 'BR_03', date: '2026-12-07', deficit: 1 },
      mockSnapshot,
    );

    expect(explanation.brandCode).toBe('BR_03');
    expect(explanation.brandName).toBe('IndiSpices Gourmet');
    expect(explanation.rootCause).toContain('continuous 365-day schedules with only 1 primary agent');
    expect(explanation.rootCause).toContain('ZERO backups');
    expect(explanation.governingConstraint).toContain('Rolling 6-Day Maximum Continuous Work Days');
    expect(explanation.recommendedRemedy).toContain('Certify a cross-trained floater');
  });

  it('formats weekday correctly for the specified date', () => {
    // 2026-12-07 is Monday
    const explanation = explainCoverageGap(
      { brandCode: 'BR_03', date: '2026-12-07', deficit: 1 },
      mockSnapshot,
    );

    expect(explanation.weekday).toBe('Mon');
  });

  it('includes assigned staff summary with employee code and name', () => {
    const explanation = explainCoverageGap(
      { brandCode: 'BR_03', date: '2026-12-07', deficit: 1 },
      mockSnapshot,
    );

    expect(explanation.assignedStaffSummary).toContain('Arjun Verma (EMP_01)');
    expect(explanation.assignedStaffSummary).toContain('Backups: None configured');
  });

  it('explains backup contention when backups exist but are busy', () => {
    const snapshotWithBackup: DomainSnapshot = {
      ...mockSnapshot,
      employees: [
        ...mockSnapshot.employees,
        {
          id: 'EMP_2',
          code: 'EMP_02',
          name: 'Bob Backup',
          podId: 'POD_1',
          skills: ['CS'],
          weeklyOffsPerWeek: 1,
          preferredOffWeekdays: [0],
          unavailableWeekdays: [],
          active: true,
        },
      ],
      assignments: [
        ...mockSnapshot.assignments,
        { id: 'A2', employeeId: 'EMP_2', processId: 'PROC_03', role: 'BACKUP', allocationPct: 100 },
      ],
    };

    const explanation = explainCoverageGap(
      { brandCode: 'BR_03', date: '2026-12-07', deficit: 1 },
      snapshotWithBackup,
    );

    expect(explanation.governingConstraint).toContain('Concurrent Absence');
    expect(explanation.assignedStaffSummary).toContain('Backups: Bob Backup (EMP_02)');
  });
});
