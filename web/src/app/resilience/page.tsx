import React from 'react';
import { loadDomainSnapshot } from '@/server/services/rosterService';
import { computeSystemResilience } from '@/domain/resilience/resilience';
import { ResilienceDashboard } from '@/components/resilience/resilience-dashboard';

export const dynamic = 'force-dynamic';

export default async function ResiliencePage() {
  const snapshot = await loadDomainSnapshot();
  const report = computeSystemResilience(snapshot);

  return (
    <div className="max-w-[100rem] mx-auto px-4 py-6">
      <ResilienceDashboard initialReport={report} />
    </div>
  );
}
