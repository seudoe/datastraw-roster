import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const calendarUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  rule: z.enum(['ALL_365', 'DAILY_EXCEPT_HOLIDAYS', 'SUN_AND_HOLIDAYS_OFF', 'CUSTOM']).optional(),
  workingWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
  observesHolidays: z.boolean().optional(),
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
    const parsed = calendarUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const calendar = await db.operatingCalendar.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit({
      actor: role,
      action: 'UPDATE_CALENDAR',
      entityType: 'OperatingCalendar',
      entityId: id,
      payload: parsed.data,
    });

    return NextResponse.json(calendar);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update calendar';
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

    // Check if any brand or process uses this calendar
    const brandsUsing = await db.brand.count({ where: { calendarId: id } });
    if (brandsUsing > 0) {
      return NextResponse.json(
        { error: `Cannot delete calendar: It is currently assigned to ${brandsUsing} brands.` },
        { status: 400 },
      );
    }

    const calendar = await db.operatingCalendar.delete({ where: { id } });

    await logAudit({
      actor: role,
      action: 'DELETE_CALENDAR',
      entityType: 'OperatingCalendar',
      entityId: id,
      payload: { name: calendar.name },
    });

    return NextResponse.json({ success: true, deleted: calendar });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete calendar';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
