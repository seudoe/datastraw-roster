/**
 * Availability & Weekly-off Preference Rules:
 * - UNAVAILABLE_WEEKDAY_WORKED (ERROR)
 * - WEEKLY_OFF_PREFERENCE_VIOLATED (INFO/WARN)
 */
import { getWeekday } from '@/domain/dates';
import { generateConflictFingerprint } from '../fingerprint';
import type { Conflict, RosterEntryValidationInput } from '../types';
import type { DomainSnapshot } from '@/domain/types';

export function validateAvailabilityAndPreferences(
  entries: RosterEntryValidationInput[],
  snapshot: DomainSnapshot,
): Conflict[] {
  const conflicts: Conflict[] = [];
  const empById = new Map(snapshot.employees.map((e) => [e.id, e]));
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const entry of entries) {
    if (entry.status !== 'WORK') continue;

    const emp = empById.get(entry.employeeId);
    if (!emp) continue;

    const weekday = getWeekday(entry.date);

    // 1. Hard unavailable weekday violation
    if (emp.unavailableWeekdays && emp.unavailableWeekdays.includes(weekday)) {
      conflicts.push({
        id: generateConflictFingerprint('UNAVAILABLE_WEEKDAY_WORKED', entry.date, emp.id),
        code: 'UNAVAILABLE_WEEKDAY_WORKED',
        severity: 'ERROR',
        message: `${emp.name} (${emp.code}) is scheduled to WORK on an unavailable weekday (${weekdayNames[weekday]})`,
        date: entry.date,
        employeeId: emp.id,
        details: { weekday, weekdayName: weekdayNames[weekday] },
      });
    }

    // 2. Soft preferred weekly off violation
    if (emp.preferredOffWeekdays && emp.preferredOffWeekdays.includes(weekday)) {
      conflicts.push({
        id: generateConflictFingerprint('WEEKLY_OFF_PREFERENCE_VIOLATED', entry.date, emp.id),
        code: 'WEEKLY_OFF_PREFERENCE_VIOLATED',
        severity: 'INFO',
        message: `${emp.name} (${emp.code}) works on preferred off day (${weekdayNames[weekday]})`,
        date: entry.date,
        employeeId: emp.id,
        details: { weekday, weekdayName: weekdayNames[weekday] },
      });
    }
  }

  return conflicts;
}
