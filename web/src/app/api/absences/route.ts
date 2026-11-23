import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { logAudit } from '@/server/audit';

function toDbDate(isoDateStr: string): Date {
  return new Date(`${isoDateStr}T00:00:00.000Z`);
}

export async function GET() {
  try {
    const absences = await db.absence.findMany({
      include: {
        employee: {
          include: {
            pod: true,
          },
        },
        redeemedCompOffs: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      absences: absences.map((a) => ({
        id: a.id,
        employeeId: a.employeeId,
        employeeCode: a.employee.code,
        employeeName: a.employee.name,
        podName: a.employee.pod?.name || 'Unassigned',
        podId: a.employee.podId,
        type: a.type,
        startDate: a.startDate.toISOString().split('T')[0],
        endDate: a.endDate.toISOString().split('T')[0],
        status: a.status,
        reason: a.reason,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to list absences' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, type, startDate, endDate, reason } = body;

    if (!employeeId || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId, type, startDate, endDate' },
        { status: 400 },
      );
    }

    const start = toDbDate(startDate);
    const end = toDbDate(endDate);

    if (start > end) {
      return NextResponse.json(
        { error: 'startDate cannot be after endDate' },
        { status: 400 },
      );
    }

    const absence = await db.absence.create({
      data: {
        employeeId,
        type,
        startDate: start,
        endDate: end,
        status: 'PENDING',
        reason: reason || 'Scheduled leave request',
      },
      include: {
        employee: {
          include: { pod: true },
        },
      },
    });

    // Record audit log
    await logAudit({
      actor: 'System User',
      action: 'ABSENCE_REQUESTED',
      entityType: 'Absence',
      entityId: absence.id,
      payload: {
        employeeCode: absence.employee.code,
        type,
        startDate,
        endDate,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      absence: {
        id: absence.id,
        employeeId: absence.employeeId,
        employeeCode: absence.employee.code,
        employeeName: absence.employee.name,
        podName: absence.employee.pod?.name || 'Unassigned',
        type: absence.type,
        startDate,
        endDate,
        status: absence.status,
        reason: absence.reason,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to create absence' },
      { status: 500 },
    );
  }
}
