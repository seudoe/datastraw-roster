import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentRole } from '@/server/auth';
import { loadDomainSnapshot, getRoster, listRosterVersions } from '@/server/services/rosterService';
import { validateRoster } from '@/domain/validator/validateRoster';
import { RosterGrid, type RosterDataPayload } from '@/components/roster/roster-grid';
import type { Conflict, RosterEntryValidationInput } from '@/domain/validator/types';

export const dynamic = 'force-dynamic';

export default async function RosterMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    notFound();
  }

  const role = await getCurrentRole();
  const snapshot = await loadDomainSnapshot();
  const rosterRecord = await getRoster(month);
  const allVersions = await listRosterVersions(month);

  let initialConflicts: Conflict[] = [];
  let rosterData: RosterDataPayload | null = null;

  if (rosterRecord) {
    const validationEntries: RosterEntryValidationInput[] = rosterRecord.entries.map((e) => ({
      employeeId: e.employeeId,
      date: e.date.toISOString().split('T')[0],
      status: e.status,
      processId: e.note?.startsWith('process:') ? e.note.replace('process:', '') : null,
      locked: e.locked,
    }));

    const validationBackupDuties = rosterRecord.backupDuties.map((b) => ({
      employeeId: b.employeeId,
      processId: b.processId,
      date: b.date.toISOString().split('T')[0],
    }));

    const acks = rosterRecord.conflictAcks.map((a) => ({
      fingerprint: a.fingerprint,
      reason: a.reason,
      ackBy: a.ackBy,
    }));

    const validationResult = validateRoster(
      month,
      validationEntries,
      validationBackupDuties,
      snapshot,
      acks,
    );

    initialConflicts = validationResult.conflicts;

    rosterData = {
      id: rosterRecord.id,
      month: rosterRecord.month,
      version: rosterRecord.version,
      status: rosterRecord.status,
      profile: rosterRecord.profile,
      createdBy: rosterRecord.createdBy,
      createdAt: rosterRecord.createdAt.toISOString(),
      entries: rosterRecord.entries.map((e) => ({
        employeeId: e.employeeId,
        date: e.date.toISOString().split('T')[0],
        status: e.status,
        locked: e.locked,
        source: e.source,
        note: e.note,
      })),
      backupDuties: rosterRecord.backupDuties.map((b) => ({
        employeeId: b.employeeId,
        processId: b.processId,
        date: b.date.toISOString().split('T')[0],
      })),
      conflictAcks: rosterRecord.conflictAcks.map((a) => ({
        fingerprint: a.fingerprint,
        reason: a.reason,
        ackBy: a.ackBy,
      })),
    };
  }

  const versionsPayload = allVersions.map((v) => ({
    version: v.version,
    status: v.status,
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-[100rem] mx-auto px-2 sm:px-4 py-4">
      <RosterGrid
        month={month}
        initialRoster={rosterData}
        initialVersions={versionsPayload}
        initialConflicts={initialConflicts}
        snapshot={snapshot}
        userRole={role}
      />
    </div>
  );
}
