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

    const rule = await db.coverageRule.delete({ where: { id } });

    await logAudit({
      actor: role,
      action: 'DELETE_COVERAGE_RULE',
      entityType: 'CoverageRule',
      entityId: id,
      payload: { processId: rule.processId, minStaff: rule.minStaff },
    });

    return NextResponse.json({ success: true, deleted: rule });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete coverage rule';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
