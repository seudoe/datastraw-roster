import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';

const ackSchema = z.object({
  fingerprint: z.string().min(1, 'Fingerprint is required'),
  reason: z.string().min(3, 'Acknowledgment explanation must be at least 3 characters'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const { id } = await params;
    const body = await request.json();
    const parsed = ackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { fingerprint, reason } = parsed.data;

    // Check roster exists
    const roster = await db.roster.findUnique({
      where: { id },
    });

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
    }

    const ack = await db.conflictAck.create({
      data: {
        rosterId: id,
        fingerprint,
        reason,
        ackBy: role,
      },
    });

    await logAudit({
      actor: role,
      action: 'CONFLICT_ACKNOWLEDGED',
      entityType: 'Roster',
      entityId: id,
      payload: {
        fingerprint,
        reason,
      },
    });

    return NextResponse.json({ success: true, ack });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to acknowledge conflict' },
      { status: 500 },
    );
  }
}
