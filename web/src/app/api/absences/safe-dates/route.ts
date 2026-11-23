import { NextResponse } from 'next/server';
import { getRoster, loadDomainSnapshot } from '@/server/services/rosterService';
import { computeSafeDates } from '@/domain/ripple/safeDates';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const month = url.searchParams.get('month');

    if (!employeeId || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'Missing or invalid parameters: employeeId and month (YYYY-MM) are required.' },
        { status: 400 },
      );
    }

    const roster = await getRoster(month);
    if (!roster) {
      return NextResponse.json(
        { error: `No roster found for month ${month}` },
        { status: 404 },
      );
    }

    const snapshot = await loadDomainSnapshot();

    const entries = roster.entries.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
    }));

    const safeDates = computeSafeDates(employeeId, month, entries, snapshot);

    return NextResponse.json({
      success: true,
      employeeId,
      month,
      safeDates,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to compute safe dates' },
      { status: 500 },
    );
  }
}
