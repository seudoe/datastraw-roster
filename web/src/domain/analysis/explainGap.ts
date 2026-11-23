/**
 * Grounded Explanation Engine for Coverage Gaps
 * Explains WHY mathematical gaps occur in terms of operational rules,
 * calendar constraints, and staffing topology.
 */
import { getWeekdayName } from '@/domain/dates';
import type { DomainSnapshot } from '@/domain/types';

export interface GroundedGapExplanation {
  brandCode: string;
  brandName: string;
  date: string;
  weekday: string;
  deficit: number;
  priority: number;
  title: string;
  rootCause: string;
  governingConstraint: string;
  assignedStaffSummary: string;
  impactAssessment: string;
  recommendedRemedy: string;
}

export function explainCoverageGap(
  gap: {
    brandCode: string;
    date: string;
    deficit: number;
  },
  snapshot: DomainSnapshot,
): GroundedGapExplanation {
  const brand = snapshot.brands.find((b) => b.code === gap.brandCode);
  const calendar = brand ? snapshot.calendars.find((c) => c.id === brand.calendarId) : null;
  const brandProcesses = brand ? snapshot.processes.filter((p) => p.brandId === brand.id) : [];
  const procIds = new Set(brandProcesses.map((p) => p.id));

  const primaryAssignments = snapshot.assignments.filter(
    (a) => procIds.has(a.processId) && a.role === 'PRIMARY',
  );
  const backupAssignments = snapshot.assignments.filter(
    (a) => procIds.has(a.processId) && a.role === 'BACKUP',
  );

  const empMap = new Map(snapshot.employees.map((e) => [e.id, e]));

  const primaryNames = primaryAssignments
    .map((a) => {
      const e = empMap.get(a.employeeId);
      return e ? `${e.name} (${e.code})` : 'Unknown';
    })
    .join(', ');

  const backupNames =
    backupAssignments.length > 0
      ? backupAssignments
          .map((a) => {
            const e = empMap.get(a.employeeId);
            return e ? `${e.name} (${e.code})` : 'Unknown';
          })
          .join(', ')
      : 'None configured';

  const weekdayName = getWeekdayName(gap.date);
  const is365 = calendar?.rule === 'ALL_365' || calendar?.workingWeekdays?.length === 7;

  let rootCause = '';
  let governingConstraint = '';
  let recommendedRemedy = '';

  if (is365 && primaryAssignments.length === 1 && backupAssignments.length === 0) {
    rootCause = `Brand ${gap.brandCode} operates continuous 365-day schedules with only 1 primary agent (${primaryNames}) and ZERO backups. Because labor compliance forbids working 7 continuous days without rest, weekly rest days create unavoidable gaps.`;
    governingConstraint = 'Rolling 6-Day Maximum Continuous Work Days + Minimum 1 Weekly Off';
    recommendedRemedy = `Certify a cross-trained floater or pair ${primaryNames} with a secondary counterpart to establish a stable rotation.`;
  } else if (backupAssignments.length === 0) {
    rootCause = `Brand ${gap.brandCode} has no certified backup staff. When primary staff (${primaryNames}) are unavailable, no replacement is eligible.`;
    governingConstraint = 'Zero Qualified Backup Redundancy (SPOF)';
    recommendedRemedy = 'Cross-train at least one floater from another pod with matching skill competency.';
  } else {
    rootCause = `All certified primary and backup staff (${primaryNames}, Backups: ${backupNames}) were simultaneously rostered on other critical duties or taking mandatory weekly rest on ${gap.date} (${weekdayName}).`;
    governingConstraint = 'Concurrent Absence / Simultaneous Shift Contention';
    recommendedRemedy = 'Utilize Cross-Pod Borrowing or schedule an overtime shift via the Ripple Engine.';
  }

  const impactAssessment = `Priority P${brand?.priority || 2} brand: Creates a -${gap.deficit} shift deficit. Handled via CP-SAT soft slack variable to maintain mathematical feasibility without schedule failure.`;

  return {
    brandCode: gap.brandCode,
    brandName: brand?.name || gap.brandCode,
    date: gap.date,
    weekday: weekdayName,
    deficit: gap.deficit,
    priority: brand?.priority || 2,
    title: `Coverage Deficit on ${brand?.name || gap.brandCode} (${gap.date})`,
    rootCause,
    governingConstraint,
    assignedStaffSummary: `Primaries: ${primaryNames || 'None'} | Backups: ${backupNames}`,
    impactAssessment,
    recommendedRemedy,
  };
}
