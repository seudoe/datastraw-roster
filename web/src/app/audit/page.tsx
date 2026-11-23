import React from 'react';
import { db } from '@/server/db';
import { AuditViewer } from '@/components/audit/audit-viewer';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const [events, notifications] = await Promise.all([
    db.auditEvent.findMany({
      orderBy: { at: 'desc' },
      take: 100,
    }),
    db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <div className="max-w-[100rem] mx-auto px-4 py-6">
      <AuditViewer
        initialEvents={events.map((e) => ({
          id: e.id,
          at: e.at.toISOString(),
          actor: e.actor,
          action: e.action,
          entityType: e.entityType,
          entityId: e.entityId,
          payload: e.payload,
        }))}
        initialNotifications={notifications.map((n) => ({
          id: n.id,
          audience: n.audience,
          message: n.message,
          readAt: n.readAt?.toISOString() || null,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
