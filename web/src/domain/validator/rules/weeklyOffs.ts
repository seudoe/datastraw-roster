/**
 * Weekly Offs Missing Rule: WEEKLY_OFF_MISSING
 */
import { getIsoWeeksForMonth } from '@/domain/dates';
import { generateConflictFingerprint } from '../fingerprint';
import type { Conflict, RosterEntryValidationInput } from '../types';
import type { DomainSnapshot } from '@/domain/types';

export function validateWeeklyOffs(
  month: string,
  entries: RosterEntryValidationInput[],
  snapshot: DomainSnapshot,
): Conflict[] {
  const conflicts: Conflict[] = [];
  const isoWeeks = getIsoWeeksForMonth(month, snapshot.settings.fiscalWeekStart ?? 1);
  const baseTarget = isoWeeks.reduce((sum, w) => sum + w.proratedOffTarget, 0);

  // Group entries by employee
  const entriesByEmp = new Map<string, RosterEntryValidationInput[]>();
  for (const entry of entries) {
    if (!entriesByEmp.has(entry.employeeId)) {
      entriesByEmp.set(entry.employeeId, []);
    }
    entriesByEmp.get(entry.employeeId)!.push(entry);
  }

  for (const emp of snapshot.employees) {
    if (!emp.active) continue;
    const empEntries = entriesByEmp.get(emp.id) || [];
    const targetOffs = Math.round(baseTarget * (emp.weeklyOffsPerWeek || 1));

    // Count non-working days (WEEKLY_OFF, HOLIDAY, LEAVE, COMP_OFF)
    const offDays = empEntries.filter((e) => e.status !== 'WORK').length;

    if (offDays < targetOffs) {
      const deficit = targetOffs - offDays;
      const lastDate = `${month}-${String(empEntries.length).padStart(2, '0')}`;
      conflicts.push({
        id: generateConflictFingerprint('WEEKLY_OFF_MISSING', month, emp.id),
        code: 'WEEKLY_OFF_MISSING',
        severity: 'WARN',
        message: `${emp.name} (${emp.code}) received ${offDays} off days in ${month}, falling short of target ${targetOffs} by ${deficit} days`,
        date: lastDate,
        employeeId: emp.id,
        details: { target: targetOffs, actual: offDays, deficit },
      });
    }
  }

  return conflicts;
}
