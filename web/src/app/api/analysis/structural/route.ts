import { NextResponse } from 'next/server';
import { loadDomainSnapshot } from '@/server/services/rosterService';
import { analyzeStructuralFeasibility } from '@/domain/analysis/structural';

export async function GET() {
  try {
    const snapshot = await loadDomainSnapshot();
    const summary = analyzeStructuralFeasibility(snapshot);
    return NextResponse.json(summary);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to perform structural feasibility analysis' },
      { status: 500 },
    );
  }
}
