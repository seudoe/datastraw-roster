/**
 * System Resilience Engine & Stress-Testing Suite
 * Aggregates brand bus factors, employee criticality indices, and executes
 * deterministic outage stress tests to generate the Full Resilience Report.
 */
import { calculateBrandBusFactors } from './busFactor';
import { calculateEmployeeCriticality } from './criticality';
import type {
  BrandBusFactorReport,
  FullResilienceReport,
  StressTestResult,
  SystemResilienceOverview,
} from './types';
import type { DomainSnapshot } from '@/domain/types';

export function runStressTest(
  snapshot: DomainSnapshot,
  brandReports: BrandBusFactorReport[],
): StressTestResult {
  const activeEmployees = snapshot.employees.filter((e) => e.active);
  const failureCountByBrand = new Map<string, { brandName: string; count: number }>();

  for (const b of brandReports) {
    failureCountByBrand.set(b.brandCode, { brandName: b.brandName, count: 0 });
  }

  let simulationsRun = 0;
  let cleanAbsorptionCount = 0;
  let gapsFormedCount = 0;

  // Test random pair outages (up to 60 distinct pairwise permutations)
  const maxSims = Math.min(60, (activeEmployees.length * (activeEmployees.length - 1)) / 2);
  let simCount = 0;

  for (let i = 0; i < activeEmployees.length && simCount < maxSims; i++) {
    for (let j = i + 1; j < activeEmployees.length && simCount < maxSims; j++) {
      simCount++;
      simulationsRun++;

      const empA = activeEmployees[i];
      const empB = activeEmployees[j];

      let outageFormedGap = false;

      // Check each brand to see if both qualified primaries/backups are wiped out
      for (const brand of brandReports) {
        const qualifiedStaff = new Set([
          ...brand.primaryStaff.map((s) => s.id),
          ...brand.backupStaff.map((s) => s.id),
        ]);

        const hadA = qualifiedStaff.has(empA.id);
        const hadB = qualifiedStaff.has(empB.id);

        if (hadA || hadB) {
          const remainingQualified = qualifiedStaff.size - (hadA ? 1 : 0) - (hadB ? 1 : 0);
          if (remainingQualified <= 0) {
            outageFormedGap = true;
            const entry = failureCountByBrand.get(brand.brandCode);
            if (entry) entry.count++;
          }
        }
      }

      if (outageFormedGap) {
        gapsFormedCount++;
      } else {
        cleanAbsorptionCount++;
      }
    }
  }

  const survivalRate =
    simulationsRun > 0
      ? Math.round((cleanAbsorptionCount / simulationsRun) * 1000) / 10
      : 100;

  const mostVulnerableBrands = Array.from(failureCountByBrand.entries())
    .map(([brandCode, data]) => ({
      brandCode,
      brandName: data.brandName,
      failureCount: data.count,
      failureRate:
        simulationsRun > 0
          ? Math.round((data.count / simulationsRun) * 1000) / 10
          : 0,
    }))
    .filter((b) => b.failureCount > 0)
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, 5);

  return {
    simulationsRun,
    cleanAbsorptionCount,
    gapsFormedCount,
    survivalRate,
    mostVulnerableBrands,
  };
}

export function computeSystemResilience(snapshot: DomainSnapshot): FullResilienceReport {
  const brands = calculateBrandBusFactors(snapshot);
  const employees = calculateEmployeeCriticality(snapshot, brands);
  const stressTest = runStressTest(snapshot, brands);

  const totalBrands = brands.length;
  const spofBrandsCount = brands.filter((b) => b.busFactor <= 1).length;
  const fragileBrandsCount = brands.filter((b) => b.busFactor === 2).length;
  const healthyBrandsCount = brands.filter((b) => b.busFactor >= 3).length;

  const activeEmployees = snapshot.employees.filter((e) => e.active);
  const floaters = employees.filter((e) => e.backupBrandsCount >= 3);
  const floaterSlackRatio =
    activeEmployees.length > 0
      ? Math.round((floaters.length / activeEmployees.length) * 1000) / 10
      : 0;

  // Composite Resilience Score (0 to 100)
  // Base 100 - (SPOF penalty) - (Fragile penalty) + (Stress survival bonus)
  const spofPenalty = (spofBrandsCount / (totalBrands || 1)) * 40;
  const fragilePenalty = (fragileBrandsCount / (totalBrands || 1)) * 20;
  const survivalFactor = (stressTest.survivalRate / 100) * 40;

  const overallScore = Math.max(
    10,
    Math.min(100, Math.round(100 - spofPenalty - fragilePenalty + (survivalFactor - 20))),
  );

  let healthStatus: SystemResilienceOverview['healthStatus'] = 'STABLE';
  if (overallScore >= 80) {
    healthStatus = 'ROBUST';
  } else if (overallScore >= 65) {
    healthStatus = 'STABLE';
  } else if (overallScore >= 45) {
    healthStatus = 'VULNERABLE';
  } else {
    healthStatus = 'CRITICAL';
  }

  const overview: SystemResilienceOverview = {
    overallScore,
    healthStatus,
    totalBrands,
    totalEmployees: activeEmployees.length,
    totalPods: snapshot.pods.length,
    spofBrandsCount,
    fragileBrandsCount,
    healthyBrandsCount,
    floaterCount: floaters.length,
    floaterSlackRatio,
    topCriticalEmployees: employees.slice(0, 5),
  };

  return {
    overview,
    brands,
    employees,
    stressTest,
    computedAt: new Date().toISOString(),
  };
}
