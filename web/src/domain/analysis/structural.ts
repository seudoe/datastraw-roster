/**
 * Pre-Solve Structural Feasibility Analysis
 * Detects structurally uncoverable brands, single points of failure (SPOF),
 * and mathematically guaranteed coverage deficits prior to CP-SAT optimization.
 */
import type { DomainSnapshot, BrandModel, ProcessModel } from '@/domain/types';

export interface BrandStructuralReport {
  brandId: string;
  brandCode: string;
  brandName: string;
  isStructurallyUncoverable: boolean;
  busFactor: number; // Number of unique qualified employees (primary + backup)
  primaryCount: number;
  backupCount: number;
  operatingDaysPerWeek: number;
  weeklyDeficitEstimate: number; // Expected weekly unfilled shifts
  findings: string[];
  suggestedAction?: string;
}

export interface StructuralFeasibilitySummary {
  totalBrands: number;
  uncoverableCount: number;
  spofCount: number;
  reports: BrandStructuralReport[];
}

export function analyzeStructuralFeasibility(
  snapshot: DomainSnapshot,
): StructuralFeasibilitySummary {
  const reports: BrandStructuralReport[] = [];
  const activeBrands = snapshot.brands.filter((b) => b.active);

  // Index calendars
  const calById = new Map(snapshot.calendars.map((c) => [c.id, c]));

  // Index assignments by process: processId -> { primaries: Set<empId>, backups: Set<empId> }
  const processStaff = new Map<
    string,
    { primaries: Set<string>; backups: Set<string> }
  >();

  for (const proc of snapshot.processes) {
    processStaff.set(proc.id, { primaries: new Set(), backups: new Set() });
  }

  for (const a of snapshot.assignments) {
    const staff = processStaff.get(a.processId);
    if (!staff) continue;
    if (a.role === 'PRIMARY') staff.primaries.add(a.employeeId);
    else staff.backups.add(a.employeeId);
  }

  for (const brand of activeBrands) {
    const cal = calById.get(brand.calendarId);
    const operatingDaysPerWeek = cal ? cal.workingWeekdays.length : 7;
    const is365 = cal?.rule === 'ALL_365' || operatingDaysPerWeek === 7;

    const brandProcesses = snapshot.processes.filter((p) => p.brandId === brand.id);
    const allPrimaries = new Set<string>();
    const allBackups = new Set<string>();

    let totalMinStaffRequired = 0;
    for (const proc of brandProcesses) {
      totalMinStaffRequired += proc.defaultMinStaff || 1;
      const staff = processStaff.get(proc.id);
      if (staff) {
        staff.primaries.forEach((e) => allPrimaries.add(e));
        staff.backups.forEach((e) => allBackups.add(e));
      }
    }

    const allQualified = new Set([...allPrimaries, ...allBackups]);
    const busFactor = allQualified.size;
    const primaryCount = allPrimaries.size;
    const backupCount = allBackups.size;

    const findings: string[] = [];
    let isStructurallyUncoverable = false;
    let weeklyDeficitEstimate = 0;
    let suggestedAction: string | undefined;

    // Check 1: 365-day operation with single primary and zero backups
    if (is365 && primaryCount === 1 && backupCount === 0) {
      isStructurallyUncoverable = true;
      weeklyDeficitEstimate = 1; // 7 days demanded - max 6 days worked = 1 gap/week
      findings.push(
        `Operates 365 days with exactly 1 employee and 0 backups. Employee can work at most 6 consecutive days under rest regulations, guaranteeing 1 weekly coverage gap (~52 gaps/year).`,
      );
      suggestedAction = `Assign at least 1 cross-trained floater with a BACKUP assignment to cover the mandatory weekly off day.`;
    }

    // Check 2: Single Point of Failure (SPOF)
    if (busFactor === 1 && !isStructurallyUncoverable) {
      findings.push(
        `Single Point of Failure (Bus Factor = 1): Sole primary resource with no designated backup. Any illness or planned leave will cause immediate coverage failure.`,
      );
      if (!suggestedAction) {
        suggestedAction = `Cross-train a secondary team member or allocate a pod floater to provide emergency redundancy.`;
      }
    }

    // Check 3: Zero qualified staff
    if (busFactor === 0) {
      isStructurallyUncoverable = true;
      weeklyDeficitEstimate = operatingDaysPerWeek;
      findings.push(`Zero staff assigned to active brand processes.`);
      suggestedAction = `Assign primary operating staff to processes.`;
    }

    reports.push({
      brandId: brand.id,
      brandCode: brand.code,
      brandName: brand.name,
      isStructurallyUncoverable,
      busFactor,
      primaryCount,
      backupCount,
      operatingDaysPerWeek,
      weeklyDeficitEstimate,
      findings,
      suggestedAction,
    });
  }

  const uncoverableCount = reports.filter((r) => r.isStructurallyUncoverable).length;
  const spofCount = reports.filter((r) => r.busFactor === 1).length;

  return {
    totalBrands: activeBrands.length,
    uncoverableCount,
    spofCount,
    reports,
  };
}
