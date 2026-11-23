import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { logAudit } from '@/server/audit';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED, REJECTED, or PENDING.' },
        { status: 400 },
      );
    }

    const existing = await db.absence.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Absence with id ${id} not found.` },
        { status: 404 },
      );
    }

    const updated = await db.absence.update({
      where: { id },
      data: { status },
      include: { employee: true },
    });

    // Record audit log
    await logAudit({
      actor: 'Ops Manager',
      action: status === 'APPROVED' ? 'ABSENCE_APPROVED' : 'ABSENCE_REJECTED',
      entityType: 'Absence',
      entityId: id,
      payload: {
        employeeCode: existing.employee.code,
        previousStatus: existing.status,
        newStatus: status,
      },
    });

    return NextResponse.json({
      success: true,
      absence: {
        id: updated.id,
        employeeId: updated.employeeId,
        status: updated.status,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to update absence status' },
      { status: 500 },
    );
  }
}
