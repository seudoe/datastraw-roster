import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentRole, requireNotViewer } from '@/server/auth';
import { logAudit } from '@/server/audit';
import type { Prisma } from '@/generated/prisma/client';

export async function GET() {
  try {
    const settingsRows = await db.setting.findMany();
    const settings: Record<string, unknown> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireNotViewer();
    const role = await getCurrentRole();
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await db.setting.upsert({
        where: { key },
        update: { value: value as Prisma.InputJsonValue },
        create: { key, value: value as Prisma.InputJsonValue },
      });
    }

    await logAudit({
      actor: role,
      action: 'UPDATE_SETTINGS',
      entityType: 'Setting',
      entityId: 'global',
      payload: body,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
