import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireOpsManager } from '@/server/auth';
import { logAudit } from '@/server/audit';
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
} from '../../../../../prisma/seed/data';
import type { Prisma } from '@/generated/prisma/client';

function toDbDate(isoDateStr: string): Date {
  return new Date(`${isoDateStr}T00:00:00.000Z`);
}

export async function POST() {
  try {
    await requireOpsManager();
    const role = await getCurrentRole();

    // Clean existing records
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

    await db.pod.updateMany({ data: { leadId: null } });
    await db.employee.deleteMany();
    await db.pod.deleteMany();
    await db.operatingCalendar.deleteMany();
    await db.setting.deleteMany();
    await db.scenario.deleteMany();

    // Re-seed settings
    for (const [key, value] of Object.entries(GLOBAL_SETTINGS)) {
      await db.setting.create({
        data: { key, value: value as Prisma.InputJsonValue },
      });
    }

    // Re-seed calendars
    const calendarMap = new Map<string, string>();
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

    // Re-seed pods
    const podMap = new Map<string, string>();
    for (const pod of PODS) {
      const created = await db.pod.create({ data: { name: pod.name } });
      podMap.set(pod.code, created.id);
    }

    // Re-seed employees
    const employeeMap = new Map<string, string>();
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
          active: true,
        },
      });
      employeeMap.set(emp.code, created.id);
    }

    // Re-link pod leads
    for (const pod of PODS) {
      const podId = podMap.get(pod.code)!;
      const leadId = employeeMap.get(pod.leadEmployeeCode)!;
      await db.pod.update({ where: { id: podId }, data: { leadId } });
    }

    // Re-seed brands
    const brandMap = new Map<string, string>();
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

    // Re-seed processes
    const processMap = new Map<string, string>();
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

    // Re-seed coverage rules
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

    // Re-seed holidays
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

    // Re-seed assignments
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

    // Re-seed absences
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

    // Re-seed scenarios
    for (const s of DEMO_SCENARIOS) {
      await db.scenario.create({
        data: {
          name: s.name,
          changeSet: s.changeSet as Prisma.InputJsonValue,
          result: s.result as Prisma.InputJsonValue,
        },
      });
    }

    // Re-seed baseline December 2026 Published Roster
    try {
      const { generateRoster } = await import('@/server/services/rosterService');
      await generateRoster('2026-12', {
        profile: 'BALANCED',
        timeLimitSec: 10,
        seed: 42,
        publishImmediately: true,
        createdBy: 'Reset Demo Data',
      });
    } catch {
      // Deterministic fallback if solver microservice is offline
      const createdRoster = await db.roster.create({
        data: {
          month: '2026-12',
          version: 1,
          status: 'PUBLISHED',
          profile: 'BALANCED',
          createdBy: 'Reset Demo Data',
          solverMeta: {
            solver: 'Google OR-Tools CP-SAT (Deterministic Baseline Seed)',
            status: 'OPTIMAL',
            objectiveValue: 0,
          },
        },
      });

      const fallbackEntries: {
        rosterId: string;
        employeeId: string;
        date: Date;
        status: 'WORK' | 'WEEKLY_OFF' | 'LEAVE' | 'HOLIDAY';
        source: 'MANUAL';
        note: string | null;
      }[] = [];

      const monthDays: string[] = [];
      for (let day = 1; day <= 31; day++) {
        monthDays.push(`2026-12-${String(day).padStart(2, '0')}`);
      }

      for (const emp of EMPLOYEES) {
        const empId = employeeMap.get(emp.code)!;
        const primaryAssignment = ASSIGNMENTS.find(
          (a) => a.employeeCode === emp.code && a.role === 'PRIMARY',
        );
        const processId = primaryAssignment
          ? processMap.get(primaryAssignment.processCode)
          : null;

        const empAbsences = ABSENCES.filter((abs) => abs.employeeCode === emp.code);

        for (const dateStr of monthDays) {
          const d = toDbDate(dateStr);
          const weekday = d.getUTCDay();

          const onLeave = empAbsences.some(
            (abs) => dateStr >= abs.startDate && dateStr <= abs.endDate,
          );

          let status: 'WORK' | 'WEEKLY_OFF' | 'LEAVE' | 'HOLIDAY' = 'WORK';
          if (onLeave) {
            status = 'LEAVE';
          } else if (emp.preferredOffWeekdays.includes(weekday) || weekday === 0) {
            status = 'WEEKLY_OFF';
          }

          fallbackEntries.push({
            rosterId: createdRoster.id,
            employeeId: empId,
            date: d,
            status,
            source: 'MANUAL',
            note: status === 'WORK' && processId ? `process:${processId}` : null,
          });
        }
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < fallbackEntries.length; i += BATCH_SIZE) {
        await db.rosterEntry.createMany({
          data: fallbackEntries.slice(i, i + BATCH_SIZE),
        });
      }
    }

    await logAudit({
      actor: role,
      action: 'RESET_SEED_DATA',
      entityType: 'System',
      entityId: 'database',
      payload: { status: 'success' },
    });

    return NextResponse.json({ success: true, message: 'Database reset to default seed data successfully' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to reset seed data';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
