-- Database-level Safeguards & Integrity Constraints

-- 1. Absence date sanity: endDate must be on or after startDate
ALTER TABLE "Absence" ADD CONSTRAINT "absence_end_after_start_check" CHECK ("endDate" >= "startDate");

-- 2. Assignment validity window: validTo must be on or after validFrom if both are present
ALTER TABLE "Assignment" ADD CONSTRAINT "assignment_validity_check" CHECK ("validTo" IS NULL OR "validFrom" IS NULL OR "validTo" >= "validFrom");

-- 3. Assignment allocation percentage: 1% to 100%
ALTER TABLE "Assignment" ADD CONSTRAINT "assignment_allocation_check" CHECK ("allocationPct" > 0 AND "allocationPct" <= 100);

-- 4. Process minimum staffing: non-negative
ALTER TABLE "Process" ADD CONSTRAINT "process_min_staff_check" CHECK ("defaultMinStaff" >= 0);

-- 5. CoverageRule minimum staffing: non-negative
ALTER TABLE "CoverageRule" ADD CONSTRAINT "coverage_rule_min_staff_check" CHECK ("minStaff" >= 0);

-- 6. Brand priority: bounded between 1 (low) and 3 (critical)
ALTER TABLE "Brand" ADD CONSTRAINT "brand_priority_check" CHECK ("priority" >= 1 AND "priority" <= 3);
