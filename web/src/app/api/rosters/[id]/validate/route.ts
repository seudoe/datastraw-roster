import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { loadDomainSnapshot } from '@/server/services/rosterService';
import { validateRoster } from '@/domain/validator/validateRoster';
import type { RosterEntryValidationInput } from '@/domain/validator/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const roster = await db.roster.findUnique({
      where: { id },
      include: {
        entries: true,
        backupDuties: true,
        conflictAcks: true,
      },
    });

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
    }

    const snapshot = await loadDomainSnapshot();

    const validationEntries: RosterEntryValidationInput[] = roster.entries.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
      locked: e.locked,
    }));

    const validationBackupDuties = roster.backupDuties.map((b) => ({
      employeeId: b.employeeId,
      processId: b.processId,
      date: b.date.toISOString().split('T')[0],
    }));

    const acks = roster.conflictAcks.map((a) => ({
      fingerprint: a.fingerprint,
      reason: a.reason,
      ackBy: a.ackBy,
    }));

    const validationResult = validateRoster(
      roster.month,
      validationEntries,
      validationBackupDuties,
      snapshot,
      acks,
    );

    return NextResponse.json(validationResult);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Validation failed' },
      { status: 500 },
    );
  }
}
