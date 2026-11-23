/**
 * RosterIQ Solver HTTP Client
 * Communicates with the Python 3.12 FastAPI CP-SAT optimization microservice.
 * Includes timeout handling, header authentication, and exponential backoff retry for cold starts.
 */
import { env } from './env';
import type { SolverProblemSpec } from '@/domain/types';

export interface SolverHealthResponse {
  status: string;
  service: string;
  version: string;
  solver: string;
}

export interface SolveResponseDto {
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';
  objectiveValue: number;
  entries: {
    employeeId: string;
    date: string;
    status: 'WORK' | 'WEEKLY_OFF' | 'HOLIDAY' | 'LEAVE' | 'COMP_OFF';
    processId?: string | null;
    role?: 'PRIMARY' | 'BACKUP' | 'TEMPORARY' | null;
    isOverride: boolean;
    note?: string | null;
  }[];
  backupDuties: {
    employeeId: string;
    brandId: string;
    date: string;
    role: string;
    reason?: string | null;
  }[];
  gaps: {
    processId: string;
    brandId: string;
    date: string;
    requiredStaff: number;
    actualStaff: number;
    deficit: number;
    brandPriority: number;
  }[];
  metrics: {
    coverageRate: number;
    totalGaps: number;
    totalBackupActivations: number;
    preferenceSatisfactionRate: number;
    maxConsecutiveDaysObserved: number;
    weekendSpreadMaxDelta: number;
  };
  solverMeta: {
    status: string;
    objectiveValue: number;
    solveTimeSec: number;
    numVariables: number;
    numConstraints: number;
    deterministicSeed: number;
    profile: string;
  };
}

const SOLVER_URL = env.SOLVER_URL || 'http://localhost:8000';
const SOLVER_API_KEY = env.SOLVER_API_KEY || 'dev-solver-secret-key';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

/** Sleep utility for exponential backoff */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes an HTTP fetch to the solver service with retries on network/5xx errors.
 */
async function fetchWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<T> {
  const url = `${SOLVER_URL.replace(/\/$/, '')}${endpoint}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Solver-Key': SOLVER_API_KEY,
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        // If 502/503/504 (cold start), retry
        if (res.status >= 500 && attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await sleep(delay);
          continue;
        }
        throw new Error(
          `Solver microservice error [${res.status} ${res.statusText}]: ${errorText || 'No error body'}`,
        );
      }

      return (await res.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (err as Error)?.name === 'AbortError';
      lastError = isAbort
        ? new Error(`Solver microservice request timed out after ${DEFAULT_TIMEOUT_MS}ms`)
        : (err as Error);

      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`Failed to communicate with solver service after ${retries} attempts`);
}

export const solverClient = {
  /**
   * Health check to test connectivity and solver version.
   */
  async checkHealth(): Promise<SolverHealthResponse> {
    return fetchWithRetry<SolverHealthResponse>('/v1/health', {
      method: 'GET',
    });
  },

  /**
   * Primary roster solve call using CP-SAT.
   */
  async solve(problem: SolverProblemSpec): Promise<SolveResponseDto> {
    return fetchWithRetry<SolveResponseDto>('/v1/solve', {
      method: 'POST',
      body: JSON.stringify(problem),
    });
  },

  /**
   * Minimal-disruption repair call for the Ripple Engine.
   */
  async repair(payload: {
    baseProblem: SolverProblemSpec;
    currentEntries: {
      employeeId: string;
      date: string;
      status: string;
      processId?: string | null;
    }[];
    disruptionWeight?: number;
  }): Promise<SolveResponseDto> {
    return fetchWithRetry<SolveResponseDto>('/v1/repair', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
