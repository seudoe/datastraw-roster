import { NextResponse } from 'next/server';
import { explainConflictWithGroq } from '@/server/groqExplain';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conflictData = body.conflict || body.gap || body;

    if (!conflictData) {
      return NextResponse.json(
        { error: 'Missing conflict or gap data in request body' },
        { status: 400 },
      );
    }

    const result = await explainConflictWithGroq(conflictData);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to explain conflict' },
      { status: 500 },
    );
  }
}
