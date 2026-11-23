/**
 * Employee Criticality Index Calculator
 * Evaluates the organizational reliance on each individual employee (0 to 100),
 * identifying "keystone" floaters and irreplaceable sole primaries.
 */
import type { EmployeeCriticalityReport, CriticalityLevel, BrandBusFactorReport } from './types';
import type { DomainSnapshot } from '@/domain/types';

export function calculateEmployeeCriticality(
  snapshot: DomainSnapshot,
  brandReports: BrandBusFactorReport[],
): EmployeeCriticalityReport[] {
  const podById = new Map(snapshot.pods.map((p) => [p.id, p.name]));
  const procById = new Map(snapshot.processes.map((p) => [p.id, p]));
  const brandByCode = new Map(brandReports.map((b) => [b.brandCode, b]));

  return snapshot.employees
    .filter((e) => e.active)
    .map((employee) => {
      const podName = podById.get(employee.podId) || 'Unassigned';

      // Find all processes assigned to employee
      const empAssignments = snapshot.assignments.filter((a) => a.employeeId === employee.id);
      const primaryProcIds = new Set(
        empAssignments.filter((a) => a.role === 'PRIMARY').map((a) => a.processId),
      );
      const backupProcIds = new Set(
        empAssignments.filter((a) => a.role === 'BACKUP').map((a) => a.processId),
      );

      // Find unique brands for primary and backup
      const primaryBrandCodes = new Set<string>();
      for (const pId of primaryProcIds) {
        const proc = procById.get(pId);
        if (proc) {
          const brand = snapshot.brands.find((b) => b.id === proc.brandId);
          if (brand) primaryBrandCodes.add(brand.code);
        }
      }

      const backupBrandCodes = new Set<string>();
      for (const pId of backupProcIds) {
        const proc = procById.get(pId);
        if (proc) {
          const brand = snapshot.brands.find((b) => b.id === proc.brandId);
          if (brand) backupBrandCodes.add(brand.code);
        }
      }

      // Check which brands this employee is the SOLE primary for
      const solePrimaryFor: string[] = [];
      for (const bCode of primaryBrandCodes) {
        const bReport = brandByCode.get(bCode);
        if (bReport && bReport.primaryStaff.length === 1 && bReport.primaryStaff[0].id === employee.id) {
          solePrimaryFor.push(bCode);
        }
      }

      // Count SPOF brands they are involved in
      let spofExposureCount = 0;
      for (const bCode of [...primaryBrandCodes, ...backupBrandCodes]) {
        const bReport = brandByCode.get(bCode);
        if (bReport && bReport.busFactor <= 2) {
          spofExposureCount++;
        }
      }

      // Score computation (0 to 100)
      const solePrimaryScore = Math.min(50, solePrimaryFor.length * 35);
      const floaterBreadthScore = Math.min(35, backupBrandCodes.size * 7);
      const spofExposureScore = Math.min(25, spofExposureCount * 8);

      const rawScore = solePrimaryScore + floaterBreadthScore + spofExposureScore;
      const criticalityScore = Math.min(100, Math.max(10, Math.round(rawScore)));

      let criticalityLevel: CriticalityLevel = 'LOW';
      if (criticalityScore >= 75) {
        criticalityLevel = 'CRITICAL';
      } else if (criticalityScore >= 50) {
        criticalityLevel = 'HIGH';
      } else if (criticalityScore >= 30) {
        criticalityLevel = 'MEDIUM';
      }

      let riskSummary = 'Standard operational responsibility: Qualified peers available.';
      if (solePrimaryFor.length > 0 && backupBrandCodes.size >= 3) {
        riskSummary = `Hybrid Keystone: Sole primary for ${solePrimaryFor.join(', ')} while anchoring ${backupBrandCodes.size} backup duties.`;
      } else if (solePrimaryFor.length > 0) {
        riskSummary = `Sole primary for ${solePrimaryFor.join(', ')}: Absence directly forces backup activation or creates deficit.`;
      } else if (backupBrandCodes.size >= 4) {
        riskSummary = `Cross-Trained Floater: High system dependency; covers ${backupBrandCodes.size} brands across pods.`;
      }

      return {
        employeeId: employee.id,
        employeeCode: employee.code,
        employeeName: employee.name,
        podName,
        criticalityScore,
        criticalityLevel,
        solePrimaryFor,
        primaryBrandsCount: primaryBrandCodes.size,
        backupBrandsCount: backupBrandCodes.size,
        spofExposureCount,
        skills: employee.skills,
        riskSummary,
      };
    })
    .sort((a, b) => b.criticalityScore - a.criticalityScore);
}
