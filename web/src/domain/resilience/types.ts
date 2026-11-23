/**
 * Domain types for Resilience Analytics, SPOF Analysis, and Employee Criticality
 */

export type RiskLevel = 'CRITICAL' | 'FRAGILE' | 'HEALTHY';
export type CriticalityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface BrandBusFactorReport {
  brandId: string;
  brandCode: string;
  brandName: string;
  priority: number;
  calendarName: string;
  operatingRule: string;
  busFactor: number;
  riskLevel: RiskLevel;
  primaryStaff: {
    id: string;
    code: string;
    name: string;
    podName: string;
  }[];
  backupStaff: {
    id: string;
    code: string;
    name: string;
    podName: string;
  }[];
  isStructurallyUncoverable: boolean;
  recommendedAction: string;
}

export interface EmployeeCriticalityReport {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  podName: string;
  criticalityScore: number; // 0 to 100
  criticalityLevel: CriticalityLevel;
  solePrimaryFor: string[]; // Brand codes
  primaryBrandsCount: number;
  backupBrandsCount: number;
  spofExposureCount: number;
  skills: string[];
  riskSummary: string;
}

export interface StressTestResult {
  simulationsRun: number;
  cleanAbsorptionCount: number;
  gapsFormedCount: number;
  survivalRate: number; // Percentage (e.g. 84.5%)
  mostVulnerableBrands: {
    brandCode: string;
    brandName: string;
    failureCount: number;
    failureRate: number;
  }[];
}

export interface SystemResilienceOverview {
  overallScore: number; // 0 to 100
  healthStatus: 'ROBUST' | 'STABLE' | 'VULNERABLE' | 'CRITICAL';
  totalBrands: number;
  totalEmployees: number;
  totalPods: number;
  spofBrandsCount: number;
  fragileBrandsCount: number;
  healthyBrandsCount: number;
  floaterCount: number;
  floaterSlackRatio: number; // percentage
  topCriticalEmployees: EmployeeCriticalityReport[];
}

export interface FullResilienceReport {
  overview: SystemResilienceOverview;
  brands: BrandBusFactorReport[];
  employees: EmployeeCriticalityReport[];
  stressTest: StressTestResult;
  computedAt: string;
}
