import { NextResponse } from 'next/server';
import { loadDomainSnapshot } from '@/server/services/rosterService';
import { computeSystemResilience } from '@/domain/resilience/resilience';

export async function GET() {
  try {
    const snapshot = await loadDomainSnapshot();
    const report = computeSystemResilience(snapshot);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to compute resilience analytics' },
      { status: 500 },
    );
  }
}
