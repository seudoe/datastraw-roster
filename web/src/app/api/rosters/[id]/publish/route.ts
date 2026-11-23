import { NextResponse } from 'next/server';
import { getCurrentRole, requireOpsManager } from '@/server/auth';
import { publishRoster } from '@/server/services/rosterService';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireOpsManager();
    const role = await getCurrentRole();
    const { id } = await params;

    const publishedRoster = await publishRoster(id, role);
    return NextResponse.json({
      success: true,
      roster: publishedRoster,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to publish roster' },
      { status: 500 },
    );
  }
}
