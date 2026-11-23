/**
 * Consecutive Days Rule: MAX_CONSECUTIVE_EXCEEDED
 */
import { generateConflictFingerprint } from '../fingerprint';
import type { Conflict, RosterEntryValidationInput } from '../types';
import type { DomainSnapshot } from '@/domain/types';

export function validateConsecutiveDays(
  days: string[],
  entries: RosterEntryValidationInput[],
  snapshot: DomainSnapshot,
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Group entries by employee: employeeId -> Map<date, status>
  const empEntries = new Map<string, Map<string, string>>();
  for (const entry of entries) {
    if (!empEntries.has(entry.employeeId)) {
      empEntries.set(entry.employeeId, new Map());
    }
    empEntries.get(entry.employeeId)!.set(entry.date, entry.status);
  }

  for (const emp of snapshot.employees) {
    if (!emp.active) continue;
    const dateMap = empEntries.get(emp.id);
    if (!dateMap) continue;

    const maxConsecutive = emp.maxConsecutiveWorkDays ?? snapshot.settings.maxConsecutiveWorkDays ?? 6;
    const windowSize = maxConsecutive + 1;

    if (days.length < windowSize) continue;

    for (let i = 0; i <= days.length - windowSize; i++) {
      const windowDays = days.slice(i, i + windowSize);
      const allWorking = windowDays.every((d) => dateMap.get(d) === 'WORK');

      if (allWorking) {
        const lastDay = windowDays[windowDays.length - 1];
        conflicts.push({
          id: generateConflictFingerprint('MAX_CONSECUTIVE_EXCEEDED', lastDay, emp.id),
          code: 'MAX_CONSECUTIVE_EXCEEDED',
          severity: 'ERROR',
          message: `${emp.name} (${emp.code}) worked ${windowSize} consecutive days (${windowDays[0]} to ${lastDay}) exceeding limit of ${maxConsecutive}`,
          date: lastDay,
          employeeId: emp.id,
          details: {
            maxConsecutive,
            exceededDays: windowDays,
          },
        });
      }
    }
  }

  return conflicts;
}
