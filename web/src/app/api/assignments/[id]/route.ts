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

    const assignment = await db.assignment.delete({ where: { id } });

    await logAudit({
      actor: role,
      action: 'DELETE_ASSIGNMENT',
      entityType: 'Assignment',
      entityId: id,
      payload: { employeeId: assignment.employeeId, processId: assignment.processId },
    });

    return NextResponse.json({ success: true, deleted: assignment });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete assignment';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
