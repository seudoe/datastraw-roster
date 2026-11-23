import React, { Suspense } from 'react';
import { db } from '@/server/db';
import { getCurrentRole } from '@/server/auth';
import { loadDomainSnapshot, getRoster } from '@/server/services/rosterService';
import { RippleSimulator } from '@/components/ripple/ripple-simulator';

export const dynamic = 'force-dynamic';

export default async function RipplePage() {
  const month = '2026-12';
  const role = await getCurrentRole();
  const snapshot = await loadDomainSnapshot();
  const roster = await getRoster(month);

  const scenarios = await db.scenario.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="max-w-[100rem] mx-auto px-4 py-6">
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Ripple Simulator...</div>}>
        <RippleSimulator
          month={month}
          rosterId={roster?.id || ''}
          rosterVersion={roster?.version || 1}
          snapshot={snapshot}
          scenarios={scenarios.map((s) => ({
            id: s.id,
            name: s.name,
            changeSet: s.changeSet,
          }))}
          userRole={role}
        />
      </Suspense>
    </div>
  );
}
