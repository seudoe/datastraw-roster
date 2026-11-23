import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const calendarSchema = z.object({
  name: z.string().min(2),
  rule: z.enum(['ALL_365', 'DAILY_EXCEPT_HOLIDAYS', 'SUN_AND_HOLIDAYS_OFF', 'CUSTOM']),
  workingWeekdays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  observesHolidays: z.boolean().default(true),
});

export async function GET() {
  try {
    const calendars = await db.operatingCalendar.findMany({
      include: {
        brands: { select: { id: true, code: true, name: true } },
        processes: { select: { id: true, name: true, brandId: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(calendars);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = calendarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const calendar = await db.operatingCalendar.create({
      data: parsed.data,
    });

    await logAudit({
      actor: role,
      action: 'CREATE_CALENDAR',
      entityType: 'OperatingCalendar',
      entityId: calendar.id,
      payload: { name: calendar.name, rule: calendar.rule },
    });

    return NextResponse.json(calendar, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create calendar';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
