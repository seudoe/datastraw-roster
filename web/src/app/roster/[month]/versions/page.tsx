import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentRole } from '@/server/auth';
import { listRosterVersions } from '@/server/services/rosterService';
import { VersionsViewer } from '@/components/roster/versions-viewer';

export const dynamic = 'force-dynamic';

export default async function VersionsPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    notFound();
  }

  const role = await getCurrentRole();
  const rawVersions = await listRosterVersions(month);

  const versionsPayload = rawVersions.map((v) => ({
    id: v.id,
    month: v.month,
    version: v.version,
    status: v.status as any,
    profile: v.profile,
    parentId: v.parentId,
    createdBy: v.createdBy,
    createdAt: v.createdAt.toISOString(),
    solverMeta: v.solverMeta,
    entryCount: v._count.entries,
  }));

  return (
    <div className="max-w-[100rem] mx-auto px-4 py-6">
      <VersionsViewer
        month={month}
        versions={versionsPayload}
        canPublish={role === 'OPS_MANAGER'}
      />
    </div>
  );
}
