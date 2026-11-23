/**
 * Cascade Gap Rule: CASCADE_GAP
 * Detects when pulling an employee away from their primary brand to cover a backup causes a coverage gap on their primary brand.
 */
import { resolveDemand } from '@/domain/demand';
import { generateConflictFingerprint } from '../fingerprint';
import type { Conflict, RosterEntryValidationInput } from '../types';
import type { DomainSnapshot } from '@/domain/types';

export function validateCascadeGaps(
  entries: RosterEntryValidationInput[],
  snapshot: DomainSnapshot,
): Conflict[] {
  const conflicts: Conflict[] = [];
  const empById = new Map(snapshot.employees.map((e) => [e.id, e]));
  const procById = new Map(snapshot.processes.map((p) => [p.id, p]));
  const brandById = new Map(snapshot.brands.map((b) => [b.id, b]));

  // Primary assignments map: empId -> Set of primary processIds
  const primaryProcByEmp = new Map<string, string[]>();
  for (const a of snapshot.assignments) {
    if (a.role === 'PRIMARY') {
      if (!primaryProcByEmp.has(a.employeeId)) primaryProcByEmp.set(a.employeeId, []);
      primaryProcByEmp.get(a.employeeId)!.push(a.processId);
    }
  }

  // Count workers per process per date
  const workersByProcAndDate = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status === 'WORK' && entry.processId) {
      const key = `${entry.processId}:${entry.date}`;
      workersByProcAndDate.set(key, (workersByProcAndDate.get(key) || 0) + 1);
    }
  }

  for (const entry of entries) {
    // Check if employee is working as BACKUP on process B
    if (entry.status === 'WORK' && entry.role === 'BACKUP' && entry.processId) {
      const primaryProcs = primaryProcByEmp.get(entry.employeeId) || [];
      const emp = empById.get(entry.employeeId);
      const backupProc = procById.get(entry.processId);
      const backupBrand = backupProc ? brandById.get(backupProc.brandId) : null;

      for (const primProcId of primaryProcs) {
        // Did their primary process suffer a gap on this same date?
        const primProc = procById.get(primProcId);
        if (!primProc) continue;

        const demand = resolveDemand(primProc, entry.date, snapshot);
        const actualWorkers = workersByProcAndDate.get(`${primProcId}:${entry.date}`) || 0;

        if (demand > actualWorkers) {
          const primBrand = brandById.get(primProc.brandId);
          conflicts.push({
            id: generateConflictFingerprint('CASCADE_GAP', entry.date, `${entry.employeeId}:${primProcId}`),
            code: 'CASCADE_GAP',
            severity: 'WARN',
            message: `Cascade gap: ${emp?.name} was reallocated to ${backupBrand?.name || 'backup'}, leaving primary brand ${primBrand?.name} understaffed (${actualWorkers}/${demand})`,
            date: entry.date,
            employeeId: entry.employeeId,
            processId: primProcId,
            brandId: primProc.brandId,
            details: {
              reallocatedToProcess: entry.processId,
              primaryProcess: primProcId,
              primaryDemand: demand,
              primaryActual: actualWorkers,
            },
          });
        }
      }
    }
  }

  return conflicts;
}
