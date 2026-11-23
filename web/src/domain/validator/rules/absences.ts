/**
 * Absence Rule: WORKING_WHILE_ABSENT
 */
import { generateConflictFingerprint } from '../fingerprint';
import type { Conflict, RosterEntryValidationInput } from '../types';
import type { DomainSnapshot } from '@/domain/types';

export function validateAbsences(
  entries: RosterEntryValidationInput[],
  snapshot: DomainSnapshot,
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Index approved absences: (employeeId, date) -> absence
  const absenceMap = new Map<string, string>(); // `${empId}:${date}` -> reason/type

  for (const abs of snapshot.absences) {
    if (abs.status !== 'APPROVED') continue;
    // Iterate through absence range
    const start = abs.startDate;
    const end = abs.endDate;

    for (const entry of entries) {
      if (entry.employeeId === abs.employeeId && entry.date >= start && entry.date <= end) {
        absenceMap.set(`${entry.employeeId}:${entry.date}`, `${abs.type} (${abs.reason || 'Approved'})`);
      }
    }
  }

  for (const entry of entries) {
    if (entry.status === 'WORK') {
      const absInfo = absenceMap.get(`${entry.employeeId}:${entry.date}`);
      if (absInfo) {
        const emp = snapshot.employees.find((e) => e.id === entry.employeeId);
        conflicts.push({
          id: generateConflictFingerprint('WORKING_WHILE_ABSENT', entry.date, entry.employeeId),
          code: 'WORKING_WHILE_ABSENT',
          severity: 'ERROR',
          message: `${emp?.name || 'Employee'} (${emp?.code}) is scheduled to WORK on approved leave day: ${absInfo}`,
          date: entry.date,
          employeeId: entry.employeeId,
          details: { absence: absInfo },
        });
      }
    }
  }

  return conflicts;
}
