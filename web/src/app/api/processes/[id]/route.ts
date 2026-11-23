import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const processUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.enum(['CS', 'ACC', 'NDR', 'RETENTION', 'OTHER']).optional(),
  calendarId: z.string().nullable().optional(),
  defaultMinStaff: z.number().int().min(0).optional(),
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
    const parsed = processUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const process = await db.process.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit({
      actor: role,
      action: 'UPDATE_PROCESS',
      entityType: 'Process',
      entityId: id,
      payload: parsed.data,
    });

    return NextResponse.json(process);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update process';
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

    const process = await db.process.delete({ where: { id } });

    await logAudit({
      actor: role,
      action: 'DELETE_PROCESS',
      entityType: 'Process',
      entityId: id,
      payload: { name: process.name },
    });

    return NextResponse.json({ success: true, deleted: process });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete process';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
