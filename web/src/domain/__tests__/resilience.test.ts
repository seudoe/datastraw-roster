/**
 * Resilience Analytics & SPOF Unit Tests
 * Verifies brand bus factor calculations, structural uncoverability detection,
 * employee criticality ranking, and outage stress-testing.
 */
import { describe, it, expect } from 'vitest';
import { calculateBrandBusFactors } from '../resilience/busFactor';
import { calculateEmployeeCriticality } from '../resilience/criticality';
import { runStressTest, computeSystemResilience } from '../resilience/resilience';
import type { DomainSnapshot } from '@/domain/types';

describe('Resilience Analytics & SPOF Matrix', () => {
  const mockSnapshot: DomainSnapshot = {
    pods: [
      { id: 'POD_1', name: 'Pod Alpha', leadId: 'EMP_1' },
      { id: 'POD_2', name: 'Pod Beta', leadId: 'EMP_4' },
    ],
    employees: [
      {
        id: 'EMP_1',
        code: 'EMP_01',
        name: 'Alice Alpha',
        podId: 'POD_1',
        skills: ['CS'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
        maxConsecutiveWorkDays: 6,
        maxBackupBrandsPerDay: 2,
        active: true,
      },
      {
        id: 'EMP_2',
        code: 'EMP_02',
        name: 'Bob Backup',
        podId: 'POD_1',
        skills: ['CS'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
        maxConsecutiveWorkDays: 6,
        maxBackupBrandsPerDay: 2,
        active: true,
      },
      {
        id: 'EMP_3',
        code: 'EMP_03',
        name: 'Charlie Solo',
        podId: 'POD_1',
        skills: ['ACC'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
        maxConsecutiveWorkDays: 6,
        maxBackupBrandsPerDay: 2,
        active: true,
      },
      {
        id: 'EMP_4',
        code: 'EMP_04',
        name: 'Diana Floater',
        podId: 'POD_2',
        skills: ['CS', 'ACC', 'NDR'],
        weeklyOffsPerWeek: 1,
        preferredOffWeekdays: [0],
        unavailableWeekdays: [],
        maxConsecutiveWorkDays: 6,
        maxBackupBrandsPerDay: 3,
        active: true,
      },
    ],
    calendars: [
      {
        id: 'CAL_365',
        name: 'All 365 Days',
        rule: 'ALL_365',
        workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
        observesHolidays: false,
      },
      {
        id: 'CAL_5DAY',
        name: 'Mon to Fri',
        rule: 'SUN_AND_HOLIDAYS_OFF',
        workingWeekdays: [1, 2, 3, 4, 5],
        observesHolidays: true,
      },
    ],
    brands: [
      {
        id: 'BRAND_A',
        code: 'BR_A',
        name: 'Brand Alpha CS',
        calendarId: 'CAL_365',
        priority: 2,
        active: true,
      },
      {
        id: 'BRAND_UNCOVER',
        code: 'BR_UNCOVER',
        name: 'Brand Uncoverable Solo',
        calendarId: 'CAL_365',
        priority: 3,
        active: true,
      },
      {
        id: 'BRAND_ROBUST',
        code: 'BR_ROBUST',
        name: 'Brand Robust Support',
        calendarId: 'CAL_5DAY',
        priority: 1,
        active: true,
      },
    ],
    processes: [
      {
        id: 'PROC_A',
        brandId: 'BRAND_A',
        type: 'CS',
        name: 'Brand A CS',
        calendarId: 'CAL_365',
        defaultMinStaff: 1,
      },
      {
        id: 'PROC_UNCOVER',
        brandId: 'BRAND_UNCOVER',
        type: 'ACC',
        name: 'Uncoverable Accounting',
        calendarId: 'CAL_365',
        defaultMinStaff: 1,
      },
      {
        id: 'PROC_ROBUST',
        brandId: 'BRAND_ROBUST',
        type: 'CS',
        name: 'Robust CS',
        calendarId: 'CAL_5DAY',
        defaultMinStaff: 1,
      },
    ],
    coverageRules: [],
    assignments: [
      // Brand A: Alice primary, Bob backup (Bus factor = 2 -> FRAGILE)
      { id: 'A1', employeeId: 'EMP_1', processId: 'PROC_A', role: 'PRIMARY', allocationPct: 100 },
      { id: 'A2', employeeId: 'EMP_2', processId: 'PROC_A', role: 'BACKUP', allocationPct: 100 },

      // Brand Uncoverable: Charlie sole primary, ZERO backups (Bus factor = 1 -> CRITICAL & Structurally uncoverable)
      { id: 'A3', employeeId: 'EMP_3', processId: 'PROC_UNCOVER', role: 'PRIMARY', allocationPct: 100 },

      // Brand Robust: Alice primary, Bob backup, Diana backup (Bus factor = 3 -> HEALTHY)
      { id: 'A4', employeeId: 'EMP_1', processId: 'PROC_ROBUST', role: 'PRIMARY', allocationPct: 100 },
      { id: 'A5', employeeId: 'EMP_2', processId: 'PROC_ROBUST', role: 'BACKUP', allocationPct: 100 },
      { id: 'A6', employeeId: 'EMP_4', processId: 'PROC_ROBUST', role: 'BACKUP', allocationPct: 100 },
    ],
    holidays: [],
    absences: [],
    settings: {
      maxConsecutiveWorkDays: 6,
      maxBackupBrandsPerDay: 2,
      fiscalWeekStart: 1,
      compOffValidityDays: 30,
    },
  };

  describe('Brand Bus Factor Calculations', () => {
    it('computes correct bus factor for all brands', () => {
      const reports = calculateBrandBusFactors(mockSnapshot);

      expect(reports.length).toBe(3);

      const brandA = reports.find((b) => b.brandCode === 'BR_A');
      const brandUncover = reports.find((b) => b.brandCode === 'BR_UNCOVER');
      const brandRobust = reports.find((b) => b.brandCode === 'BR_ROBUST');

      expect(brandA?.busFactor).toBe(2);
      expect(brandUncover?.busFactor).toBe(1);
      expect(brandRobust?.busFactor).toBe(3);
    });

    it('identifies structurally uncoverable brand with 0 backups on 365 calendar', () => {
      const reports = calculateBrandBusFactors(mockSnapshot);
      const uncover = reports.find((b) => b.brandCode === 'BR_UNCOVER');

      expect(uncover?.isStructurallyUncoverable).toBe(true);
      expect(uncover?.riskLevel).toBe('CRITICAL');
      expect(uncover?.recommendedAction).toContain('365-day single-resource brand has ZERO backups');
    });

    it('assigns correct risk levels based on bus factor thresholds', () => {
      const reports = calculateBrandBusFactors(mockSnapshot);

      const brandA = reports.find((b) => b.brandCode === 'BR_A');
      const brandUncover = reports.find((b) => b.brandCode === 'BR_UNCOVER');
      const brandRobust = reports.find((b) => b.brandCode === 'BR_ROBUST');

      expect(brandUncover?.riskLevel).toBe('CRITICAL');
      expect(brandA?.riskLevel).toBe('FRAGILE');
      expect(brandRobust?.riskLevel).toBe('HEALTHY');
    });

    it('populates primary and backup staff details with pod names', () => {
      const reports = calculateBrandBusFactors(mockSnapshot);
      const brandRobust = reports.find((b) => b.brandCode === 'BR_ROBUST');

      expect(brandRobust?.primaryStaff.length).toBe(1);
      expect(brandRobust?.primaryStaff[0].code).toBe('EMP_01');
      expect(brandRobust?.primaryStaff[0].podName).toBe('Pod Alpha');

      expect(brandRobust?.backupStaff.length).toBe(2);
      expect(brandRobust?.backupStaff.some((b) => b.code === 'EMP_04' && b.podName === 'Pod Beta')).toBe(true);
    });
  });

  describe('Employee Criticality Index', () => {
    it('computes criticality score between 0 and 100 for all employees', () => {
      const brands = calculateBrandBusFactors(mockSnapshot);
      const employees = calculateEmployeeCriticality(mockSnapshot, brands);

      expect(employees.length).toBe(4);
      for (const emp of employees) {
        expect(emp.criticalityScore).toBeGreaterThanOrEqual(0);
        expect(emp.criticalityScore).toBeLessThanOrEqual(100);
      }
    });

    it('detects sole primaries accurately', () => {
      const brands = calculateBrandBusFactors(mockSnapshot);
      const employees = calculateEmployeeCriticality(mockSnapshot, brands);

      const charlie = employees.find((e) => e.employeeCode === 'EMP_03');
      expect(charlie?.solePrimaryFor).toContain('BR_UNCOVER');
      expect(charlie?.criticalityScore).toBeGreaterThanOrEqual(40);
    });

    it('sorts employees in descending order of criticality', () => {
      const brands = calculateBrandBusFactors(mockSnapshot);
      const employees = calculateEmployeeCriticality(mockSnapshot, brands);

      for (let i = 0; i < employees.length - 1; i++) {
        expect(employees[i].criticalityScore).toBeGreaterThanOrEqual(employees[i + 1].criticalityScore);
      }
    });

    it('assigns high criticality to keystone employees with sole primary duties and backups', () => {
      const brands = calculateBrandBusFactors(mockSnapshot);
      const employees = calculateEmployeeCriticality(mockSnapshot, brands);

      const alice = employees.find((e) => e.employeeCode === 'EMP_01');
      expect(alice?.solePrimaryFor.length).toBeGreaterThan(0);
      expect(alice?.criticalityLevel).toMatch(/CRITICAL|HIGH/);
    });

    it('generates grounded risk summary explanations', () => {
      const brands = calculateBrandBusFactors(mockSnapshot);
      const employees = calculateEmployeeCriticality(mockSnapshot, brands);

      const charlie = employees.find((e) => e.employeeCode === 'EMP_03');
      expect(charlie?.riskSummary).toContain('Sole primary for BR_UNCOVER');
    });
  });

  describe('Stress-Testing & Outage Simulation', () => {
    it('executes pairwise outage simulations across all employees', () => {
      const brands = calculateBrandBusFactors(mockSnapshot);
      const stressTest = runStressTest(mockSnapshot, brands);

      expect(stressTest.simulationsRun).toBeGreaterThan(0);
      expect(stressTest.cleanAbsorptionCount + stressTest.gapsFormedCount).toBe(stressTest.simulationsRun);
    });

    it('computes shock survival rate percentage', () => {
      const brands = calculateBrandBusFactors(mockSnapshot);
      const stressTest = runStressTest(mockSnapshot, brands);

      expect(stressTest.survivalRate).toBeGreaterThanOrEqual(0);
      expect(stressTest.survivalRate).toBeLessThanOrEqual(100);
    });

    it('identifies uncoverable brand as top failure candidate in stress test', () => {
      const brands = calculateBrandBusFactors(mockSnapshot);
      const stressTest = runStressTest(mockSnapshot, brands);

      const uncover = stressTest.mostVulnerableBrands.find((b) => b.brandCode === 'BR_UNCOVER');
      expect(uncover).toBeDefined();
      expect(uncover?.failureCount).toBeGreaterThan(0);
    });
  });

  describe('System Resilience Overview', () => {
    it('computes composite resilience score and overview report', () => {
      const report = computeSystemResilience(mockSnapshot);

      expect(report.overview.totalBrands).toBe(3);
      expect(report.overview.totalEmployees).toBe(4);
      expect(report.overview.spofBrandsCount).toBe(1);
      expect(report.overview.fragileBrandsCount).toBe(1);
      expect(report.overview.healthyBrandsCount).toBe(1);
      expect(report.overview.overallScore).toBeGreaterThanOrEqual(10);
      expect(report.overview.overallScore).toBeLessThanOrEqual(100);
      expect(['ROBUST', 'STABLE', 'VULNERABLE', 'CRITICAL']).toContain(report.overview.healthStatus);
    });

    it('populates top critical employees in overview', () => {
      const report = computeSystemResilience(mockSnapshot);

      expect(report.overview.topCriticalEmployees.length).toBeGreaterThan(0);
      expect(report.overview.topCriticalEmployees.length).toBeLessThanOrEqual(5);
    });

    it('handles snapshot with 0 active employees without crashing', () => {
      const emptySnapshot: DomainSnapshot = {
        ...mockSnapshot,
        employees: [],
      };

      const report = computeSystemResilience(emptySnapshot);
      expect(report.overview.totalEmployees).toBe(0);
      expect(report.overview.overallScore).toBeDefined();
    });
  });
});
