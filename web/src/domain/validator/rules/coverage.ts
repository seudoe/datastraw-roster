/**
 * Process Coverage Rules: COVERAGE_ZERO and COVERAGE_BELOW_MIN
 */
import { resolveDemand } from '@/domain/demand';
import { generateConflictFingerprint } from '../fingerprint';
import type { Conflict, RosterEntryValidationInput } from '../types';
import type { DomainSnapshot } from '@/domain/types';

export function validateCoverage(
  days: string[],
  entries: RosterEntryValidationInput[],
  snapshot: DomainSnapshot,
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Index entries by process and date: (processId, date) -> count of workers
  const workerCountByProcessAndDate = new Map<string, number>();

  for (const entry of entries) {
    if (entry.status === 'WORK' && entry.processId) {
      const key = `${entry.processId}:${entry.date}`;
      workerCountByProcessAndDate.set(key, (workerCountByProcessAndDate.get(key) || 0) + 1);
    }
  }

  const activeBrands = new Set(snapshot.brands.filter((b) => b.active).map((b) => b.id));

  for (const proc of snapshot.processes) {
    if (!activeBrands.has(proc.brandId)) continue;
    const brand = snapshot.brands.find((b) => b.id === proc.brandId);

    for (const day of days) {
      const required = resolveDemand(proc, day, snapshot);
      if (required <= 0) continue;

      const actual = workerCountByProcessAndDate.get(`${proc.id}:${day}`) || 0;

      if (actual === 0) {
        conflicts.push({
          id: generateConflictFingerprint('COVERAGE_ZERO', day, proc.id),
          code: 'COVERAGE_ZERO',
          severity: 'ERROR',
          message: `Zero coverage on ${brand?.name || 'Brand'} (${proc.name}) — required ${required}, assigned 0`,
          date: day,
          processId: proc.id,
          brandId: proc.brandId,
          details: { required, actual, deficit: required },
        });
      } else if (actual < required) {
        conflicts.push({
          id: generateConflictFingerprint('COVERAGE_BELOW_MIN', day, proc.id),
          code: 'COVERAGE_BELOW_MIN',
          severity: 'WARN',
          message: `Understaffed on ${brand?.name || 'Brand'} (${proc.name}) — required ${required}, assigned ${actual}`,
          date: day,
          processId: proc.id,
          brandId: proc.brandId,
          details: { required, actual, deficit: required - actual },
        });
      }
    }
  }

  return conflicts;
}
