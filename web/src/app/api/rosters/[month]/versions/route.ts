import { NextResponse } from 'next/server';
import { listRosterVersions } from '@/server/services/rosterService';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ month: string }> },
) {
  try {
    const { month } = await params;
    const versions = await listRosterVersions(month);
    return NextResponse.json({ versions });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to list roster versions' },
      { status: 500 },
    );
  }
}
