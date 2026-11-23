/**
 * Idempotent Database Seeder for RosterIQ
 * Populates realistic operational data for 32 employees, 25 brands, 4 pods, floaters, and scenarios.
 */

import { db } from '../../src/server/db';
import type { Prisma } from '../../src/generated/prisma/client';
import {
  CALENDARS,
  PODS,
  EMPLOYEES,
  BRANDS,
  PROCESSES,
  COVERAGE_RULES,
  HOLIDAYS,
  ASSIGNMENTS,
  ABSENCES,
  DEMO_SCENARIOS,
  GLOBAL_SETTINGS,
} from './data';

function toDbDate(isoDateStr: string): Date {
  return new Date(`${isoDateStr}T00:00:00.000Z`);
}

async function main() {
  console.log('🌱 Starting deterministic seed for RosterIQ...');

  // 1. Clean existing records in referential dependency order
  console.log('🧹 Cleaning existing data...');
  await db.conflictAck.deleteMany();
  await db.backupDuty.deleteMany();
  await db.rosterEntry.deleteMany();
  await db.notification.deleteMany();
  await db.roster.deleteMany();
  await db.compOffCredit.deleteMany();
  await db.absence.deleteMany();
  await db.assignment.deleteMany();
  await db.coverageRule.deleteMany();
  await db.holiday.deleteMany();
  await db.process.deleteMany();
  await db.brand.deleteMany();

  // Break Pod <-> Employee circular reference before deleting
  await db.pod.updateMany({ data: { leadId: null } });
  await db.employee.deleteMany();
  await db.pod.deleteMany();
  await db.operatingCalendar.deleteMany();
  await db.setting.deleteMany();
  await db.scenario.deleteMany();

  // 2. Seed Global Settings
  console.log('⚙️ Seeding global settings...');
  for (const [key, value] of Object.entries(GLOBAL_SETTINGS)) {
    await db.setting.create({
      data: {
        key,
        value: value as Prisma.InputJsonValue,
      },
    });
  }

  // 3. Seed Operating Calendars
  console.log('📅 Seeding operating calendars...');
  const calendarMap = new Map<string, string>(); // code -> id
  for (const cal of CALENDARS) {
    const created = await db.operatingCalendar.create({
      data: {
        name: cal.name,
        rule: cal.rule,
        workingWeekdays: cal.workingWeekdays,
        observesHolidays: cal.observesHolidays,
      },
    });
    calendarMap.set(cal.code, created.id);
  }

  // 4. Seed Pods (initially without lead)
  console.log('🏢 Seeding pods...');
  const podMap = new Map<string, string>(); // code -> id
  for (const pod of PODS) {
    const created = await db.pod.create({
      data: {
        name: pod.name,
      },
    });
    podMap.set(pod.code, created.id);
  }

  // 5. Seed Employees
  console.log('👥 Seeding 32 employees...');
  const employeeMap = new Map<string, string>(); // code -> id
  for (const emp of EMPLOYEES) {
    const podId = podMap.get(emp.podCode)!;
    const created = await db.employee.create({
      data: {
        code: emp.code,
        name: emp.name,
        email: emp.email,
        podId,
        skills: emp.skills,
        weeklyOffsPerWeek: emp.weeklyOffsPerWeek,
        preferredOffWeekdays: emp.preferredOffWeekdays,
        unavailableWeekdays: emp.unavailableWeekdays,
        maxConsecutiveWorkDays: emp.maxConsecutiveWorkDays,
        maxBackupBrandsPerDay: emp.maxBackupBrandsPerDay,
        active: true,
      },
    });
    employeeMap.set(emp.code, created.id);
  }

  // 6. Connect Pod Leads
  console.log('👑 Connecting pod leads...');
  for (const pod of PODS) {
    const podId = podMap.get(pod.code)!;
    const leadEmployeeId = employeeMap.get(pod.leadEmployeeCode)!;
    await db.pod.update({
      where: { id: podId },
      data: { leadId: leadEmployeeId },
    });
  }

  // 7. Seed Brands
  console.log('🏷️ Seeding 25 brands...');
  const brandMap = new Map<string, string>(); // code -> id
  for (const b of BRANDS) {
    const calendarId = calendarMap.get(b.calendarCode)!;
    const created = await db.brand.create({
      data: {
        code: b.code,
        name: b.name,
        calendarId,
        priority: b.priority,
        active: true,
      },
    });
    brandMap.set(b.code, created.id);
  }

  // 8. Seed Processes
  console.log('⚙️ Seeding processes...');
  const processMap = new Map<string, string>(); // code -> id
  for (const p of PROCESSES) {
    const brandId = brandMap.get(p.brandCode)!;
    const calendarId = p.calendarCode ? calendarMap.get(p.calendarCode) : null;
    const created = await db.process.create({
      data: {
        brandId,
        type: p.type,
        name: p.name,
        calendarId,
        defaultMinStaff: p.defaultMinStaff,
      },
    });
    processMap.set(p.code, created.id);
  }

  // 9. Seed Coverage Rules
  console.log('📋 Seeding coverage rules...');
  for (const r of COVERAGE_RULES) {
    const processId = processMap.get(r.processCode)!;
    await db.coverageRule.create({
      data: {
        processId,
        weekday: r.weekday,
        date: r.date ? toDbDate(r.date) : null,
        minStaff: r.minStaff,
        note: r.note,
      },
    });
  }

  // 10. Seed Holidays
  console.log('🎉 Seeding holidays...');
  for (const h of HOLIDAYS) {
    const brandId = h.brandCode ? brandMap.get(h.brandCode) : null;
    await db.holiday.create({
      data: {
        date: toDbDate(h.date),
        name: h.name,
        brandId,
      },
    });
  }

  // 11. Seed Assignments (Primary + Floaters)
  console.log('🔗 Seeding assignments...');
  for (const a of ASSIGNMENTS) {
    const employeeId = employeeMap.get(a.employeeCode)!;
    const processId = processMap.get(a.processCode)!;
    await db.assignment.create({
      data: {
        employeeId,
        processId,
        role: a.role,
        allocationPct: a.allocationPct,
      },
    });
  }

  // 12. Seed Absences & Comp-Offs
  console.log('🏖️ Seeding absences and comp-offs...');
  for (const abs of ABSENCES) {
    const employeeId = employeeMap.get(abs.employeeCode)!;
    await db.absence.create({
      data: {
        employeeId,
        type: abs.type,
        startDate: toDbDate(abs.startDate),
        endDate: toDbDate(abs.endDate),
        status: abs.status,
        reason: abs.reason,
      },
    });
  }

  // 13. Seed Demo Scenarios
  console.log('🎬 Seeding demo scenarios...');
  for (const s of DEMO_SCENARIOS) {
    await db.scenario.create({
      data: {
        name: s.name,
        changeSet: s.changeSet as Prisma.InputJsonValue,
        result: s.result as Prisma.InputJsonValue,
      },
    });
  }

  console.log('✅ Deterministic seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Close db connection if needed
  });
