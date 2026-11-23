import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const { id } = await params;

    const holiday = await db.holiday.delete({ where: { id } });

    await logAudit({
      actor: role,
      action: 'DELETE_HOLIDAY',
      entityType: 'Holiday',
      entityId: id,
      payload: { name: holiday.name },
    });

    return NextResponse.json({ success: true, deleted: holiday });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete holiday';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
