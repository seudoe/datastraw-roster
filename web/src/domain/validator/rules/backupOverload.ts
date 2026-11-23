/**
 * Backup Overload Rule: BACKUP_OVERLOAD
 */
import { generateConflictFingerprint } from '../fingerprint';
import type { Conflict } from '../types';
import type { DomainSnapshot } from '@/domain/types';

export interface BackupDutyValidationInput {
  employeeId: string;
  processId: string;
  date: string; // YYYY-MM-DD
}

export function validateBackupOverload(
  backupDuties: BackupDutyValidationInput[],
  snapshot: DomainSnapshot,
): Conflict[] {
  const conflicts: Conflict[] = [];
  const procById = new Map(snapshot.processes.map((p) => [p.id, p]));
  const empById = new Map(snapshot.employees.map((e) => [e.id, e]));

  // Count distinct brands covered by employee on each date: (empId, date) -> Set of brandIds
  const brandSetsByEmpAndDate = new Map<string, Set<string>>();

  for (const duty of backupDuties) {
    const proc = procById.get(duty.processId);
    if (!proc) continue;

    const key = `${duty.employeeId}:${duty.date}`;
    if (!brandSetsByEmpAndDate.has(key)) {
      brandSetsByEmpAndDate.set(key, new Set());
    }
    brandSetsByEmpAndDate.get(key)!.add(proc.brandId);
  }

  for (const [key, brandSet] of brandSetsByEmpAndDate.entries()) {
    const [empId, date] = key.split(':');
    const emp = empById.get(empId);
    if (!emp) continue;

    const maxBrands = emp.maxBackupBrandsPerDay ?? snapshot.settings.maxBackupBrandsPerDay ?? 2;

    if (brandSet.size > maxBrands) {
      conflicts.push({
        id: generateConflictFingerprint('BACKUP_OVERLOAD', date, emp.id),
        code: 'BACKUP_OVERLOAD',
        severity: 'WARN',
        message: `${emp.name} (${emp.code}) assigned to ${brandSet.size} distinct backup brands on ${date} (limit: ${maxBrands})`,
        date,
        employeeId: emp.id,
        details: {
          brandCount: brandSet.size,
          limit: maxBrands,
          brandIds: Array.from(brandSet),
        },
      });
    }
  }

  return conflicts;
}
