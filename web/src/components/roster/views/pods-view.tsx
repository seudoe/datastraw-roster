'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Shield } from 'lucide-react';
import { CompanyView } from './company-view';
import type { RosterCellData } from '../types';
import type { DomainSnapshot } from '@/domain/types';
import type { Conflict } from '@/domain/validator/types';

interface PodsViewProps {
  days: string[];
  cellsByEmpAndDate: Map<string, RosterCellData>;
  snapshot: DomainSnapshot;
  conflicts: Conflict[];
  onCellClick: (cell: RosterCellData, empName: string, empCode: string) => void;
}

export function PodsView({
  days,
  cellsByEmpAndDate,
  snapshot,
  conflicts,
  onCellClick,
}: PodsViewProps) {
  const [selectedPodId, setSelectedPodId] = useState<string>(snapshot.pods[0]?.id || '');

  const activePod = useMemo(() => {
    return snapshot.pods.find((p) => p.id === selectedPodId) || snapshot.pods[0];
  }, [snapshot.pods, selectedPodId]);

  const podLead = useMemo(() => {
    if (!activePod?.leadId) return null;
    return snapshot.employees.find((e) => e.id === activePod.leadId);
  }, [activePod, snapshot.employees]);

  const podEmployees = useMemo(() => {
    return snapshot.employees.filter((e) => e.podId === activePod?.id && e.active);
  }, [activePod, snapshot.employees]);

  // Compute scoped pod snapshot for the CompanyView rendering
  const scopedSnapshot = useMemo(() => {
    return {
      ...snapshot,
      pods: activePod ? [activePod] : [],
      employees: podEmployees,
    };
  }, [snapshot, activePod, podEmployees]);

  // Compute pod statistics
  const podStats = useMemo(() => {
    let totalWorkDays = 0;
    let totalOffDays = 0;
    let backupShifts = 0;

    for (const emp of podEmployees) {
      for (const d of days) {
        const cell = cellsByEmpAndDate.get(`${emp.id}:${d}`);
        if (cell?.status === 'WORK') {
          totalWorkDays++;
          if (cell.role === 'BACKUP') backupShifts++;
        } else if (cell?.status === 'WEEKLY_OFF') {
          totalOffDays++;
        }
      }
    }

    const podConflicts = conflicts.filter((c) =>
      podEmployees.some((e) => e.id === c.employeeId),
    );

    return {
      totalWorkDays,
      totalOffDays,
      backupShifts,
      conflictCount: podConflicts.length,
      errorCount: podConflicts.filter((c) => c.severity === 'ERROR').length,
    };
  }, [podEmployees, days, cellsByEmpAndDate, conflicts]);

  return (
    <div className="space-y-4">
      {/* Pod Selection Header Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          {snapshot.pods.map((pod) => (
            <Button
              key={pod.id}
              variant={selectedPodId === pod.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPodId(pod.id)}
              className={
                selectedPodId === pod.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 hover:text-indigo-600'
              }
            >
              <Building2 className="h-3.5 w-3.5 mr-1" />
              {pod.name}
            </Button>
          ))}
        </div>

        {/* Pod Lead Badge */}
        {podLead && (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Shield className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-slate-500">Pod Lead:</span>
            <span className="font-semibold text-slate-900">{podLead.name}</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {podLead.code}
            </Badge>
          </div>
        )}
      </div>

      {/* Pod Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 bg-white">
          <div className="text-[11px] font-medium text-slate-500">Staff Count</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">
            {podEmployees.length} Agents
          </div>
        </Card>
        <Card className="p-3 bg-white">
          <div className="text-[11px] font-medium text-slate-500">Total Work Days</div>
          <div className="text-xl font-bold text-indigo-700 mt-0.5">
            {podStats.totalWorkDays} Shifts
          </div>
        </Card>
        <Card className="p-3 bg-white">
          <div className="text-[11px] font-medium text-slate-500">Backup Shifts Supported</div>
          <div className="text-xl font-bold text-purple-700 mt-0.5">
            {podStats.backupShifts} Duties
          </div>
        </Card>
        <Card className="p-3 bg-white">
          <div className="text-[11px] font-medium text-slate-500">Pod Active Conflicts</div>
          <div
            className={`text-xl font-bold mt-0.5 ${
              podStats.errorCount > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {podStats.conflictCount} Issues
          </div>
        </Card>
      </div>

      {/* Pod Grid */}
      <CompanyView
        days={days}
        cellsByEmpAndDate={cellsByEmpAndDate}
        snapshot={scopedSnapshot}
        conflicts={conflicts}
        onCellClick={onCellClick}
      />
    </div>
  );
}
