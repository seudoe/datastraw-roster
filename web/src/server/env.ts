import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgrespassword@localhost:5432/roster_iq'),
  DIRECT_URL: z.string().url().optional(),
  SOLVER_URL: z.string().url().default('http://localhost:8000'),
  SOLVER_API_KEY: z.string().default('dev-solver-secret-key'),
  SESSION_SECRET: z.string().default('dev-session-secret-at-least-32-chars-long!'),
  GROQ_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  EXPLAIN_MODEL: z.string().default('llama-3.3-70b-versatile'),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  SOLVER_URL: process.env.SOLVER_URL,
  SOLVER_API_KEY: process.env.SOLVER_API_KEY,
  SESSION_SECRET: process.env.SESSION_SECRET,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  EXPLAIN_MODEL: process.env.EXPLAIN_MODEL,
});
