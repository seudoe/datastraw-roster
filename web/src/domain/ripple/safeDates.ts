/**
 * Safe-to-Approve Calendar Evaluator
 * Evaluates every calendar day of a month for a specific employee,
 * classifying each date into SAFE, CAUTION, or UNSAFE with grounded reasoning.
 */
import { getDaysInMonth, getWeekday } from '@/domain/dates';
import type { SafeDateEvaluation } from './types';
import type { DomainSnapshot, ProcessModel, BrandModel } from '@/domain/types';

interface ShiftEntry {
  employeeId: string;
  date: string;
  status: string;
  processId?: string | null;
}

export function computeSafeDates(
  employeeId: string,
  month: string,
  currentEntries: ShiftEntry[],
  snapshot: DomainSnapshot,
): SafeDateEvaluation[] {
  const days = getDaysInMonth(month);
  const employee = snapshot.employees.find((e) => e.id === employeeId);
  if (!employee) return [];

  const entryByDate = new Map<string, ShiftEntry>();
  for (const e of currentEntries) {
    if (e.employeeId === employeeId) {
      entryByDate.set(e.date, e);
    }
  }

  // All entries map for checking other employees
  const allEntryMap = new Map<string, ShiftEntry>();
  for (const e of currentEntries) {
    allEntryMap.set(`${e.employeeId}:${e.date}`, e);
  }

  const procById = new Map<string, ProcessModel>(snapshot.processes.map((p) => [p.id, p]));
  const brandById = new Map<string, BrandModel>(snapshot.brands.map((b) => [b.id, b]));
  const podMap = new Map<string, string>(snapshot.pods.map((p) => [p.id, p.name]));
  const empById = new Map(snapshot.employees.map((e) => [e.id, e]));

  // Primary process fallback
  const primaryAssignment = snapshot.assignments.find(
    (a) => a.employeeId === employeeId && a.role === 'PRIMARY',
  );

  return days.map((date) => {
    const entry = entryByDate.get(date);
    const isScheduledToWork = entry ? entry.status === 'WORK' : false;

    // If not scheduled to work (already off, holiday, leave), it is 100% SAFE to approve
    if (!isScheduledToWork) {
      return {
        date,
        safety: 'SAFE',
        reason: 'Already scheduled OFF or on Holiday: Zero coverage impact.',
        isScheduledToWork: false,
        availableBackups: [],
      };
    }

    const processId = entry?.processId || primaryAssignment?.processId;
    const process = processId ? procById.get(processId) : null;
    const brand = process ? brandById.get(process.brandId) : null;

    if (!process || !brand) {
      return {
        date,
        safety: 'SAFE',
        reason: 'Unassigned process: Safe to approve.',
        isScheduledToWork: true,
        availableBackups: [],
      };
    }

    // Check backups for this process
    const backupAssignments = snapshot.assignments.filter(
      (a) => a.processId === process.id && a.role === 'BACKUP' && a.employeeId !== employeeId,
    );

    if (backupAssignments.length === 0) {
      return {
        date,
        safety: 'UNSAFE',
        reason: `Structurally uncoverable brand (${brand.code}): Zero backups configured. Leave will create an unfilled gap.`,
        isScheduledToWork: true,
        brandCode: brand.code,
        brandName: brand.name,
        availableBackups: [],
      };
    }

    const weekday = getWeekday(date);
    const availableBackups: SafeDateEvaluation['availableBackups'] = [];

    for (const ba of backupAssignments) {
      const backupEmp = empById.get(ba.employeeId);
      if (!backupEmp || !backupEmp.active) continue;
      if (backupEmp.unavailableWeekdays.includes(weekday)) continue;

      const backupEntry = allEntryMap.get(`${backupEmp.id}:${date}`);
      const isFree = !backupEntry || backupEntry.status === 'WEEKLY_OFF';

      if (isFree) {
        availableBackups.push({
          employeeId: backupEmp.id,
          employeeName: backupEmp.name,
          employeeCode: backupEmp.code,
          podName: podMap.get(backupEmp.podId) || 'Pod',
          isSamePod: backupEmp.podId === employee.podId,
        });
      }
    }

    if (availableBackups.length === 0) {
      return {
        date,
        safety: 'UNSAFE',
        reason: `All ${backupAssignments.length} qualified backups are already rostered on other duties on ${date}.`,
        isScheduledToWork: true,
        brandCode: brand.code,
        brandName: brand.name,
        availableBackups: [],
      };
    }

    const hasSamePodBackup = availableBackups.some((b) => b.isSamePod);

    if (hasSamePodBackup) {
      const topBackup = availableBackups.find((b) => b.isSamePod)!;
      return {
        date,
        safety: 'SAFE',
        reason: `Safe to approve: ${topBackup.employeeName} (${topBackup.employeeCode}) available in same pod.`,
        isScheduledToWork: true,
        brandCode: brand.code,
        brandName: brand.name,
        availableBackups,
      };
    }

    const topCrossPod = availableBackups[0];
    return {
      date,
      safety: 'CAUTION',
      reason: `Caution: Requires cross-pod borrow from ${topCrossPod.podName} (${topCrossPod.employeeName}).`,
      isScheduledToWork: true,
      brandCode: brand.code,
      brandName: brand.name,
      availableBackups,
    };
  });
}
