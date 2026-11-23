import { NextResponse } from 'next/server';
import { db } from '@/server/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const actor = url.searchParams.get('actor');
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    const where: any = {};
    if (action && action !== 'ALL') where.action = action;
    if (actor && actor !== 'ALL') where.actor = actor;

    const [events, total] = await Promise.all([
      db.auditEvent.findMany({
        where,
        orderBy: { at: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.auditEvent.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      events,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve audit events' },
      { status: 500 },
    );
  }
}
