import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { loadDomainSnapshot } from '@/server/services/rosterService';
import { buildProblem } from '@/domain/buildProblem';
import { solverClient } from '@/server/solverClient';
import { logAudit } from '@/server/audit';
import type { LeaveChangePayload } from '@/domain/ripple/types';
import type { Prisma } from '@/generated/prisma/client';

const repairSolveSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  rosterId: z.string(),
  changeSet: z.object({
    type: z.enum(['LEAVE_REQUEST', 'DEMAND_CHANGE', 'CAPACITY_CHANGE', 'SWAP_REQUEST']),
    payload: z.record(z.string(), z.any()),
  }),
});

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = repairSolveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { month, rosterId, changeSet } = parsed.data;

    const baseRoster = await db.roster.findUnique({
      where: { id: rosterId },
      include: {
        entries: true,
      },
    });

    if (!baseRoster) {
      return NextResponse.json({ error: 'Base roster not found' }, { status: 404 });
    }

    const snapshot = await loadDomainSnapshot();

    // Invalidate/inject the new disruption into forced absences
    const additionalForced: {
      employeeId: string;
      date: string;
      status: 'LEAVE' | 'COMP_OFF';
      reason: string;
    }[] = [];

    if (changeSet.type === 'LEAVE_REQUEST') {
      const payload = changeSet.payload as unknown as LeaveChangePayload;
      const leaveDates = getDatesInRange(payload.startDate, payload.endDate);
      for (const d of leaveDates) {
        additionalForced.push({
          employeeId: payload.employeeId,
          date: d,
          status: payload.absenceType === 'COMP_OFF' ? 'COMP_OFF' : 'LEAVE',
          reason: payload.reason || 'Leave requested',
        });
      }
    }

    // Build base problem specification
    const problemSpec = buildProblem(month, snapshot, {
      profile: baseRoster.profile || 'BALANCED',
      timeLimitSec: 10,
    });

    // Append new forced absence dates
    for (const f of additionalForced) {
      problemSpec.forced.push(f);
    }

    // Format current entries as baseline targets for minimal disruption
    const currentEntries = baseRoster.entries.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
    }));

    // Call Python CP-SAT solver minimal disruption repair endpoint
    const solveResponse = await solverClient.repair({
      baseProblem: problemSpec,
      currentEntries,
      disruptionWeight: 8.0, // High penalty for moving shifts from baseline
    });

    // Query highest version for this month
    const latestRoster = await db.roster.findFirst({
      where: { month },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latestRoster?.version ?? 0) + 1;

    // Persist repaired roster as new version
    const createdRoster = await db.$transaction(async (tx) => {
      const metaToStore: Prisma.InputJsonValue = {
        ...solveResponse.solverMeta,
        metrics: solveResponse.metrics,
        gaps: solveResponse.gaps,
        objectiveValue: solveResponse.objectiveValue,
        repairedFrom: baseRoster.id,
      };

      const roster = await tx.roster.create({
        data: {
          month,
          version: nextVersion,
          status: 'DRAFT',
          profile: problemSpec.profile,
          parentId: baseRoster.id,
          solverMeta: metaToStore,
          createdBy: role === 'OPS_MANAGER' ? 'Ops Manager (Repair)' : 'Pod Lead (Repair)',
        },
      });

      const entryData = solveResponse.entries.map((entry) => ({
        rosterId: roster.id,
        employeeId: entry.employeeId,
        date: new Date(`${entry.date}T00:00:00.000Z`),
        status: entry.status,
        locked: entry.isOverride,
        source: 'REPAIR' as const,
        note: entry.note || (entry.processId ? `process:${entry.processId}` : null),
      }));

      const BATCH_SIZE = 500;
      for (let i = 0; i < entryData.length; i += BATCH_SIZE) {
        await tx.rosterEntry.createMany({
          data: entryData.slice(i, i + BATCH_SIZE),
        });
      }

      // Record backup duties
      for (const entry of solveResponse.entries) {
        if (entry.role === 'BACKUP' && entry.processId && entry.status === 'WORK') {
          await tx.backupDuty.create({
            data: {
              rosterId: roster.id,
              employeeId: entry.employeeId,
              processId: entry.processId,
              date: new Date(`${entry.date}T00:00:00.000Z`),
            },
          });
        }
      }

      return roster;
    });

    await logAudit({
      actor: role === 'OPS_MANAGER' ? 'Ops Manager' : 'Pod Lead',
      action: 'ROSTER_REPAIRED_SOLVER',
      entityType: 'Roster',
      entityId: createdRoster.id,
      payload: {
        month,
        version: nextVersion,
        parentId: baseRoster.id,
        metrics: solveResponse.metrics,
      },
    });

    return NextResponse.json({
      success: true,
      roster: createdRoster,
      metrics: solveResponse.metrics,
      gaps: solveResponse.gaps,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Solver repair failed' },
      { status: 500 },
    );
  }
}
