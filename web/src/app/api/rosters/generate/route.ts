import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { generateRoster } from '@/server/services/rosterService';

const generateSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  profile: z
    .enum(['BALANCED', 'COVERAGE_FIRST', 'FAIRNESS_FIRST', 'PREFERENCE_FIRST'])
    .optional(),
  timeLimitSec: z.number().min(1).max(120).optional(),
  seed: z.number().optional(),
  publishImmediately: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { month, profile, timeLimitSec, seed, publishImmediately } = parsed.data;

    const result = await generateRoster(month, {
      profile,
      timeLimitSec,
      seed,
      publishImmediately,
      createdBy: role,
    });

    return NextResponse.json({
      success: true,
      roster: result.roster,
      metrics: result.solveResponse.metrics,
      solverMeta: result.solveResponse.solverMeta,
      gaps: result.solveResponse.gaps,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to generate roster' },
      { status: 500 },
    );
  }
}
