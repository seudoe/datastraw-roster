import { NextResponse } from 'next/server';
import { getRoster } from '@/server/services/rosterService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ month: string }> },
) {
  try {
    const { month } = await params;
    const url = new URL(request.url);
    const versionParam = url.searchParams.get('version');
    const version = versionParam ? parseInt(versionParam, 10) : undefined;

    const roster = await getRoster(month, version);

    if (!roster) {
      return NextResponse.json(
        { error: `No roster found for month ${month}${version ? ` (v${version})` : ''}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ roster });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve roster' },
      { status: 500 },
    );
  }
}
