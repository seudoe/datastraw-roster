'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Activity,
  History,
  GitCompare,
  Calendar as CalendarIcon,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { getDaysInMonth } from '@/domain/dates';
import { RosterToolbar } from './roster-toolbar';
import { CellEditorDialog } from './cell-editor-dialog';
import { ConflictSheet } from './conflict-sheet';
import { CompanyView } from './views/company-view';
import { PodsView } from './views/pods-view';
import { BrandsView } from './views/brands-view';
import { ProcessesView } from './views/processes-view';
import { EmployeesView } from './views/employees-view';

import type { RosterCellData, RosterViewMode } from './types';
import type { DomainSnapshot, DayStatus } from '@/domain/types';
import type { Conflict } from '@/domain/validator/types';

export interface RosterDataPayload {
  id: string;
  month: string;
  version: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'SUPERSEDED';
  profile: string;
  createdBy: string;
  createdAt: string;
  entries: {
    employeeId: string;
    date: string | Date;
    status: DayStatus;
    locked: boolean;
    source: string;
    note?: string | null;
  }[];
  backupDuties?: {
    employeeId: string;
    processId: string;
    date: string | Date;
  }[];
  conflictAcks?: {
    fingerprint: string;
    reason: string;
    ackBy: string;
  }[];
}

interface RosterGridProps {
  month: string;
  initialRoster: RosterDataPayload | null;
  initialVersions: { version: number; status: string; createdAt: string }[];
  initialConflicts: Conflict[];
  snapshot: DomainSnapshot;
  userRole: 'OPS_MANAGER' | 'POD_LEAD' | 'VIEWER';
}

export function RosterGrid({
  month,
  initialRoster,
  initialVersions,
  initialConflicts,
  snapshot,
  userRole,
}: RosterGridProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<RosterViewMode>('COMPANY');
  const [currentRoster, setCurrentRoster] = useState<RosterDataPayload | null>(initialRoster);
  const [conflicts, setConflicts] = useState<Conflict[]>(initialConflicts);
  const [conflictSheetOpen, setConflictSheetOpen] = useState(false);

  // Sync state when initial props update
  React.useEffect(() => {
    if (initialRoster) {
      setCurrentRoster(initialRoster);
    }
  }, [initialRoster]);

  React.useEffect(() => {
    setConflicts(initialConflicts);
  }, [initialConflicts]);

  // Month days array (YYYY-MM-DD)
  const days = useMemo(() => getDaysInMonth(month), [month]);

  // Cell editor dialog state
  const [editorState, setEditorState] = useState<{
    open: boolean;
    cell: RosterCellData | null;
    empName: string;
    empCode: string;
  }>({
    open: false,
    cell: null,
    empName: '',
    empCode: '',
  });

  // Calculate previous and next months for navigation
  const { prevMonth, nextMonth } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    const nextDate = new Date(Date.UTC(y, m, 1));
    return {
      prevMonth: prevDate.toISOString().slice(0, 7),
      nextMonth: nextDate.toISOString().slice(0, 7),
    };
  }, [month]);

  // Construct cellsByEmpAndDate map from current roster
  const cellsByEmpAndDate = useMemo(() => {
    const map = new Map<string, RosterCellData>();
    const procMap = new Map(snapshot.processes.map((p) => [p.id, p]));
    const brandMap = new Map(snapshot.brands.map((b) => [b.id, b]));

    // Backup duties lookup: `${employeeId}:${date}` -> processId
    const backupMap = new Map<string, string>();
    if (currentRoster?.backupDuties) {
      for (const b of currentRoster.backupDuties) {
        const dStr =
          typeof b.date === 'string'
            ? b.date.split('T')[0]
            : new Date(b.date).toISOString().split('T')[0];
        backupMap.set(`${b.employeeId}:${dStr}`, b.processId);
      }
    }

    // Conflict indexing by cell
    const conflictsByCell = new Map<string, Conflict[]>();
    for (const c of conflicts) {
      if (c.employeeId && c.date) {
        const key = `${c.employeeId}:${c.date}`;
        if (!conflictsByCell.has(key)) conflictsByCell.set(key, []);
        conflictsByCell.get(key)!.push(c);
      }
    }

    // Populate from actual roster entries
    if (currentRoster?.entries) {
      for (const entry of currentRoster.entries) {
        const dateStr =
          typeof entry.date === 'string'
            ? entry.date.split('T')[0]
            : new Date(entry.date).toISOString().split('T')[0];
        const key = `${entry.employeeId}:${dateStr}`;

        let procId: string | null = null;
        let role: 'PRIMARY' | 'BACKUP' | 'TEMPORARY' | null = null;

        if (entry.note?.startsWith('process:')) {
          procId = entry.note.replace('process:', '');
        }
        if (backupMap.has(key)) {
          procId = backupMap.get(key)!;
          role = 'BACKUP';
        } else if (procId) {
          role = 'PRIMARY';
        }

        const proc = procId ? procMap.get(procId) : null;
        const brand = proc ? brandMap.get(proc.brandId) : null;

        map.set(key, {
          employeeId: entry.employeeId,
          date: dateStr,
          status: entry.status,
          processId: procId,
          processName: proc?.name,
          brandCode: brand?.code,
          role,
          locked: entry.locked,
          source: entry.source || 'SOLVER',
          note: entry.note,
          conflicts: conflictsByCell.get(key),
        });
      }
    }

    // Fill any missing active employee days with default WEEKLY_OFF
    for (const emp of snapshot.employees) {
      if (!emp.active) continue;
      for (const day of days) {
        const key = `${emp.id}:${day}`;
        if (!map.has(key)) {
          map.set(key, {
            employeeId: emp.id,
            date: day,
            status: 'WEEKLY_OFF',
            processId: null,
            locked: false,
            source: 'DEFAULT',
            conflicts: conflictsByCell.get(key),
          });
        }
      }
    }

    return map;
  }, [currentRoster, snapshot, conflicts, days]);

  // Simplified array of entries for speculative validator
  const allEntriesFlat = useMemo(() => {
    return Array.from(cellsByEmpAndDate.values()).map((c) => ({
      employeeId: c.employeeId,
      date: c.date,
      status: c.status,
      processId: c.processId,
    }));
  }, [cellsByEmpAndDate]);

  // Handler for clicking a cell in interactive views
  const handleCellClick = (cell: RosterCellData, empName: string, empCode: string) => {
    if (userRole === 'VIEWER') {
      toast.info('Read-only view mode. Ops Manager or Pod Lead role required to edit.');
      return;
    }
    setEditorState({
      open: true,
      cell,
      empName,
      empCode,
    });
  };

  // Re-fetch conflicts from validator API
  const refreshValidation = async (rosterId: string) => {
    try {
      const res = await fetch(`/api/rosters/${rosterId}/validate`);
      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts || []);
      }
    } catch {
      // Non-blocking error
    }
  };

  // Handler for saving a cell edit
  const handleSaveCell = async (updated: {
    employeeId: string;
    date: string;
    status: DayStatus;
    processId: string | null;
    locked: boolean;
  }) => {
    if (!currentRoster) return;

    const res = await fetch(`/api/rosters/${currentRoster.id}/entries`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: [
          {
            employeeId: updated.employeeId,
            date: updated.date,
            status: updated.status,
            processId: updated.processId,
            locked: updated.locked,
            note: updated.processId ? `process:${updated.processId}` : null,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save cell edit');
    }

    // Update in-memory roster entries
    setCurrentRoster((prev) => {
      if (!prev) return null;
      const existingIdx = prev.entries.findIndex(
        (e) =>
          e.employeeId === updated.employeeId &&
          (typeof e.date === 'string'
            ? e.date.startsWith(updated.date)
            : new Date(e.date).toISOString().startsWith(updated.date)),
      );

      const updatedEntries = [...prev.entries];
      const newEntry = {
        employeeId: updated.employeeId,
        date: updated.date,
        status: updated.status,
        locked: updated.locked,
        source: 'MANUAL',
        note: updated.processId ? `process:${updated.processId}` : null,
      };

      if (existingIdx >= 0) {
        updatedEntries[existingIdx] = newEntry;
      } else {
        updatedEntries.push(newEntry);
      }

      return {
        ...prev,
        entries: updatedEntries,
      };
    });

    toast.success('Roster cell updated');
    await refreshValidation(currentRoster.id);
  };

  // Helper to format roster payload dates safely
  const formatRosterPayload = (rawRoster: any): RosterDataPayload => ({
    id: rawRoster.id,
    month: rawRoster.month,
    version: rawRoster.version,
    status: rawRoster.status,
    profile: rawRoster.profile,
    createdBy: rawRoster.createdBy,
    createdAt: typeof rawRoster.createdAt === 'string' ? rawRoster.createdAt : new Date(rawRoster.createdAt).toISOString(),
    entries: (rawRoster.entries || []).map((e: any) => ({
      employeeId: e.employeeId,
      date: typeof e.date === 'string' ? e.date.split('T')[0] : new Date(e.date).toISOString().split('T')[0],
      status: e.status,
      locked: e.locked,
      source: e.source,
      note: e.note,
    })),
    backupDuties: (rawRoster.backupDuties || []).map((b: any) => ({
      employeeId: b.employeeId,
      processId: b.processId,
      date: typeof b.date === 'string' ? b.date.split('T')[0] : new Date(b.date).toISOString().split('T')[0],
    })),
    conflictAcks: rawRoster.conflictAcks || [],
  });

  // Select a different version
  const handleSelectVersion = (version: number) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/rosters/${month}?version=${version}`);
        if (!res.ok) {
          toast.error(`Failed to load version ${version}`);
          return;
        }
        const data = await res.json();
        if (data.roster) {
          const formatted = formatRosterPayload(data.roster);
          setCurrentRoster(formatted);
          toast.info(`Switched to Roster Version ${version}`);
          if (formatted.id) {
            await refreshValidation(formatted.id);
          }
        }
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  };

  // Trigger CP-SAT Solver generation
  const handleRegenerate = async (profile: string) => {
    const res = await fetch('/api/rosters/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month,
        profile,
        publishImmediately: false,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Solver generation failed');
    }

    const data = await res.json();
    if (data.roster) {
      const formatted = formatRosterPayload(data.roster);
      setCurrentRoster(formatted);
      if (formatted.id) {
        await refreshValidation(formatted.id);
      }
    }
    router.refresh();
  };

  // Publish active roster version
  const handlePublish = async () => {
    if (!currentRoster) return;

    const res = await fetch(`/api/rosters/${currentRoster.id}/publish`, {
      method: 'POST',
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Publishing failed');
    }

    setCurrentRoster((prev) => (prev ? { ...prev, status: 'PUBLISHED' } : null));
    toast.success(`Roster v${currentRoster.version} published successfully!`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
            <Link
              href={`/roster/${prevMonth}`}
              className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
              title={`Go to ${prevMonth}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div className="px-3 py-1 font-semibold text-slate-900 text-sm flex items-center gap-2">
              {isPending ? (
                <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4 text-indigo-600" />
              )}
              {month}
            </div>
            <Link
              href={`/roster/${nextMonth}`}
              className="p-1.5 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
              title={`Go to ${nextMonth}`}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {currentRoster && (
            <Badge
              variant="outline"
              className={
                currentRoster.status === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                  : 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
              }
            >
              {currentRoster.status} (v{currentRoster.version})
            </Badge>
          )}
        </div>

        {/* Quick Nav Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Link
            href="/ripple"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors border border-indigo-200"
          >
            <Zap className="h-3.5 w-3.5 text-indigo-600" />
            Ripple Simulator
          </Link>
          <Link
            href="/resilience"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors border border-emerald-200"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            Resilience Analytics
          </Link>
          <Link
            href={`/roster/${month}/compare`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors border border-slate-200"
          >
            <GitCompare className="h-3.5 w-3.5 text-slate-600" />
            Compare
          </Link>
          <Link
            href={`/roster/${month}/versions`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors border border-slate-200"
          >
            <History className="h-3.5 w-3.5 text-slate-600" />
            Versions
          </Link>
        </div>
      </div>

      {/* Main Toolbar */}
      {currentRoster ? (
        <RosterToolbar
          month={month}
          rosterId={currentRoster.id}
          activeVersion={currentRoster.version}
          availableVersions={initialVersions}
          onSelectVersion={handleSelectVersion}
          status={currentRoster.status}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          conflicts={conflicts}
          onOpenConflictSheet={() => setConflictSheetOpen(true)}
          onRegenerate={handleRegenerate}
          onPublish={handlePublish}
          canEdit={userRole !== 'VIEWER'}
        />
      ) : (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-xl flex items-center justify-center gap-2 text-indigo-950">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              No Roster Generated for {month}
            </CardTitle>
            <CardDescription className="text-slate-600 max-w-xl mx-auto">
              Ready to generate a mathematically optimal roster for {snapshot.employees.length} team
              members across {snapshot.brands.length} brand processes using Google OR-Tools CP-SAT.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              onClick={() => handleRegenerate('BALANCED')}
              disabled={userRole === 'VIEWER'}
            >
              <Sparkles className="h-4 w-4" />
              Generate Baseline Roster (Balanced Profile)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Primary Roster Views Container */}
      {currentRoster && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          {viewMode === 'COMPANY' && (
            <CompanyView
              days={days}
              cellsByEmpAndDate={cellsByEmpAndDate}
              snapshot={snapshot}
              conflicts={conflicts}
              onCellClick={handleCellClick}
            />
          )}

          {viewMode === 'PODS' && (
            <PodsView
              days={days}
              cellsByEmpAndDate={cellsByEmpAndDate}
              snapshot={snapshot}
              conflicts={conflicts}
              onCellClick={handleCellClick}
            />
          )}

          {viewMode === 'BRANDS' && (
            <BrandsView
              days={days}
              cellsByEmpAndDate={cellsByEmpAndDate}
              snapshot={snapshot}
            />
          )}

          {viewMode === 'PROCESSES' && (
            <ProcessesView
              days={days}
              cellsByEmpAndDate={cellsByEmpAndDate}
              snapshot={snapshot}
            />
          )}

          {viewMode === 'EMPLOYEES' && (
            <EmployeesView
              days={days}
              cellsByEmpAndDate={cellsByEmpAndDate}
              snapshot={snapshot}
              onCellClick={handleCellClick}
            />
          )}
        </div>
      )}

      {/* Speculative Interactive Cell Editor */}
      <CellEditorDialog
        open={editorState.open}
        onOpenChange={(open) => setEditorState((prev) => ({ ...prev, open }))}
        cell={editorState.cell}
        employeeName={editorState.empName}
        employeeCode={editorState.empCode}
        allMonthDays={days}
        allEntries={allEntriesFlat}
        snapshot={snapshot}
        onSave={handleSaveCell}
      />

      {/* Operational Conflict & Acknowledgment Drawer */}
      {currentRoster && (
        <ConflictSheet
          open={conflictSheetOpen}
          onOpenChange={setConflictSheetOpen}
          rosterId={currentRoster.id}
          conflicts={conflicts}
          onAcknowledgeSuccess={() => refreshValidation(currentRoster.id)}
        />
      )}
    </div>
  );
}
