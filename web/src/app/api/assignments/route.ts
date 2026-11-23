import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const assignmentSchema = z.object({
  employeeId: z.string().min(1),
  processId: z.string().min(1),
  role: z.enum(['PRIMARY', 'BACKUP', 'TEMPORARY']).default('PRIMARY'),
  allocationPct: z.number().int().min(1).max(100).default(100),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const processId = searchParams.get('processId');
  const employeeId = searchParams.get('employeeId');

  try {
    const assignments = await db.assignment.findMany({
      where: {
        processId: processId || undefined,
        employeeId: employeeId || undefined,
      },
      include: {
        employee: { select: { id: true, code: true, name: true, podId: true, skills: true } },
        process: { select: { id: true, name: true, type: true, brandId: true } },
      },
    });
    return NextResponse.json(assignments);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = assignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const { validFrom, validTo, ...rest } = parsed.data;
    const assignment = await db.assignment.create({
      data: {
        ...rest,
        validFrom: validFrom ? new Date(`${validFrom}T00:00:00.000Z`) : null,
        validTo: validTo ? new Date(`${validTo}T00:00:00.000Z`) : null,
      },
      include: {
        employee: true,
        process: true,
      },
    });

    await logAudit({
      actor: role,
      action: 'CREATE_ASSIGNMENT',
      entityType: 'Assignment',
      entityId: assignment.id,
      payload: { employeeId: assignment.employeeId, processId: assignment.processId, role: assignment.role },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create assignment';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
