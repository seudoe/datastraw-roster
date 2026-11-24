import { NextResponse } from 'next/server';
import { getRoster } from '@/server/services/rosterService';
import { db } from '@/server/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const versionParam = url.searchParams.get('version');
    const version = versionParam ? parseInt(versionParam, 10) : undefined;

    let roster;
    if (/^\d{4}-\d{2}$/.test(id)) {
      roster = await getRoster(id, version);
    } else {
      roster = await db.roster.findUnique({
        where: { id },
        include: {
          entries: {
            include: {
              employee: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  podId: true,
                  skills: true,
                },
              },
            },
          },
          backupDuties: {
            include: {
              process: {
                include: {
                  brand: {
                    select: { id: true, code: true, name: true },
                  },
                },
              },
            },
          },
          conflictAcks: true,
        },
      });
    }

    if (!roster) {
      return NextResponse.json(
        { error: `No roster found for identifier ${id}${version ? ` (v${version})` : ''}` },
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
