/**
 * Fast Incremental Validator for Single Cell Edits
 * Scoped check executed on cell edit in UI grid (<1ms response).
 */
import { validateConsecutiveDays } from './rules/consecutive';
import { validateAbsences } from './rules/absences';
import { validateAvailabilityAndPreferences } from './rules/availability';
import { validateCoverage } from './rules/coverage';
import type { Conflict, RosterEntryValidationInput } from './types';
import type { DomainSnapshot } from '@/domain/types';

export interface CellChangeInput {
  employeeId: string;
  date: string;
  newStatus: 'WORK' | 'WEEKLY_OFF' | 'HOLIDAY' | 'LEAVE' | 'COMP_OFF';
  newProcessId?: string | null;
}

export function validateCellChange(
  change: CellChangeInput,
  currentEntries: RosterEntryValidationInput[],
  monthDays: string[],
  snapshot: DomainSnapshot,
): Conflict[] {
  // Build speculative entries with the single cell changed
  const speculativeEntries: RosterEntryValidationInput[] = currentEntries.map((e) => {
    if (e.employeeId === change.employeeId && e.date === change.date) {
      return {
        ...e,
        status: change.newStatus,
        processId: change.newProcessId,
      };
    }
    return e;
  });

  // Filter scoped entries for this employee
  const empEntries = speculativeEntries.filter((e) => e.employeeId === change.employeeId);

  const conflicts: Conflict[] = [
    // 1. Check employee's consecutive days limit
    ...validateConsecutiveDays(monthDays, empEntries, snapshot),
    // 2. Check absence violation
    ...validateAbsences(empEntries, snapshot),
    // 3. Check unavailable weekday
    ...validateAvailabilityAndPreferences(empEntries, snapshot),
    // 4. Check coverage on this specific date
    ...validateCoverage([change.date], speculativeEntries, snapshot),
  ];

  return conflicts;
}
