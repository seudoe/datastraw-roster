'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lock } from 'lucide-react';
import { validateCellChange } from '@/domain/validator/validateCellChange';
import type { RosterCellData } from './types';
import type { DomainSnapshot, DayStatus } from '@/domain/types';
import type { Conflict } from '@/domain/validator/types';

interface CellEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cell: RosterCellData | null;
  employeeName: string;
  employeeCode: string;
  allMonthDays: string[];
  allEntries: {
    employeeId: string;
    date: string;
    status: DayStatus;
    processId?: string | null;
  }[];
  snapshot: DomainSnapshot;
  onSave: (updatedCell: {
    employeeId: string;
    date: string;
    status: DayStatus;
    processId: string | null;
    locked: boolean;
  }) => Promise<void>;
}

export function CellEditorDialog({
  open,
  onOpenChange,
  cell,
  employeeName,
  employeeCode,
  allMonthDays,
  allEntries,
  snapshot,
  onSave,
}: CellEditorDialogProps) {
  const [status, setStatus] = useState<DayStatus>(cell?.status ?? 'WORK');
  const [processId, setProcessId] = useState<string | null>(cell?.processId ?? null);
  const [locked, setLocked] = useState<boolean>(cell?.locked ?? true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (cell) {
      setStatus(cell.status);
      setProcessId(cell.processId);
      setLocked(cell.locked ?? true);
    }
  }, [cell]);

  // Find qualified processes for this employee
  const employeeAssignments = useMemo(() => {
    if (!cell) return [];
    return snapshot.assignments.filter((a) => a.employeeId === cell.employeeId);
  }, [snapshot.assignments, cell]);

  const qualifiedProcesses = useMemo(() => {
    const procMap = new Map(snapshot.processes.map((p) => [p.id, p]));
    const brandMap = new Map(snapshot.brands.map((b) => [b.id, b]));

    return employeeAssignments.map((a) => {
      const proc = procMap.get(a.processId);
      const brand = proc ? brandMap.get(proc.brandId) : null;
      return {
        processId: a.processId,
        processName: proc?.name || 'Process',
        brandName: brand?.name || 'Brand',
        brandCode: brand?.code || 'BR',
        role: a.role,
      };
    });
  }, [employeeAssignments, snapshot.processes, snapshot.brands]);

  // Fast speculative validation on cell change preview (<1ms)
  const speculativeConflicts: Conflict[] = useMemo(() => {
    if (!open || !cell) return [];

    return validateCellChange(
      {
        employeeId: cell.employeeId,
        date: cell.date,
        newStatus: status,
        newProcessId: processId,
      },
      allEntries,
      allMonthDays,
      snapshot,
    );
  }, [open, cell, status, processId, allEntries, allMonthDays, snapshot]);

  if (!cell) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        employeeId: cell.employeeId,
        date: cell.date,
        status,
        processId: status === 'WORK' ? processId : null,
        locked,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-900">Edit Shift Cell</span>
            <Badge variant="outline" className="font-mono text-xs">
              {cell.date}
            </Badge>
          </DialogTitle>
          <div className="text-xs text-slate-500">
            {employeeName} ({employeeCode})
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Shift Status Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Duty Status
            </label>
            <Select
              value={status}
              onValueChange={(val) => {
                if (val) setStatus(val as DayStatus);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WORK">WORK (W) — Active Duty</SelectItem>
                <SelectItem value="WEEKLY_OFF">WEEKLY_OFF (O) — Scheduled Rest</SelectItem>
                <SelectItem value="HOLIDAY">HOLIDAY (H) — Declared Closure</SelectItem>
                <SelectItem value="LEAVE">LEAVE (L) — Approved Absence</SelectItem>
                <SelectItem value="COMP_OFF">COMP_OFF (C) — Compensatory Rest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Process Selector (if WORK) */}
          {status === 'WORK' && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Assigned Brand Process
              </label>
              {qualifiedProcesses.length === 0 ? (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  No explicit process assignment found. Assign a process in Setup.
                </div>
              ) : (
                <Select
                  value={processId || ''}
                  onValueChange={(val) => setProcessId(val || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operating process" />
                  </SelectTrigger>
                  <SelectContent>
                    {qualifiedProcesses.map((qp) => (
                      <SelectItem key={qp.processId} value={qp.processId}>
                        {qp.brandCode} · {qp.processName} ({qp.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Lock Cell Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/70">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-indigo-600" />
                Lock Cell
              </div>
              <div className="text-[11px] text-slate-500">
                Preserve this manual change against automated solver re-generations and ripple repairs.
              </div>
            </div>
            <Switch checked={locked} onCheckedChange={setLocked} />
          </div>

          {/* Live Conflict Warning Preview */}
          {speculativeConflicts.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/80 space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Live Validation Alert ({speculativeConflicts.length})
              </div>
              <div className="space-y-1">
                {speculativeConflicts.map((c, idx) => (
                  <div key={idx} className="text-[11px] text-amber-800 flex items-start gap-1">
                    <span className="font-semibold shrink-0">[{c.code}]:</span>
                    <span>{c.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {isSaving ? 'Saving...' : 'Apply Change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
