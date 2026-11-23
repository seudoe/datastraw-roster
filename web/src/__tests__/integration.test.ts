import { describe, it, expect } from 'vitest';
import { loadDomainSnapshot, getRoster } from '@/server/services/rosterService';
import { simulateChange } from '@/domain/ripple/simulate';
import { computeSafeDates } from '@/domain/ripple/safeDates';
import { explainCoverageGap } from '@/domain/analysis/explainGap';
import { calculateBrandBusFactors } from '@/domain/resilience/busFactor';
import { calculateEmployeeCriticality } from '@/domain/resilience/criticality';
import { computeSystemResilience } from '@/domain/resilience/resilience';

describe('DATASTRAW Assessment Critical Paths & Scenario Integration', () => {
  it('loads the full domain snapshot (32 employees, 25 brands, 4 pods, 4 calendars)', async () => {
    const snapshot = await loadDomainSnapshot();

    expect(snapshot.employees.length).toBe(32);
    expect(snapshot.brands.length).toBe(25);
    expect(snapshot.pods.length).toBe(4);
    expect(snapshot.calendars.length).toBe(4);
  });

  it('verifies Scenario 1: Sole-Resource Leave on 365-Day Brand (EMP002)', async () => {
    const snapshot = await loadDomainSnapshot();
    const roster = await getRoster('2026-12');
    expect(roster).not.toBeNull();

    const emp002 = snapshot.employees.find((e) => e.code === 'EMP002')!;
    expect(emp002).toBeDefined();

    const entries = roster!.entries.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
    }));

    // Simulate Dec 1 to Dec 3 leave when EMP002 is rostered to WORK
    const simulation = simulateChange(
      {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: emp002.id,
          startDate: '2026-12-01',
          endDate: '2026-12-03',
          absenceType: 'PLANNED_LEAVE',
          reason: 'Sole owner of 365-day brand BR_02 absent',
        },
      },
      entries,
      snapshot,
    );

    expect(simulation.simulationTimeMs).toBeLessThan(100);
    // Caution because floater backup EMP008 exists and can be activated
    expect(['CAUTION', 'UNSAFE']).toContain(simulation.safetyLevel);
    expect(simulation.directImpacts.length).toBeGreaterThan(0);
    expect(simulation.directImpacts[0].affectedBrandCode).toBe('BR_02');

    // Verify Quick-fix recommendations inside simulation
    expect(simulation.remediationOptions.length).toBeGreaterThan(0);
    const floaterFix = simulation.remediationOptions.find((f) => f.type === 'EXISTING_FLOATER');
    expect(floaterFix).toBeDefined();
  });

  it('verifies Scenario 2: Qualification Bottleneck (NDR lead EMP021)', async () => {
    const snapshot = await loadDomainSnapshot();
    const roster = await getRoster('2026-12');
    const emp021 = snapshot.employees.find((e) => e.code === 'EMP021')!;
    expect(emp021).toBeDefined();

    const entries = roster!.entries.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
    }));

    const simulation = simulateChange(
      {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: emp021.id,
          startDate: '2026-12-28',
          endDate: '2026-12-29',
          absenceType: 'PLANNED_LEAVE',
          reason: 'NDR lead absent',
        },
      },
      entries,
      snapshot,
    );

    expect(['CAUTION', 'UNSAFE']).toContain(simulation.safetyLevel);
    expect(simulation.directImpacts.length).toBeGreaterThan(0);
    expect(simulation.directImpacts[0].affectedBrandCode).toBe('BR_21');
  });

  it('verifies Scenario 3: Multi-Brand Cascade Leave (EMP018)', async () => {
    const snapshot = await loadDomainSnapshot();
    const roster = await getRoster('2026-12');
    const emp018 = snapshot.employees.find((e) => e.code === 'EMP018')!;
    expect(emp018).toBeDefined();

    const entries = roster!.entries.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
    }));

    // EMP018 is rostered to WORK Dec 08-10
    const simulation = simulateChange(
      {
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: emp018.id,
          startDate: '2026-12-08',
          endDate: '2026-12-10',
          absenceType: 'PLANNED_LEAVE',
          reason: 'Owner of both BR_17 and BR_18 absent',
        },
      },
      entries,
      snapshot,
    );

    expect(['CAUTION', 'UNSAFE']).toContain(simulation.safetyLevel);
    expect(simulation.directImpacts.length).toBeGreaterThan(0);
  });

  it('verifies Scenario 4 / Grounded Explanation: Structural Gaps on BR_03 and BR_18', async () => {
    const snapshot = await loadDomainSnapshot();

    // Test BR_03
    const br03Explanation = explainCoverageGap(
      {
        brandCode: 'BR_03',
        date: '2026-12-07',
        deficit: 1,
      },
      snapshot,
    );

    expect(br03Explanation.brandCode).toBe('BR_03');
    expect(br03Explanation.rootCause).toContain('365-day');
    expect(br03Explanation.governingConstraint).toContain('6-Day Maximum Continuous');
    expect(br03Explanation.recommendedRemedy).toContain('floater');

    // Test BR_18
    const br18Explanation = explainCoverageGap(
      {
        brandCode: 'BR_18',
        date: '2026-12-07',
        deficit: 1,
      },
      snapshot,
    );
    expect(br18Explanation.brandCode).toBe('BR_18');
    expect(br18Explanation.rootCause).toContain('365-day');
  });

  it('computes Safe-to-Approve dates calendar for EMP009 across December 2026', async () => {
    const snapshot = await loadDomainSnapshot();
    const roster = await getRoster('2026-12');
    const emp009 = snapshot.employees.find((e) => e.code === 'EMP009')!;
    expect(emp009).toBeDefined();

    const entries = roster!.entries.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
    }));

    const safeDates = computeSafeDates(emp009.id, '2026-12', entries, snapshot);
    expect(safeDates.length).toBe(31);
    expect(safeDates.every((d) => ['SAFE', 'CAUTION', 'UNSAFE'].includes(d.safety))).toBe(true);
  });

  it('computes Resilience Analytics (Brand Bus Factor and Criticality Index)', async () => {
    const snapshot = await loadDomainSnapshot();

    const busFactors = calculateBrandBusFactors(snapshot);
    expect(busFactors.length).toBe(25);

    // 20 single-resource brands have exactly 1 primary staff
    const singleResourceBrands = busFactors.filter((b) => b.primaryStaff.length === 1);
    expect(singleResourceBrands.length).toBe(20);

    // Structurally uncoverable brands (including BR_03 and BR_18)
    const structurallyUncoverable = busFactors.filter((b) => b.isStructurallyUncoverable);
    expect(structurallyUncoverable.length).toBeGreaterThanOrEqual(2);

    const criticalityList = calculateEmployeeCriticality(snapshot, busFactors);
    expect(criticalityList.length).toBe(32);
    expect(criticalityList.every((e) => e.criticalityScore >= 0 && e.criticalityScore <= 100)).toBe(true);

    const fullReport = computeSystemResilience(snapshot);
    expect(fullReport.overview.overallScore).toBeGreaterThanOrEqual(10);
    expect(fullReport.stressTest.simulationsRun).toBeGreaterThan(0);
  });
});
