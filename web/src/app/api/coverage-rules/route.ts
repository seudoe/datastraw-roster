import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const coverageRuleSchema = z.object({
  processId: z.string().min(1),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  minStaff: z.number().int().min(0),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const processId = searchParams.get('processId');

  try {
    const rules = await db.coverageRule.findMany({
      where: processId ? { processId } : undefined,
      include: { process: { select: { id: true, name: true, brandId: true } } },
    });
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch coverage rules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = coverageRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const { date, ...rest } = parsed.data;
    const rule = await db.coverageRule.create({
      data: {
        ...rest,
        date: date ? new Date(`${date}T00:00:00.000Z`) : null,
      },
    });

    await logAudit({
      actor: role,
      action: 'CREATE_COVERAGE_RULE',
      entityType: 'CoverageRule',
      entityId: rule.id,
      payload: parsed.data,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create coverage rule';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
