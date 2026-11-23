import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import { z } from 'zod';

const employeeCreateSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  podId: z.string().min(1),
  skills: z.array(z.enum(['CS', 'ACC', 'NDR', 'RETENTION', 'OTHER'])).min(1),
  weeklyOffsPerWeek: z.number().int().min(0).max(3).default(1),
  preferredOffWeekdays: z.array(z.number().int().min(0).max(6)).default([0]),
  unavailableWeekdays: z.array(z.number().int().min(0).max(6)).default([]),
  maxConsecutiveWorkDays: z.number().int().min(1).max(14).nullable().optional(),
  maxBackupBrandsPerDay: z.number().int().min(1).max(10).nullable().optional(),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      include: {
        pod: { select: { id: true, name: true } },
        assignments: {
          include: {
            process: {
              include: {
                brand: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json(employees);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = employeeCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await db.employee.findUnique({ where: { code: data.code } });
    if (existing) {
      return NextResponse.json({ error: `Employee code '${data.code}' already exists` }, { status: 400 });
    }

    const employee = await db.employee.create({
      data: {
        code: data.code,
        name: data.name,
        email: data.email || null,
        podId: data.podId,
        skills: data.skills,
        weeklyOffsPerWeek: data.weeklyOffsPerWeek,
        preferredOffWeekdays: data.preferredOffWeekdays,
        unavailableWeekdays: data.unavailableWeekdays,
        maxConsecutiveWorkDays: data.maxConsecutiveWorkDays,
        maxBackupBrandsPerDay: data.maxBackupBrandsPerDay,
        active: data.active,
      },
    });

    await logAudit({
      actor: role,
      action: 'CREATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: employee.id,
      payload: { code: employee.code, name: employee.name },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create employee';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
