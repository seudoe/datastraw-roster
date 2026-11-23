import { NextResponse } from 'next/server';
import { db } from '@/server/db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const notification = await db.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to update notification' },
      { status: 500 },
    );
  }
}
