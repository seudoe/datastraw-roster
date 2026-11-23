'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { getWeekdayLetter, isWeekend } from '@/domain/dates';
import type { RosterCellData } from '../types';
import type { DomainSnapshot } from '@/domain/types';
import type { Conflict } from '@/domain/validator/types';

interface CompanyViewProps {
  days: string[];
  cellsByEmpAndDate: Map<string, RosterCellData>;
  snapshot: DomainSnapshot;
  conflicts: Conflict[];
  onCellClick: (cell: RosterCellData, empName: string, empCode: string) => void;
}

export function CompanyView({
  days,
  cellsByEmpAndDate,
  snapshot,
  conflicts,
  onCellClick,
}: CompanyViewProps) {
  // Index conflicts by employeeId and date
  const conflictsByEmpAndDate = useMemo(() => {
    const map = new Map<string, Conflict[]>();
    for (const c of conflicts) {
      if (c.employeeId) {
        const key = `${c.employeeId}:${c.date}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
      }
    }
    return map;
  }, [conflicts]);

  // Group employees by Pod
  const podGroups = useMemo(() => {
    const map = new Map<string, { podName: string; employees: typeof snapshot.employees }>();
    for (const pod of snapshot.pods) {
      map.set(pod.id, {
        podName: pod.name,
        employees: snapshot.employees.filter((e) => e.podId === pod.id && e.active),
      });
    }
    return Array.from(map.values());
  }, [snapshot.pods, snapshot.employees]);

  // Compute total working headcount per day
  const dailyWorkCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of days) counts.set(d, 0);

    for (const cell of cellsByEmpAndDate.values()) {
      if (cell.status === 'WORK') {
        counts.set(cell.date, (counts.get(cell.date) || 0) + 1);
      }
    }
    return counts;
  }, [days, cellsByEmpAndDate]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Header Row */}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <th className="p-3 font-semibold text-slate-700 min-w-48 sticky left-0 bg-slate-50 border-r border-slate-200 z-20">
                Employee &amp; Skills
              </th>
              {days.map((d) => {
                const dayNum = d.split('-')[2];
                const letter = getWeekdayLetter(d);
                const weekend = isWeekend(d);

                return (
                  <th
                    key={d}
                    className={`p-1.5 text-center font-medium min-w-9 border-r border-slate-100 ${
                      weekend ? 'bg-amber-50/60 text-amber-900 font-bold' : 'text-slate-600'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 font-mono">{letter}</div>
                    <div className="text-xs font-bold">{dayNum}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body grouped by Pod */}
          <tbody>
            {podGroups.map((group) => (
              <React.Fragment key={group.podName}>
                {/* Pod Subheader */}
                <tr className="bg-slate-100/70 border-b border-slate-200">
                  <td
                    colSpan={days.length + 1}
                    className="px-3 py-1.5 font-bold text-xs text-indigo-900 tracking-wide uppercase"
                  >
                    {group.podName} ({group.employees.length} Agents)
                  </td>
                </tr>

                {group.employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Employee Left Column */}
                    <td className="p-2.5 font-medium text-slate-900 sticky left-0 bg-white border-r border-slate-200 z-10 shadow-xs">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                        <span>{emp.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {emp.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {emp.skills.slice(0, 2).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-3.5 bg-slate-100 font-normal text-slate-600"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </td>

                    {/* Day Cells */}
                    {days.map((d) => {
                      const cell = cellsByEmpAndDate.get(`${emp.id}:${d}`);
                      const weekend = isWeekend(d);
                      const cellConflicts = conflictsByEmpAndDate.get(`${emp.id}:${d}`) || [];
                      const hasError = cellConflicts.some((c) => c.severity === 'ERROR');
                      const hasWarn = cellConflicts.some((c) => c.severity === 'WARN');

                      if (!cell) {
                        return (
                          <td
                            key={d}
                            className={`p-1 text-center border-r border-slate-100 ${
                              weekend ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            -
                          </td>
                        );
                      }

                      // Badge styles based on DayStatus
                      let statusBadge = (
                        <span className="inline-block w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] bg-slate-100 text-slate-600">
                          O
                        </span>
                      );

                      if (cell.status === 'WORK') {
                        statusBadge = (
                          <span
                            className={`inline-block w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] shadow-2xs ${
                              cell.role === 'BACKUP'
                                ? 'bg-purple-600 text-white'
                                : 'bg-indigo-600 text-white'
                            }`}
                          >
                            W
                          </span>
                        );
                      } else if (cell.status === 'HOLIDAY') {
                        statusBadge = (
                          <span className="inline-block w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                            H
                          </span>
                        );
                      } else if (cell.status === 'LEAVE') {
                        statusBadge = (
                          <span className="inline-block w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] bg-rose-100 text-rose-800 border border-rose-300">
                            L
                          </span>
                        );
                      } else if (cell.status === 'COMP_OFF') {
                        statusBadge = (
                          <span className="inline-block w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] bg-amber-100 text-amber-800 border border-amber-300">
                            C
                          </span>
                        );
                      }

                      return (
                        <td
                          key={d}
                          onClick={() => onCellClick(cell, emp.name, emp.code)}
                          className={`p-1 text-center border-r border-slate-100 cursor-pointer relative hover:ring-2 hover:ring-indigo-500 hover:z-10 ${
                            weekend ? 'bg-amber-50/20' : ''
                          } ${hasError ? 'bg-rose-50 ring-1 ring-rose-400' : hasWarn ? 'bg-amber-50 ring-1 ring-amber-300' : ''}`}
                        >
                          <div className="flex items-center justify-center relative">
                            {statusBadge}
                            {cell.locked && (
                              <Lock className="h-2 w-2 text-indigo-900 absolute -top-1 -right-1" />
                            )}
                            {hasError && (
                              <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-rose-600 ring-1 ring-white" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>

          {/* Footer: Daily Staffing Totals */}
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
              <td className="p-2.5 sticky left-0 bg-slate-100 border-r border-slate-200 z-10">
                Total Staff on Duty
              </td>
              {days.map((d) => {
                const count = dailyWorkCount.get(d) || 0;
                return (
                  <td key={d} className="p-1.5 text-center font-mono text-xs border-r border-slate-200">
                    {count}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
