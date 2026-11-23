import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(2),
  brandId: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');

  try {
    const holidays = await db.holiday.findMany({
      where: brandId ? { OR: [{ brandId: null }, { brandId }] } : undefined,
      include: { brand: { select: { id: true, code: true, name: true } } },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(holidays);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = holidaySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const holiday = await db.holiday.create({
      data: {
        date: new Date(`${parsed.data.date}T00:00:00.000Z`),
        name: parsed.data.name,
        brandId: parsed.data.brandId || null,
      },
    });

    await logAudit({
      actor: role,
      action: 'CREATE_HOLIDAY',
      entityType: 'Holiday',
      entityId: holiday.id,
      payload: parsed.data,
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create holiday';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
