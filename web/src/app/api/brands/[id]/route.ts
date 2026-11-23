import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const brandUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  calendarId: z.string().min(1).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const brand = await db.brand.findUnique({
    where: { id },
    include: {
      calendar: true,
      processes: {
        include: {
          calendar: true,
          rules: true,
          assignments: {
            include: {
              employee: { select: { id: true, code: true, name: true, skills: true, podId: true } },
            },
          },
        },
      },
      holidays: true,
    },
  });

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  return NextResponse.json(brand);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const { id } = await params;
    const body = await request.json();
    const parsed = brandUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const brand = await db.brand.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit({
      actor: role,
      action: 'UPDATE_BRAND',
      entityType: 'Brand',
      entityId: id,
      payload: parsed.data,
    });

    return NextResponse.json(brand);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update brand';
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

    const brand = await db.brand.delete({ where: { id } });

    await logAudit({
      actor: role,
      action: 'DELETE_BRAND',
      entityType: 'Brand',
      entityId: id,
      payload: { code: brand.code, name: brand.name },
    });

    return NextResponse.json({ success: true, deleted: brand });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete brand';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
