/**
 * Roster Generation and Management Service
 * Orchestrates domain problem preparation, CP-SAT solver execution, and relational persistence.
 */
import { db } from '@/server/db';
import { solverClient, type SolveResponseDto } from '@/server/solverClient';
import { buildProblem, type BuildProblemOptions } from '@/domain/buildProblem';
import { logAudit } from '@/server/audit';
import type {
  DomainSnapshot,
  EmployeeModel,
  PodModel,
  OperatingCalendarModel,
  BrandModel,
  ProcessModel,
  CoverageRuleModel,
  HolidayModel,
  AssignmentModel,
  AbsenceModel,
  GlobalSettings,
} from '@/domain/types';
import type { Prisma } from '@/generated/prisma/client';

export interface GenerateRosterOptions extends BuildProblemOptions {
  createdBy?: string;
  publishImmediately?: boolean;
}

function toDbDate(isoDateStr: string): Date {
  return new Date(`${isoDateStr}T00:00:00.000Z`);
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Loads the complete relational snapshot from PostgreSQL into a pure DomainSnapshot.
 * Converts all DateTime @db.Date fields into plain ISO date strings (zero Date leaks).
 */
export async function loadDomainSnapshot(): Promise<DomainSnapshot> {
  const [
    dbEmployees,
    dbPods,
    dbCalendars,
    dbBrands,
    dbProcesses,
    dbRules,
    dbHolidays,
    dbAssignments,
    dbAbsences,
    dbSettings,
  ] = await Promise.all([
    db.employee.findMany({ where: { active: true } }),
    db.pod.findMany(),
    db.operatingCalendar.findMany(),
    db.brand.findMany({ where: { active: true } }),
    db.process.findMany(),
    db.coverageRule.findMany(),
    db.holiday.findMany(),
    db.assignment.findMany(),
    db.absence.findMany({ where: { status: 'APPROVED' } }), // Include approved absences
    db.setting.findMany(),
  ]);

  // Parse global settings
  const settingsMap = new Map(dbSettings.map((s) => [s.key, s.value]));
  const settings: GlobalSettings = {
    maxConsecutiveWorkDays: (settingsMap.get('maxConsecutiveWorkDays') as number) ?? 6,
    maxBackupBrandsPerDay: (settingsMap.get('maxBackupBrandsPerDay') as number) ?? 2,
    fiscalWeekStart: (settingsMap.get('fiscalWeekStart') as number) ?? 1,
    compOffValidityDays: (settingsMap.get('compOffValidityDays') as number) ?? 30,
  };

  const employees: EmployeeModel[] = dbEmployees.map((e) => ({
    id: e.id,
    code: e.code,
    name: e.name,
    podId: e.podId,
    skills: e.skills as EmployeeModel['skills'],
    weeklyOffsPerWeek: e.weeklyOffsPerWeek,
    preferredOffWeekdays: e.preferredOffWeekdays,
    unavailableWeekdays: e.unavailableWeekdays,
    maxConsecutiveWorkDays: e.maxConsecutiveWorkDays ?? settings.maxConsecutiveWorkDays,
    maxBackupBrandsPerDay: e.maxBackupBrandsPerDay ?? settings.maxBackupBrandsPerDay,
    active: e.active,
  }));

  const pods: PodModel[] = dbPods.map((p) => ({
    id: p.id,
    name: p.name,
    leadId: p.leadId,
  }));

  const calendars: OperatingCalendarModel[] = dbCalendars.map((c) => ({
    id: c.id,
    name: c.name,
    rule: c.rule as OperatingCalendarModel['rule'],
    workingWeekdays: c.workingWeekdays,
    observesHolidays: c.observesHolidays,
  }));

  const brands: BrandModel[] = dbBrands.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    calendarId: b.calendarId,
    priority: b.priority,
    active: b.active,
  }));

  const processes: ProcessModel[] = dbProcesses.map((p) => ({
    id: p.id,
    brandId: p.brandId,
    type: p.type as ProcessModel['type'],
    name: p.name,
    calendarId: p.calendarId,
    defaultMinStaff: p.defaultMinStaff,
  }));

  const coverageRules: CoverageRuleModel[] = dbRules.map((r) => ({
    id: r.id,
    processId: r.processId,
    weekday: r.weekday,
    date: r.date ? toIsoDate(r.date) : null,
    minStaff: r.minStaff,
    note: r.note,
  }));

  const holidays: HolidayModel[] = dbHolidays.map((h) => ({
    id: h.id,
    date: toIsoDate(h.date),
    name: h.name,
    brandId: h.brandId,
  }));

  const assignments: AssignmentModel[] = dbAssignments.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    processId: a.processId,
    role: a.role as AssignmentModel['role'],
    allocationPct: a.allocationPct,
    validFrom: a.validFrom ? toIsoDate(a.validFrom) : null,
    validTo: a.validTo ? toIsoDate(a.validTo) : null,
  }));

  const absences: AbsenceModel[] = dbAbsences.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    type: a.type as AbsenceModel['type'],
    startDate: toIsoDate(a.startDate),
    endDate: toIsoDate(a.endDate),
    status: a.status as AbsenceModel['status'],
    reason: a.reason,
  }));

  return {
    employees,
    pods,
    calendars,
    brands,
    processes,
    coverageRules,
    holidays,
    assignments,
    absences,
    settings,
  };
}

/**
 * Generates an optimized monthly roster through CP-SAT and persists the version into PostgreSQL.
 */
export async function generateRoster(
  month: string,
  options: GenerateRosterOptions = {},
) {
  // 1. Build problem spec from live database snapshot
  const snapshot = await loadDomainSnapshot();
  const problemSpec = buildProblem(month, snapshot, options);

  // 2. Call CP-SAT Solver microservice
  const solveResponse: SolveResponseDto = await solverClient.solve(problemSpec);

  // 3. Determine next version number for this month
  const latestRoster = await db.roster.findFirst({
    where: { month },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latestRoster?.version ?? 0) + 1;

  // 4. Persistence Transaction
  const createdRoster = await db.$transaction(async (tx) => {
    // If publishing immediately, mark any previously published versions as SUPERSEDED
    if (options.publishImmediately) {
      await tx.roster.updateMany({
        where: { month, status: 'PUBLISHED' },
        data: { status: 'SUPERSEDED' },
      });
    }

    // Create Roster record
    const metaToStore: Prisma.InputJsonValue = {
      ...solveResponse.solverMeta,
      metrics: solveResponse.metrics,
      gaps: solveResponse.gaps,
      objectiveValue: solveResponse.objectiveValue,
    };

    const roster = await tx.roster.create({
      data: {
        month,
        version: nextVersion,
        status: options.publishImmediately ? 'PUBLISHED' : 'DRAFT',
        profile: problemSpec.profile,
        solverMeta: metaToStore,
        createdBy: options.createdBy || 'Ops Manager',
      },
    });

    // Create RosterEntry records in chunks to prevent max parameter overflow
    const entryData = solveResponse.entries.map((entry) => ({
      rosterId: roster.id,
      employeeId: entry.employeeId,
      date: toDbDate(entry.date),
      status: entry.status,
      locked: entry.isOverride,
      source: 'SOLVER' as const,
      note: entry.note || (entry.processId ? `process:${entry.processId}` : null),
    }));

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < entryData.length; i += BATCH_SIZE) {
      await tx.rosterEntry.createMany({
        data: entryData.slice(i, i + BATCH_SIZE),
      });
    }

    // Create BackupDuty records for activated backups/floaters
    const backupData: {
      rosterId: string;
      employeeId: string;
      processId: string;
      date: Date;
    }[] = [];

    for (const entry of solveResponse.entries) {
      if (entry.role === 'BACKUP' && entry.processId && entry.status === 'WORK') {
        backupData.push({
          rosterId: roster.id,
          employeeId: entry.employeeId,
          processId: entry.processId,
          date: toDbDate(entry.date),
        });
      }
    }

    if (backupData.length > 0) {
      await tx.backupDuty.createMany({
        data: backupData,
        skipDuplicates: true,
      });
    }

    return roster;
  });

  // 5. Audit Log
  await logAudit({
    actor: options.createdBy || 'Ops Manager',
    action: 'ROSTER_GENERATED',
    entityType: 'Roster',
    entityId: createdRoster.id,
    payload: {
      month,
      version: nextVersion,
      profile: problemSpec.profile,
      status: createdRoster.status,
      metrics: solveResponse.metrics,
    },
  });

  return {
    roster: createdRoster,
    solveResponse,
  };
}

/**
 * Retrieves the latest (or specified version) roster for a given month.
 */
export async function getRoster(month: string, version?: number) {
  return db.roster.findFirst({
    where: {
      month,
      ...(version !== undefined ? { version } : {}),
    },
    orderBy: { version: 'desc' },
    include: {
      entries: {
        include: {
          employee: {
            select: {
              id: true,
              code: true,
              name: true,
              podId: true,
              skills: true,
            },
          },
        },
      },
      backupDuties: {
        include: {
          process: {
            include: {
              brand: {
                select: { id: true, code: true, name: true },
              },
            },
          },
          employee: {
            select: { id: true, code: true, name: true },
          },
        },
      },
      conflictAcks: true,
    },
  });
}

/**
 * Lists all generated roster versions for a given month.
 */
export async function listRosterVersions(month: string) {
  return db.roster.findMany({
    where: { month },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      month: true,
      version: true,
      status: true,
      profile: true,
      createdBy: true,
      createdAt: true,
      solverMeta: true,
      _count: {
        select: {
          entries: true,
          backupDuties: true,
          conflictAcks: true,
        },
      },
    },
  });
}

/**
 * Publishes a draft roster and sets prior published versions to SUPERSEDED.
 */
export async function publishRoster(rosterId: string, publishedBy: string) {
  const targetRoster = await db.roster.findUnique({
    where: { id: rosterId },
  });

  if (!targetRoster) {
    throw new Error('Roster not found');
  }

  const updatedRoster = await db.$transaction(async (tx) => {
    // Supersede previous published rosters
    await tx.roster.updateMany({
      where: {
        month: targetRoster.month,
        status: 'PUBLISHED',
        id: { not: targetRoster.id },
      },
      data: { status: 'SUPERSEDED' },
    });

    // Mark target roster as published
    return tx.roster.update({
      where: { id: targetRoster.id },
      data: { status: 'PUBLISHED' },
    });
  });

  await logAudit({
    actor: publishedBy || 'Ops Manager',
    action: 'ROSTER_PUBLISHED',
    entityType: 'Roster',
    entityId: updatedRoster.id,
    payload: {
      month: updatedRoster.month,
      version: updatedRoster.version,
    },
  });

  return updatedRoster;
}
