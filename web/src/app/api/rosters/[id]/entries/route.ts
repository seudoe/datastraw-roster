import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';

const entryUpdateSchema = z.object({
  entries: z.array(
    z.object({
      employeeId: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z.enum(['WORK', 'WEEKLY_OFF', 'HOLIDAY', 'LEAVE', 'COMP_OFF']),
      processId: z.string().nullable().optional(),
      locked: z.boolean().optional(),
      note: z.string().nullable().optional(),
    }),
  ),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const { id: rosterId } = await params;
    const body = await request.json();
    const parsed = entryUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const roster = await db.roster.findUnique({
      where: { id: rosterId },
    });

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
    }

    // Execute updates in transaction
    await db.$transaction(async (tx) => {
      for (const item of parsed.data.entries) {
        const dateObj = new Date(`${item.date}T00:00:00.000Z`);

        // Upsert roster entry
        const noteToSave = item.note || (item.processId ? `process:${item.processId}` : null);

        await tx.rosterEntry.upsert({
          where: {
            rosterId_employeeId_date: {
              rosterId,
              employeeId: item.employeeId,
              date: dateObj,
            },
          },
          update: {
            status: item.status,
            locked: item.locked ?? true, // Manual edits are locked by default
            source: 'MANUAL',
            note: noteToSave,
          },
          create: {
            rosterId,
            employeeId: item.employeeId,
            date: dateObj,
            status: item.status,
            locked: item.locked ?? true,
            source: 'MANUAL',
            note: noteToSave,
          },
        });

        // Manage backup duty if applicable
        if (item.status === 'WORK' && item.processId) {
          // Check if assignment is BACKUP
          const assignment = await tx.assignment.findUnique({
            where: {
              employeeId_processId: {
                employeeId: item.employeeId,
                processId: item.processId,
              },
            },
          });

          if (assignment && assignment.role === 'BACKUP') {
            await tx.backupDuty.upsert({
              where: {
                rosterId_employeeId_processId_date: {
                  rosterId,
                  employeeId: item.employeeId,
                  processId: item.processId,
                  date: dateObj,
                },
              },
              update: {},
              create: {
                rosterId,
                employeeId: item.employeeId,
                processId: item.processId,
                date: dateObj,
              },
            });
          }
        } else {
          // Clean up any backup duty if non-work
          await tx.backupDuty.deleteMany({
            where: {
              rosterId,
              employeeId: item.employeeId,
              date: dateObj,
            },
          });
        }
      }
    });

    await logAudit({
      actor: role,
      action: 'ROSTER_ENTRIES_UPDATED',
      entityType: 'Roster',
      entityId: rosterId,
      payload: {
        updatedCount: parsed.data.entries.length,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: parsed.data.entries.length,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to update roster entries' },
      { status: 500 },
    );
  }
}
