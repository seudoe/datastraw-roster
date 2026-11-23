import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { env } from '@/server/env';

export async function GET() {
  let dbStatus = 'ok';
  let solverStatus = 'unknown';

  // Check Database
  try {
    await db.setting.count();
  } catch (err: unknown) {
    dbStatus = `error: ${err instanceof Error ? err.message : 'DB connection failed'}`;
  }

  // Check Solver microservice
  try {
    const res = await fetch(`${env.SOLVER_URL}/v1/health`, {
      headers: { 'X-Solver-Key': env.SOLVER_API_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      solverStatus = data.status || 'ok';
    } else {
      solverStatus = `http_${res.status}`;
    }
  } catch {
    solverStatus = 'offline';
  }

  return NextResponse.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    services: {
      web: 'ok',
      db: dbStatus,
      solver: solverStatus,
    },
    timestamp: new Date().toISOString(),
  });
}
