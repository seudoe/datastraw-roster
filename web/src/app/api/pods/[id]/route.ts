import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const podUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  leadId: z.string().nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const { id } = await params;
    const body = await request.json();
    const parsed = podUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const pod = await db.pod.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit({
      actor: role,
      action: 'UPDATE_POD',
      entityType: 'Pod',
      entityId: id,
      payload: parsed.data,
    });

    return NextResponse.json(pod);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update pod';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const { id } = await params;

    // Referential safety check: verify if pod has members
    const memberCount = await db.employee.count({ where: { podId: id } });
    if (memberCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete pod: It currently contains ${memberCount} members. Reassign members before deleting.` },
        { status: 400 },
      );
    }

    const pod = await db.pod.delete({ where: { id } });

    await logAudit({
      actor: role,
      action: 'DELETE_POD',
      entityType: 'Pod',
      entityId: id,
      payload: { name: pod.name },
    });

    return NextResponse.json({ success: true, deleted: pod });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete pod';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
