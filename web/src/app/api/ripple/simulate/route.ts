import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRoster, loadDomainSnapshot } from '@/server/services/rosterService';
import { simulateChange } from '@/domain/ripple/simulate';
import type { ChangeSet } from '@/domain/ripple/types';

const simulateSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  changeSet: z.object({
    id: z.string().optional(),
    type: z.enum(['LEAVE_REQUEST', 'DEMAND_CHANGE', 'CAPACITY_CHANGE', 'SWAP_REQUEST']),
    payload: z.record(z.string(), z.any()),
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = simulateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { month, changeSet } = parsed.data;

    // Load active or latest roster for month
    const roster = await getRoster(month);
    if (!roster) {
      return NextResponse.json(
        { error: `No existing roster found for month ${month}. Please generate a baseline roster first.` },
        { status: 404 },
      );
    }

    const snapshot = await loadDomainSnapshot();

    const entries = roster.entries.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
      locked: e.locked,
    }));

    const result = simulateChange(changeSet as ChangeSet, entries, snapshot);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Ripple simulation failed' },
      { status: 500 },
    );
  }
}
