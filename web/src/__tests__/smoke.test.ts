import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('Web smoke tests', () => {
  it('combines class names correctly', () => {
    const result = cn('bg-red-500', 'text-white', { 'p-4': true, 'm-2': false });
    expect(result).toBe('bg-red-500 text-white p-4');
  });

  it('validates environment object format', async () => {
    const { env } = await import('../server/env');
    expect(env.NODE_ENV).toBeDefined();
    expect(env.DATABASE_URL).toContain('postgresql://');
  });
});
