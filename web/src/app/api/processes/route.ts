import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const processSchema = z.object({
  brandId: z.string().min(1),
  type: z.enum(['CS', 'ACC', 'NDR', 'RETENTION', 'OTHER']),
  name: z.string().min(2),
  calendarId: z.string().nullable().optional(),
  defaultMinStaff: z.number().int().min(0).default(1),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');

  try {
    const processes = await db.process.findMany({
      where: brandId ? { brandId } : undefined,
      include: {
        brand: { select: { id: true, code: true, name: true } },
        calendar: true,
        rules: true,
        assignments: {
          include: {
            employee: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(processes);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch processes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = processSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const process = await db.process.create({
      data: parsed.data,
    });

    await logAudit({
      actor: role,
      action: 'CREATE_PROCESS',
      entityType: 'Process',
      entityId: process.id,
      payload: { name: process.name, brandId: process.brandId },
    });

    return NextResponse.json(process, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create process';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
