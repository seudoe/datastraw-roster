/**
 * Brand Bus Factor Calculator
 * Computes the number of unique certified staff available for each brand,
 * identifying Single Points of Failure (SPOFs) and structural coverage vulnerabilities.
 */
import type { BrandBusFactorReport, RiskLevel } from './types';
import type { DomainSnapshot, EmployeeModel } from '@/domain/types';

export function calculateBrandBusFactors(snapshot: DomainSnapshot): BrandBusFactorReport[] {
  const empById = new Map<string, EmployeeModel>(
    snapshot.employees.filter((e) => e.active).map((e) => [e.id, e]),
  );
  const podById = new Map(snapshot.pods.map((p) => [p.id, p.name]));
  const calById = new Map(snapshot.calendars.map((c) => [c.id, c]));

  return snapshot.brands.map((brand) => {
    const calendar = calById.get(brand.calendarId);
    const brandProcesses = snapshot.processes.filter((p) => p.brandId === brand.id);
    const processIds = new Set(brandProcesses.map((p) => p.id));

    // Gather assignments for this brand
    const primaryStaffMap = new Map<string, { id: string; code: string; name: string; podName: string }>();
    const backupStaffMap = new Map<string, { id: string; code: string; name: string; podName: string }>();

    for (const a of snapshot.assignments) {
      if (!processIds.has(a.processId)) continue;
      const emp = empById.get(a.employeeId);
      if (!emp) continue;

      const podName = podById.get(emp.podId) || 'Unassigned';
      const staffObj = {
        id: emp.id,
        code: emp.code,
        name: emp.name,
        podName,
      };

      if (a.role === 'PRIMARY') {
        primaryStaffMap.set(emp.id, staffObj);
      } else if (a.role === 'BACKUP') {
        backupStaffMap.set(emp.id, staffObj);
      }
    }

    const primaryStaff = Array.from(primaryStaffMap.values());
    const backupStaff = Array.from(backupStaffMap.values());

    const allQualifiedIds = new Set([
      ...primaryStaffMap.keys(),
      ...backupStaffMap.keys(),
    ]);
    const busFactor = allQualifiedIds.size;

    // Detect structural uncoverability: 365 or continuous operation with single agent and 0 backups
    const is365orContinuous =
      calendar?.rule === 'ALL_365' ||
      (calendar?.workingWeekdays && calendar.workingWeekdays.length === 7);

    const isStructurallyUncoverable = Boolean(
      is365orContinuous && busFactor === 1 && backupStaff.length === 0,
    );

    let riskLevel: RiskLevel = 'HEALTHY';
    if (busFactor <= 1) {
      riskLevel = 'CRITICAL';
    } else if (busFactor === 2) {
      riskLevel = 'FRAGILE';
    }

    let recommendedAction = 'Healthy resilience buffer: Multiple qualified agents available.';
    if (isStructurallyUncoverable) {
      recommendedAction =
        'URGENT: 365-day single-resource brand has ZERO backups. Assign at least 1 cross-trained floater to prevent mathematically guaranteed deficit.';
    } else if (busFactor === 1) {
      recommendedAction =
        'Single point of failure (SPOF): Any unplanned leave directly causes an unfilled shift. Cross-train backup.';
    } else if (busFactor === 2) {
      recommendedAction =
        'Fragile buffer: Only 1 backup available; simultaneous leaves or pod rotation will cause deficits.';
    }

    return {
      brandId: brand.id,
      brandCode: brand.code,
      brandName: brand.name,
      priority: brand.priority,
      calendarName: calendar?.name || 'Standard 365',
      operatingRule: calendar?.rule || 'ALL_365',
      busFactor,
      riskLevel,
      primaryStaff,
      backupStaff,
      isStructurallyUncoverable,
      recommendedAction,
    };
  });
}
