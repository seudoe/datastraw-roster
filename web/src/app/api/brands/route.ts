import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const brandSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2),
  calendarId: z.string().min(1),
  priority: z.number().int().min(1).max(3).default(2),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    const brands = await db.brand.findMany({
      include: {
        calendar: true,
        processes: {
          include: {
            assignments: {
              include: {
                employee: { select: { id: true, code: true, name: true } },
              },
            },
            rules: true,
          },
        },
        holidays: true,
      },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json(brands);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = brandSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const brand = await db.brand.create({
      data: parsed.data,
    });

    await logAudit({
      actor: role,
      action: 'CREATE_BRAND',
      entityType: 'Brand',
      entityId: brand.id,
      payload: { code: brand.code, name: brand.name },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create brand';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
