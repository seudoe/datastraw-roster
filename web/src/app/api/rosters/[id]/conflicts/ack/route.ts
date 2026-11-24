import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';

const ackSchema = z.object({
  fingerprint: z.string().optional(),
  fingerprints: z.array(z.string()).optional(),
  reason: z.string().min(3, 'Acknowledgment explanation must be at least 3 characters'),
}).refine((data) => data.fingerprint || (data.fingerprints && data.fingerprints.length > 0), {
  message: 'Either fingerprint or fingerprints array is required',
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

    const { fingerprint, fingerprints, reason } = parsed.data;

    // Check roster exists
    const roster = await db.roster.findUnique({
      where: { id },
    });

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
    }

    const allFingerprints = fingerprints && fingerprints.length > 0 
      ? fingerprints 
      : fingerprint ? [fingerprint] : [];

    const ackItems = allFingerprints.map((fp) => ({
      rosterId: id,
      fingerprint: fp,
      reason,
      ackBy: role,
    }));

    await db.conflictAck.createMany({
      data: ackItems,
      skipDuplicates: true,
    });

    await logAudit({
      actor: role,
      action: 'CONFLICT_ACKNOWLEDGED',
      entityType: 'Roster',
      entityId: id,
      payload: {
        count: allFingerprints.length,
        fingerprints: allFingerprints.slice(0, 5),
        reason,
      },
    });

    return NextResponse.json({ success: true, count: allFingerprints.length });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to acknowledge conflict' },
      { status: 500 },
    );
  }
}
