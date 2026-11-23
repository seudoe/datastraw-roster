/**
 * Unit Tests for Version Diff Engine
 * Verifies cell-by-cell differential tracking between roster versions,
 * shift addition/removal categorization, and process reassignments.
 */
import { describe, it, expect } from 'vitest';
import { computeVersionDiff, type RosterEntryLite } from '../versionDiff';

describe('Version Diff Engine', () => {
  const empLookup = new Map<string, { code: string; name: string }>([
    ['EMP_1', { code: 'EMP_01', name: 'Alice Alpha' }],
    ['EMP_2', { code: 'EMP_02', name: 'Bob Backup' }],
  ]);

  it('reports zero diffs when versions are identical', () => {
    const entriesA: RosterEntryLite[] = [
      { employeeId: 'EMP_1', date: '2026-12-01', status: 'WORK', processId: 'PROC_1' },
      { employeeId: 'EMP_2', date: '2026-12-01', status: 'WEEKLY_OFF' },
    ];
    const entriesB: RosterEntryLite[] = [
      { employeeId: 'EMP_1', date: '2026-12-01', status: 'WORK', processId: 'PROC_1' },
      { employeeId: 'EMP_2', date: '2026-12-01', status: 'WEEKLY_OFF' },
    ];

    const result = computeVersionDiff(entriesA, entriesB, empLookup);
    expect(result.totalChanges).toBe(0);
    expect(result.diffs.length).toBe(0);
  });

  it('detects shift addition (WEEKLY_OFF -> WORK)', () => {
    const entriesA: RosterEntryLite[] = [
      { employeeId: 'EMP_2', date: '2026-12-01', status: 'WEEKLY_OFF' },
    ];
    const entriesB: RosterEntryLite[] = [
      { employeeId: 'EMP_2', date: '2026-12-01', status: 'WORK', processId: 'PROC_1' },
    ];

    const result = computeVersionDiff(entriesA, entriesB, empLookup);
    expect(result.totalChanges).toBe(1);
    expect(result.shiftsAdded).toBe(1);
    expect(result.diffs[0].changeType).toBe('SHIFT_ADDED');
    expect(result.diffs[0].employeeCode).toBe('EMP_02');
  });

  it('detects shift removal (WORK -> LEAVE)', () => {
    const entriesA: RosterEntryLite[] = [
      { employeeId: 'EMP_1', date: '2026-12-01', status: 'WORK', processId: 'PROC_1' },
    ];
    const entriesB: RosterEntryLite[] = [
      { employeeId: 'EMP_1', date: '2026-12-01', status: 'LEAVE' },
    ];

    const result = computeVersionDiff(entriesA, entriesB, empLookup);
    expect(result.totalChanges).toBe(1);
    expect(result.shiftsRemoved).toBe(1);
    expect(result.diffs[0].changeType).toBe('SHIFT_REMOVED');
    expect(result.diffs[0].beforeStatus).toBe('WORK');
    expect(result.diffs[0].afterStatus).toBe('LEAVE');
  });

  it('detects process reassignment on working shift', () => {
    const entriesA: RosterEntryLite[] = [
      { employeeId: 'EMP_1', date: '2026-12-01', status: 'WORK', processId: 'PROC_ALPHA' },
    ];
    const entriesB: RosterEntryLite[] = [
      { employeeId: 'EMP_1', date: '2026-12-01', status: 'WORK', processId: 'PROC_BETA' },
    ];

    const result = computeVersionDiff(entriesA, entriesB, empLookup);
    expect(result.totalChanges).toBe(1);
    expect(result.processReassignments).toBe(1);
    expect(result.diffs[0].changeType).toBe('PROCESS_CHANGED');
    expect(result.diffs[0].beforeProcessId).toBe('PROC_ALPHA');
    expect(result.diffs[0].afterProcessId).toBe('PROC_BETA');
  });

  it('aggregates multiple differential transitions across dates', () => {
    const entriesA: RosterEntryLite[] = [
      { employeeId: 'EMP_1', date: '2026-12-01', status: 'WORK', processId: 'PROC_1' },
      { employeeId: 'EMP_2', date: '2026-12-01', status: 'WEEKLY_OFF' },
      { employeeId: 'EMP_1', date: '2026-12-02', status: 'WORK', processId: 'PROC_1' },
    ];
    const entriesB: RosterEntryLite[] = [
      { employeeId: 'EMP_1', date: '2026-12-01', status: 'LEAVE' }, // removed
      { employeeId: 'EMP_2', date: '2026-12-01', status: 'WORK', processId: 'PROC_1' }, // added
      { employeeId: 'EMP_1', date: '2026-12-02', status: 'WORK', processId: 'PROC_2' }, // reassigned
    ];

    const result = computeVersionDiff(entriesA, entriesB, empLookup);
    expect(result.totalChanges).toBe(3);
    expect(result.shiftsRemoved).toBe(1);
    expect(result.shiftsAdded).toBe(1);
    expect(result.processReassignments).toBe(1);
  });
});
