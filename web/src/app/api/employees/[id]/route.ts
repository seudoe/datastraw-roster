import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const employeeUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  podId: z.string().min(1).optional(),
  skills: z.array(z.enum(['CS', 'ACC', 'NDR', 'RETENTION', 'OTHER'])).optional(),
  weeklyOffsPerWeek: z.number().int().min(0).max(3).optional(),
  preferredOffWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
  unavailableWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
  maxConsecutiveWorkDays: z.number().int().min(1).max(14).nullable().optional(),
  maxBackupBrandsPerDay: z.number().int().min(1).max(10).nullable().optional(),
  active: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      pod: true,
      assignments: {
        include: {
          process: { include: { brand: true } },
        },
      },
      absences: true,
    },
  });

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  return NextResponse.json(employee);
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
    const parsed = employeeUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const updated = await db.employee.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit({
      actor: role,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: id,
      payload: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update employee';
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

    // Referential safety check: verify if employee is a pod lead
    const ledPod = await db.pod.findFirst({ where: { leadId: id } });
    if (ledPod) {
      return NextResponse.json(
        { error: `Cannot delete employee: They are the lead of ${ledPod.name}. Please reassign pod lead first.` },
        { status: 400 },
      );
    }

    const employee = await db.employee.delete({
      where: { id },
    });

    await logAudit({
      actor: role,
      action: 'DELETE_EMPLOYEE',
      entityType: 'Employee',
      entityId: id,
      payload: { code: employee.code, name: employee.name },
    });

    return NextResponse.json({ success: true, deleted: employee });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete employee';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
