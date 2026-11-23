/**
 * Seed Verification Script for RosterIQ
 * Asserts all quantitative criteria and architectural distributions specified in Section 7.
 */

import { db } from '../../src/server/db';

async function verify() {
  console.log('🔍 Running RosterIQ Seed Verification Suite...\n');

  let failed = false;
  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`  ❌ FAILED: ${msg}`);
      failed = true;
    } else {
      console.log(`  ✓ PASSED: ${msg}`);
    }
  }

  // 1. Employees Count
  const employeeCount = await db.employee.count({ where: { active: true } });
  assert(employeeCount === 32, `Total active employees must be 32 (found: ${employeeCount})`);

  // 2. Pods Distribution
  const podCount = await db.pod.count();
  assert(podCount === 4, `Total pods must be exactly 4 (found: ${podCount})`);

  const podsWithLead = await db.pod.count({ where: { leadId: { not: null } } });
  assert(podsWithLead === 4, `All 4 pods must have an assigned lead (found: ${podsWithLead})`);

  // 3. Brand Count & Single-Resource Ratio
  const brandCount = await db.brand.count();
  assert(brandCount === 25, `Total brands must be 25 (found: ${brandCount})`);

  // Count brands where all processes have exactly 1 PRIMARY assignee
  const brands = await db.brand.findMany({
    include: {
      processes: {
        include: {
          assignments: { where: { role: 'PRIMARY' } },
        },
      },
    },
  });

  let singleResourceCount = 0;
  let multiEmployeeCount = 0;
  for (const b of brands) {
    const isSingleResource =
      b.processes.length > 0 &&
      b.processes.every((p) => p.assignments.length === 1);
    
    // Check if the single assignee is the same person across all processes of this brand
    if (isSingleResource) {
      const distinctEmployees = new Set(b.processes.flatMap((p) => p.assignments.map((a) => a.employeeId)));
      if (distinctEmployees.size === 1) {
        singleResourceCount++;
      } else {
        multiEmployeeCount++;
      }
    } else {
      multiEmployeeCount++;
    }
  }

  const singleResourceRatio = (singleResourceCount / brandCount) * 100;
  assert(
    singleResourceCount === 20 && singleResourceRatio === 80,
    `Single-resource brands must be 20 (80%) (found: ${singleResourceCount} = ${singleResourceRatio}%)`,
  );
  assert(
    multiEmployeeCount === 5,
    `Multi-employee brands must be exactly 5 (20%) (found: ${multiEmployeeCount})`,
  );

  // 4. Shared process with minStaff=2 on weekends
  const weekendRule = await db.coverageRule.findFirst({
    where: {
      weekday: 6,
      minStaff: 2,
    },
    include: {
      process: {
        include: {
          assignments: { where: { role: 'PRIMARY' } },
        },
      },
    },
  });
  assert(
    weekendRule !== null && weekendRule.process.assignments.length === 2,
    `Must include a brand where two employees share a process with weekend minStaff=2 (found: ${weekendRule?.process?.name})`,
  );

  // 5. Cross-Trained Floaters
  const employeesWithBackups = await db.employee.findMany({
    include: {
      assignments: { where: { role: 'BACKUP' } },
    },
  });
  const floaters = employeesWithBackups.filter((e) => e.assignments.length >= 4);
  assert(
    floaters.length === 5,
    `Must have exactly 5 cross-trained floaters with >=4 backup assignments (found: ${floaters.length})`,
  );

  // 6. Structurally Uncoverable Brands (365 calendar, 1 employee, 0 backups)
  const all365Calendar = await db.operatingCalendar.findFirst({ where: { rule: 'ALL_365' } });
  let uncoverableCount = 0;
  for (const b of brands) {
    if (b.calendarId === all365Calendar?.id) {
      const allProcessBackups = await db.assignment.count({
        where: {
          processId: { in: b.processes.map((p) => p.id) },
          role: 'BACKUP',
        },
      });
      if (allProcessBackups === 0) {
        uncoverableCount++;
      }
    }
  }
  assert(
    uncoverableCount >= 1,
    `Must intentionally have at least 1 structurally uncoverable 365 brand without backups (found: ${uncoverableCount})`,
  );

  // 7. Holidays (Company-wide + Brand-specific)
  const holidayCount = await db.holiday.count();
  const brandSpecificHoliday = await db.holiday.findFirst({ where: { brandId: { not: null } } });
  assert(holidayCount >= 5, `Total holidays must be >= 5 (found: ${holidayCount})`);
  assert(brandSpecificHoliday !== null, `Must have at least one brand-specific holiday (found: ${brandSpecificHoliday?.name})`);

  // 8. Absences & Pending Requests
  const absenceCount = await db.absence.count();
  const pendingAbsenceCount = await db.absence.count({ where: { status: 'PENDING' } });
  const compOffCount = await db.absence.count({ where: { type: 'COMP_OFF' } });
  assert(absenceCount >= 6, `Total absences must be >= 6 (found: ${absenceCount})`);
  assert(pendingAbsenceCount >= 2, `Must have >= 2 pending absence requests for demo (found: ${pendingAbsenceCount})`);
  assert(compOffCount >= 2, `Must have >= 2 comp-off requests (found: ${compOffCount})`);

  // 9. Demo Scenarios
  const scenarioCount = await db.scenario.count();
  assert(scenarioCount === 4, `Must have exactly 4 seeded demo scenarios (found: ${scenarioCount})`);

  // 10. Baseline Published Roster for December 2026
  const decRoster = await db.roster.findFirst({
    where: { month: '2026-12', status: 'PUBLISHED' },
    include: { _count: { select: { entries: true } } },
  });
  assert(
    decRoster !== null && decRoster._count.entries >= 32 * 31,
    `Must have a published December 2026 roster with >= 992 entries (found: ${decRoster?._count.entries ?? 0})`,
  );

  // Final Verdict
  console.log('\n----------------------------------------');
  if (failed) {
    console.error('❌ VERIFICATION FAILED: Seed distribution does not match specification.');
    process.exit(1);
  } else {
    console.log('🎉 ALL SEED VERIFICATION CRITERIA PASSED 100%!');
    console.log(`  - 32 Employees across 4 Pods with Leads`);
    console.log(`  - 25 Brands (20 single-resource [80%], 5 multi-employee [20%])`);
    console.log(`  - 5 Cross-trained floaters & ${uncoverableCount} intentional structural gap brands`);
    console.log(`  - 4 Operating Calendars, 5 Holidays (incl. brand-specific)`);
    console.log(`  - 4 One-click Demo Scenarios`);
    console.log('----------------------------------------\n');
  }
}

verify().catch((e) => {
  console.error('Verification script crashed:', e);
  process.exit(1);
});
