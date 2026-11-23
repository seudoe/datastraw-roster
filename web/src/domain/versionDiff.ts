/**
 * Pure Roster Version Diff Engine
 * Compares two roster versions cell-by-cell and computes shift deltas,
 * status transitions, process reassignments, and aggregate metric deltas.
 */
import type { DayStatus } from '@/domain/types';

export interface RosterEntryLite {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: DayStatus;
  processId?: string | null;
  locked?: boolean;
}

export type DiffChangeType =
  | 'SHIFT_ADDED'
  | 'SHIFT_REMOVED'
  | 'PROCESS_CHANGED'
  | 'STATUS_CHANGED'
  | 'LOCK_CHANGED';

export interface CellDiffItem {
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  date: string;
  beforeStatus: DayStatus;
  afterStatus: DayStatus;
  beforeProcessId?: string | null;
  afterProcessId?: string | null;
  changeType: DiffChangeType;
  description: string;
}

export interface VersionDiffSummary {
  totalCellsCompared: number;
  totalChanges: number;
  shiftsAdded: number;
  shiftsRemoved: number;
  processReassignments: number;
  statusChanges: number;
  diffs: CellDiffItem[];
}

export function computeVersionDiff(
  versionAEntries: RosterEntryLite[],
  versionBEntries: RosterEntryLite[],
  employeeLookup?: Map<string, { code: string; name: string }>,
): VersionDiffSummary {
  const mapA = new Map<string, RosterEntryLite>();
  for (const e of versionAEntries) {
    mapA.set(`${e.employeeId}:${e.date}`, e);
  }

  const mapB = new Map<string, RosterEntryLite>();
  for (const e of versionBEntries) {
    mapB.set(`${e.employeeId}:${e.date}`, e);
  }

  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  const diffs: CellDiffItem[] = [];

  let shiftsAdded = 0;
  let shiftsRemoved = 0;
  let processReassignments = 0;
  let statusChanges = 0;

  for (const key of allKeys) {
    const entryA = mapA.get(key);
    const entryB = mapB.get(key);

    const [empId, date] = key.split(':');
    const empInfo = employeeLookup?.get(empId);

    const beforeStatus = entryA ? entryA.status : 'WEEKLY_OFF';
    const afterStatus = entryB ? entryB.status : 'WEEKLY_OFF';
    const beforeProc = entryA?.processId ?? null;
    const afterProc = entryB?.processId ?? null;

    // Check for differences
    if (beforeStatus !== afterStatus || beforeProc !== afterProc) {
      let changeType: DiffChangeType = 'STATUS_CHANGED';
      let description = `Status changed from ${beforeStatus} to ${afterStatus}`;

      if (beforeStatus !== 'WORK' && afterStatus === 'WORK') {
        changeType = 'SHIFT_ADDED';
        shiftsAdded++;
        description = `Assigned working shift (${afterProc || 'General'})`;
      } else if (beforeStatus === 'WORK' && afterStatus !== 'WORK') {
        changeType = 'SHIFT_REMOVED';
        shiftsRemoved++;
        description = `Removed working shift (now ${afterStatus})`;
      } else if (beforeStatus === 'WORK' && afterStatus === 'WORK' && beforeProc !== afterProc) {
        changeType = 'PROCESS_CHANGED';
        processReassignments++;
        description = `Process reassigned: ${beforeProc || 'None'} → ${afterProc || 'None'}`;
      } else {
        statusChanges++;
      }

      diffs.push({
        employeeId: empId,
        employeeCode: empInfo?.code,
        employeeName: empInfo?.name,
        date,
        beforeStatus,
        afterStatus,
        beforeProcessId: beforeProc,
        afterProcessId: afterProc,
        changeType,
        description,
      });
    }
  }

  // Sort diffs by date then employee code
  diffs.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.employeeCode || '').localeCompare(b.employeeCode || '');
  });

  return {
    totalCellsCompared: allKeys.size,
    totalChanges: diffs.length,
    shiftsAdded,
    shiftsRemoved,
    processReassignments,
    statusChanges,
    diffs,
  };
}
