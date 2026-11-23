import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import type { LeaveChangePayload, RemediationOption } from '@/domain/ripple/types';

const applySchema = z.object({
  rosterId: z.string(),
  changeSet: z.object({
    type: z.enum(['LEAVE_REQUEST', 'DEMAND_CHANGE', 'CAPACITY_CHANGE', 'SWAP_REQUEST']),
    payload: z.record(z.string(), z.any()),
  }),
  selectedFix: z
    .object({
      id: z.string(),
      rank: z.number(),
      type: z.string(),
      assignedEmployeeId: z.string(),
      targetProcessId: z.string(),
      targetDate: z.string(),
      title: z.string(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = applySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { rosterId, changeSet, selectedFix } = parsed.data;

    const roster = await db.roster.findUnique({
      where: { id: rosterId },
    });

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
    }

    // Execute transactional application
    await db.$transaction(async (tx) => {
      // 1. Handle Leave Request
      if (changeSet.type === 'LEAVE_REQUEST') {
        const payload = changeSet.payload as unknown as LeaveChangePayload;
        const startDate = new Date(`${payload.startDate}T00:00:00.000Z`);
        const endDate = new Date(`${payload.endDate}T00:00:00.000Z`);

        // Record approved absence
        await tx.absence.create({
          data: {
            employeeId: payload.employeeId,
            type: payload.absenceType,
            startDate,
            endDate,
            status: 'APPROVED',
            reason: payload.reason || 'Approved via Ripple Engine Quick-Fix',
          },
        });

        // Update roster entries for all dates in range
        const curr = new Date(startDate);
        const dayMs = 24 * 60 * 60 * 1000;

        while (curr <= endDate) {
          const targetStatus = payload.absenceType === 'COMP_OFF' ? 'COMP_OFF' : 'LEAVE';

          await tx.rosterEntry.upsert({
            where: {
              rosterId_employeeId_date: {
                rosterId,
                employeeId: payload.employeeId,
                date: new Date(curr),
              },
            },
            create: {
              rosterId,
              employeeId: payload.employeeId,
              date: new Date(curr),
              status: targetStatus,
              locked: true,
              source: 'REPAIR',
              note: `Leave approved: ${payload.absenceType}`,
            },
            update: {
              status: targetStatus,
              locked: true,
              source: 'REPAIR',
              note: `Leave approved: ${payload.absenceType}`,
            },
          });

          curr.setTime(curr.getTime() + dayMs);
        }
      }

      // 2. Handle Selected Quick-Fix Remediation
      if (selectedFix) {
        const fix = selectedFix as RemediationOption;
        const fixDate = new Date(`${fix.targetDate}T00:00:00.000Z`);

        // Update covering employee's shift to WORK on target process
        await tx.rosterEntry.upsert({
          where: {
            rosterId_employeeId_date: {
              rosterId,
              employeeId: fix.assignedEmployeeId,
              date: fixDate,
            },
          },
          create: {
            rosterId,
            employeeId: fix.assignedEmployeeId,
            date: fixDate,
            status: 'WORK',
            locked: true,
            source: 'REPAIR',
            note: `process:${fix.targetProcessId}`,
          },
          update: {
            status: 'WORK',
            locked: true,
            source: 'REPAIR',
            note: `process:${fix.targetProcessId}`,
          },
        });

        // Record BackupDuty activation
        await tx.backupDuty.upsert({
          where: {
            rosterId_employeeId_processId_date: {
              rosterId,
              employeeId: fix.assignedEmployeeId,
              processId: fix.targetProcessId,
              date: fixDate,
            },
          },
          create: {
            rosterId,
            employeeId: fix.assignedEmployeeId,
            processId: fix.targetProcessId,
            date: fixDate,
          },
          update: {},
        });

        // Record Notification
        await tx.notification.create({
          data: {
            rosterId,
            audience: fix.assignedEmployeeId,
            message: `Roster reallocated: You are assigned to cover shift on ${fix.targetDate} via ${fix.title}.`,
          },
        });
      }

      // 3. Audit Event
      await logAudit({
        actor: role === 'OPS_MANAGER' ? 'Ops Manager' : 'Pod Lead',
        action: 'RIPPLE_REPAIR_APPLIED',
        entityType: 'Roster',
        entityId: rosterId,
        payload: {
          changeSet,
          selectedFix: selectedFix || null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Change-set and remediation successfully applied to roster.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to apply ripple remediation' },
      { status: 500 },
    );
  }
}
