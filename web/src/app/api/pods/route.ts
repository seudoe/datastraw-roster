import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const podSchema = z.object({
  name: z.string().min(2),
  leadId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const pods = await db.pod.findMany({
      include: {
        lead: { select: { id: true, code: true, name: true } },
        members: { select: { id: true, code: true, name: true, active: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(pods);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch pods' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = podSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const pod = await db.pod.create({
      data: {
        name: parsed.data.name,
        leadId: parsed.data.leadId || null,
      },
    });

    await logAudit({
      actor: role,
      action: 'CREATE_POD',
      entityType: 'Pod',
      entityId: pod.id,
      payload: { name: pod.name },
    });

    return NextResponse.json(pod, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create pod';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
