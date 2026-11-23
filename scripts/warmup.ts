/**
 * Cold-Start Keep-Alive & Service Warm-up Script
 * Pings web frontend and Python CP-SAT solver health endpoints.
 * Prevents free-tier microservices from sleeping.
 */
try {
  // Built-in env file loader in Node 20+
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {
  // Ignore if .env doesn't exist
}

const WEB_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.WEB_URL || 'http://localhost:3000';
const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8000';
const SOLVER_API_KEY = process.env.SOLVER_API_KEY || 'dev-solver-secret-key';

async function pingEndpoint(name: string, url: string, headers?: Record<string, string>) {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: headers || {},
      signal: AbortSignal.timeout(45_000), // 45s timeout for cold starts
    });
    const elapsed = Math.round(performance.now() - start);

    if (res.ok) {
      console.log(`[WARM-UP] ✅ ${name} is warm and responsive (${elapsed}ms) [${url}]`);
      return true;
    } else {
      console.warn(`[WARM-UP] ⚠️ ${name} responded with status ${res.status} (${elapsed}ms)`);
      return false;
    }
  } catch (error) {
    const elapsed = Math.round(performance.now() - start);
    console.error(`[WARM-UP] ❌ ${name} failed to respond within ${elapsed}ms:`, (error as Error).message);
    return false;
  }
}

async function main() {
  console.log('--- RosterIQ Warm-up & Keep-Alive Ping ---');
  console.log(`Target Web:    ${WEB_URL}`);
  console.log(`Target Solver: ${SOLVER_URL}`);
  console.log(`Timestamp:     ${new Date().toISOString()}`);

  const [webOk, solverOk] = await Promise.all([
    pingEndpoint('Web App Health', `${WEB_URL.replace(/\/$/, '')}/api/health`),
    pingEndpoint('Solver Microservice Health', `${SOLVER_URL.replace(/\/$/, '')}/v1/health`, {
      'X-Solver-Key': SOLVER_API_KEY,
    }),
  ]);

  if (webOk && solverOk) {
    console.log('[WARM-UP] All services warm and active.');
    process.exit(0);
  } else {
    console.log('[WARM-UP] Warning: One or more services degraded or initializing.');
    process.exit(0); // Exit 0 so cron doesn't alarm during spin-up
  }
}

main().catch((err) => {
  console.error('[WARM-UP] Fatal error:', err);
  process.exit(1);
});
