import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import { CompareViewer, type VersionCompareItem } from '@/components/roster/compare-viewer';

export const dynamic = 'force-dynamic';

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ month: string }>;
  searchParams?: Promise<{ v1?: string; v2?: string }>;
}) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    notFound();
  }

  const sp = searchParams ? await searchParams : {};
  const v1 = sp.v1 ? parseInt(sp.v1, 10) : undefined;
  const v2 = sp.v2 ? parseInt(sp.v2, 10) : undefined;

  const rosterRecords = await db.roster.findMany({
    where: { month },
    orderBy: { version: 'desc' },
    include: {
      entries: {
        include: {
          employee: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  });

  if (rosterRecords.length === 0) {
    notFound();
  }

  const versionsPayload: VersionCompareItem[] = rosterRecords.map((r) => ({
    id: r.id,
    version: r.version,
    status: r.status,
    profile: r.profile,
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy,
    solverMeta: r.solverMeta,
    entries: r.entries.map((e) => ({
      employeeId: e.employeeId,
      employeeCode: e.employee.code,
      employeeName: e.employee.name,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
    })),
  }));

  return (
    <div className="max-w-[100rem] mx-auto px-4 py-6">
      <CompareViewer
        month={month}
        versions={versionsPayload}
        defaultV1={v1}
        defaultV2={v2}
      />
    </div>
  );
}
