import { db } from './db';
import type { Prisma } from '../generated/prisma/client';

export interface AuditLogParams {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown> | null;
}

/**
 * Creates an immutable audit trail event for every configuration mutation or roster action.
 */
export async function logAudit({
  actor,
  action,
  entityType,
  entityId,
  payload,
}: AuditLogParams): Promise<void> {
  try {
    await db.auditEvent.create({
      data: {
        actor,
        action,
        entityType,
        entityId,
        payload: (payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Non-blocking: Do not crash primary mutation if audit log fails
  }
}
