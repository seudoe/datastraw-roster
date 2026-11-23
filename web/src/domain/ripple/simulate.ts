/**
 * The Ripple Engine - Change-Impact Simulator
 * Fast pure-TypeScript simulation (<5ms) evaluating direct coverage gaps,
 * upstream/downstream domino effects, metric deltas, and ranked remediation options.
 */
import { resolveDemand } from '@/domain/demand';
import { generateQuickFixes } from './quickfixes';
import type {
  ChangeSet,
  CascadeImpact,
  DirectImpact,
  LeaveChangePayload,
  MetricDelta,
  RemediationOption,
  RippleSimulationResult,
} from './types';
import type { DomainSnapshot, EmployeeModel, ProcessModel, BrandModel } from '@/domain/types';

interface ShiftEntry {
  employeeId: string;
  date: string;
  status: string;
  processId?: string | null;
  locked?: boolean;
}

/** Helper: Generate all ISO date strings between start and end date (inclusive) */
function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

export function simulateChange(
  change: ChangeSet,
  currentEntries: ShiftEntry[],
  snapshot: DomainSnapshot,
): RippleSimulationResult {
  const startTime = performance.now();

  const empById = new Map<string, EmployeeModel>(snapshot.employees.map((e) => [e.id, e]));
  const procById = new Map<string, ProcessModel>(snapshot.processes.map((p) => [p.id, p]));
  const brandById = new Map<string, BrandModel>(snapshot.brands.map((b) => [b.id, b]));

  // Index entries by `${employeeId}:${date}`
  const entryByEmpAndDate = new Map<string, ShiftEntry>();
  for (const e of currentEntries) {
    entryByEmpAndDate.set(`${e.employeeId}:${e.date}`, e);
  }

  // Find primary process for each employee as fallback
  const primaryProcByEmp = new Map<string, string>();
  for (const a of snapshot.assignments) {
    if (a.role === 'PRIMARY') {
      primaryProcByEmp.set(a.employeeId, a.processId);
    }
  }

  const directImpacts: DirectImpact[] = [];
  const cascadeImpacts: CascadeImpact[] = [];
  const remediationOptions: RemediationOption[] = [];

  // Determine affected dates and employees based on change type
  if (change.type === 'LEAVE_REQUEST') {
    const payload = change.payload as LeaveChangePayload;
    const employee = empById.get(payload.employeeId);
    const affectedDates = getDatesInRange(payload.startDate, payload.endDate);

    if (employee) {
      for (const date of affectedDates) {
        const existingEntry = entryByEmpAndDate.get(`${employee.id}:${date}`);
        const wasWorking = existingEntry ? existingEntry.status === 'WORK' : false;

        if (wasWorking) {
          // Identify the process they were working
          const processId =
            existingEntry?.processId ||
            primaryProcByEmp.get(employee.id) ||
            snapshot.processes.find((p) => p.brandId === employee.podId)?.id;

          const process = processId ? procById.get(processId) : null;
          const brand = process ? brandById.get(process.brandId) : null;

          if (process && brand) {
            // Check required staff on that date
            const requiredStaff = resolveDemand(process, date, snapshot);

            // Count unique workers assigned to this process on this date
            const uniqueWorkers = new Set<string>();
            for (const e of currentEntries) {
              if (e.date === date && e.status === 'WORK') {
                const pId = e.processId || primaryProcByEmp.get(e.employeeId);
                if (pId === process.id) {
                  uniqueWorkers.add(e.employeeId);
                }
              }
            }

            const currentStaffWorking = uniqueWorkers.size;
            const staffAfterLeave = Math.max(0, currentStaffWorking - 1);
            const deficit = Math.max(0, requiredStaff - staffAfterLeave);

            if (deficit > 0) {
              directImpacts.push({
                date,
                affectedEmployeeId: employee.id,
                affectedEmployeeName: employee.name,
                affectedProcessId: process.id,
                affectedProcessName: process.name,
                affectedBrandCode: brand.code,
                affectedBrandName: brand.name,
                brandPriority: brand.priority,
                previousStatus: 'WORK',
                newStatus: payload.absenceType === 'COMP_OFF' ? 'COMP_OFF' : 'LEAVE',
                deficitCreated: deficit,
              });

              // Check domino / cascade effects
              const backups = snapshot.assignments.filter(
                (a) => a.processId === process.id && a.role === 'BACKUP',
              );

              if (backups.length === 0) {
                cascadeImpacts.push({
                  date,
                  dominoType: 'GAP_FORMED',
                  description: `Zero backups configured for ${brand.code} (${brand.name}). Structurally uncoverable shift!`,
                  severity: 'ERROR',
                  brandCode: brand.code,
                });
              } else {
                cascadeImpacts.push({
                  date,
                  dominoType: 'BACKUP_ACTIVATION',
                  description: `${backups.length} qualified backup(s) available for ${brand.code}. Reallocation recommended.`,
                  severity: 'INFO',
                  brandCode: brand.code,
                });
              }

              // Generate Ranked Quick-Fixes
              const fixes = generateQuickFixes(
                date,
                employee,
                process,
                brand,
                currentEntries,
                snapshot,
              );
              for (const fix of fixes) {
                // Deduplicate by id
                if (!remediationOptions.some((o) => o.id === fix.id)) {
                  remediationOptions.push(fix);
                }
              }
            }
          }
        }
      }
    }
  }

  // Calculate baseline metrics before vs after
  let totalRequiredShifts = 0;
  let totalGapsBefore = 0;

  // Evaluate month days from snapshot
  const uniqueDates = Array.from(new Set(currentEntries.map((e) => e.date))).sort();

  for (const date of uniqueDates) {
    for (const process of snapshot.processes) {
      const req = resolveDemand(process, date, snapshot);
      if (req > 0) {
        totalRequiredShifts += req;
        const uniqueWorkers = new Set<string>();
        for (const e of currentEntries) {
          if (e.date === date && e.status === 'WORK') {
            const pId = e.processId || primaryProcByEmp.get(e.employeeId);
            if (pId === process.id) uniqueWorkers.add(e.employeeId);
          }
        }
        if (uniqueWorkers.size < req) {
          totalGapsBefore += req - uniqueWorkers.size;
        }
      }
    }
  }

  const additionalGaps = directImpacts.reduce((sum, d) => sum + d.deficitCreated, 0);
  const totalGapsAfter = totalGapsBefore + additionalGaps;

  const coverageRateBefore =
    totalRequiredShifts > 0
      ? Math.round(((totalRequiredShifts - totalGapsBefore) / totalRequiredShifts) * 1000) / 10
      : 100;
  const coverageRateAfter =
    totalRequiredShifts > 0
      ? Math.round(((totalRequiredShifts - totalGapsAfter) / totalRequiredShifts) * 1000) / 10
      : 100;

  const metricDelta: MetricDelta = {
    coverageRateBefore,
    coverageRateAfter,
    totalGapsBefore,
    totalGapsAfter,
    conflictsBefore: totalGapsBefore,
    conflictsAfter: totalGapsAfter,
  };

  // Classify Safety Level:
  // - If any deficit has 0 feasible fixes -> UNSAFE
  // - If all deficits have a rank 1 fix (floater with zero net gaps) -> SAFE
  // - Otherwise -> CAUTION
  let safetyLevel: 'SAFE' | 'CAUTION' | 'UNSAFE' = 'SAFE';

  if (directImpacts.length === 0) {
    safetyLevel = 'SAFE';
  } else {
    const hasUnfixableGap = directImpacts.some((d) => {
      const fixesForDate = remediationOptions.filter(
        (f) => f.targetDate === d.date && f.isFeasible,
      );
      return fixesForDate.length === 0;
    });

    if (hasUnfixableGap) {
      safetyLevel = 'UNSAFE';
    } else {
      const hasRank1FixForAll = directImpacts.every((d) => {
        return remediationOptions.some(
          (f) => f.targetDate === d.date && f.rank === 1 && f.isFeasible,
        );
      });
      safetyLevel = hasRank1FixForAll ? 'SAFE' : 'CAUTION';
    }
  }

  const simulationTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    change,
    isSafeToApprove: safetyLevel === 'SAFE' || safetyLevel === 'CAUTION',
    safetyLevel,
    directImpacts,
    cascadeImpacts,
    metricDelta,
    remediationOptions: remediationOptions.sort((a, b) => a.rank - b.rank),
    simulationTimeMs,
  };
}
