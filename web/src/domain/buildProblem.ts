/**
 * Problem Builder for RosterIQ Solver
 * Compiles a snapshot into a flat, validated problem spec consumed by the Python CP-SAT solver.
 * Contains ZERO calendar logic — demand and availability are already fully resolved.
 */

import { getDaysInMonth, getIsoWeeksForMonth } from './dates';
import { resolveDemand } from './demand';
import { resolveAvailability } from './availability';
import type { DomainSnapshot, SolverProblemSpec } from './types';

export interface BuildProblemOptions {
  profile?: string; // Default 'BALANCED'
  timeLimitSec?: number; // Default 20
  seed?: number; // Default 42
  lockedEntries?: {
    employeeId: string;
    date: string;
    status: 'WORK' | 'WEEKLY_OFF' | 'HOLIDAY' | 'LEAVE' | 'COMP_OFF';
  }[];
}

/**
 * Builds the flat problem specification JSON sent to the CP-SAT solver microservice.
 */
export function buildProblem(
  month: string,
  snapshot: DomainSnapshot,
  options: BuildProblemOptions = {},
): SolverProblemSpec {
  const days = getDaysInMonth(month);
  const isoWeeks = getIsoWeeksForMonth(month, 1);
  const totalOffsTarget = isoWeeks.reduce((sum, w) => sum + w.proratedOffTarget, 0);

  const profile = options.profile || 'BALANCED';
  const timeLimitSec = options.timeLimitSec || 20;
  const seed = options.seed || 42;

  // Compile employees
  const employees = snapshot.employees
    .filter((e) => e.active)
    .map((e) => {
      const primaryAssignments = snapshot.assignments.filter(
        (a) => a.employeeId === e.id && a.role === 'PRIMARY',
      );
      const backupAssignments = snapshot.assignments.filter(
        (a) => a.employeeId === e.id && (a.role === 'BACKUP' || a.role === 'TEMPORARY'),
      );

      return {
        id: e.id,
        code: e.code,
        weeklyOffsTarget: totalOffsTarget * (e.weeklyOffsPerWeek || 1),
        preferredOffWeekdays: e.preferredOffWeekdays,
        maxConsecutiveWorkDays: e.maxConsecutiveWorkDays ?? snapshot.settings.maxConsecutiveWorkDays ?? 6,
        maxBackupBrandsPerDay: e.maxBackupBrandsPerDay ?? snapshot.settings.maxBackupBrandsPerDay ?? 2,
        primaryProcessIds: primaryAssignments.map((a) => a.processId),
        backupProcessIds: backupAssignments.map((a) => a.processId),
      };
    });

  // Compile processes with pre-resolved demand
  const activeBrands = new Set(snapshot.brands.filter((b) => b.active).map((b) => b.id));
  const processes = snapshot.processes
    .filter((p) => activeBrands.has(p.brandId))
    .map((p) => {
      const brand = snapshot.brands.find((b) => b.id === p.brandId)!;
      const demand: Record<string, number> = {};
      for (const day of days) {
        demand[day] = resolveDemand(p, day, snapshot);
      }
      return {
        id: p.id,
        brandId: p.brandId,
        brandPriority: brand.priority || 2,
        demand,
      };
    });

  // Compile active assignments
  const activeEmployeeIds = new Set(employees.map((e) => e.id));
  const activeProcessIds = new Set(processes.map((p) => p.id));
  const assignments = snapshot.assignments
    .filter((a) => activeEmployeeIds.has(a.employeeId) && activeProcessIds.has(a.processId))
    .map((a) => ({
      employeeId: a.employeeId,
      processId: a.processId,
      role: a.role,
    }));

  // Resolve forced states for every employee on every day
  const forced: SolverProblemSpec['forced'] = [];

  for (const emp of snapshot.employees.filter((e) => e.active)) {
    for (const day of days) {
      const availability = resolveAvailability(emp, day, snapshot);
      if (availability.forcedStatus) {
        forced.push({
          employeeId: emp.id,
          date: day,
          status: availability.forcedStatus,
          reason: availability.reason || 'Forced availability state',
        });
      }
    }
  }

  // Pre-existing locks (e.g., from manual edits during re-generation or repair)
  const locks: SolverProblemSpec['locks'] = options.lockedEntries || [];

  return {
    month,
    days,
    employees,
    processes,
    assignments,
    forced,
    locks,
    profile,
    timeLimitSec,
    seed,
  };
}
