import { describe, it, expect } from 'vitest';
import { db } from '../server/db';

describe('Database Connection & Schema Verification', () => {
  it('connects to Neon PostgreSQL and queries the database', async () => {
    const podCount = await db.pod.count();
    expect(podCount).toBeGreaterThanOrEqual(0);

    const brandCount = await db.brand.count();
    expect(brandCount).toBeGreaterThanOrEqual(0);
  });
});
