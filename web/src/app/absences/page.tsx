import React, { Suspense } from 'react';
import { db } from '@/server/db';
import { getCurrentRole } from '@/server/auth';
import { AbsenceManager } from '@/components/absences/absence-manager';

export const dynamic = 'force-dynamic';

export default async function AbsencesPage() {
  const month = '2026-12';
  const role = await getCurrentRole();

  const [absences, employees] = await Promise.all([
    db.absence.findMany({
      include: {
        employee: {
          include: { pod: true },
        },
      },
      orderBy: { startDate: 'desc' },
    }),
    db.employee.findMany({
      where: { active: true },
      include: { pod: true },
      orderBy: { code: 'asc' },
    }),
  ]);

  const absenceItems = absences.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    employeeCode: a.employee.code,
    employeeName: a.employee.name,
    podName: a.employee.pod?.name || 'Unassigned',
    podId: a.employee.podId,
    type: a.type,
    startDate: a.startDate.toISOString().split('T')[0],
    endDate: a.endDate.toISOString().split('T')[0],
    status: a.status as 'PENDING' | 'APPROVED' | 'REJECTED',
    reason: a.reason,
    createdAt: a.createdAt.toISOString(),
  }));

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    code: e.code,
    name: e.name,
    podName: e.pod?.name || 'Unassigned',
  }));

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Absence Intelligence...</div>}>
      <AbsenceManager
        initialAbsences={absenceItems}
        employees={employeeOptions}
        month={month}
        userRole={role}
      />
    </Suspense>
  );
}
