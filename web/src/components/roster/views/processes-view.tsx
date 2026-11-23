'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { getWeekdayLetter, isWeekend } from '@/domain/dates';
import { resolveDemand } from '@/domain/demand';
import type { RosterCellData } from '../types';
import type { DomainSnapshot } from '@/domain/types';

interface ProcessesViewProps {
  days: string[];
  cellsByEmpAndDate: Map<string, RosterCellData>;
  snapshot: DomainSnapshot;
}

export function ProcessesView({ days, cellsByEmpAndDate, snapshot }: ProcessesViewProps) {
  const empById = useMemo(() => {
    return new Map(snapshot.employees.map((e) => [e.id, e]));
  }, [snapshot.employees]);

  const brandById = useMemo(() => {
    return new Map(snapshot.brands.map((b) => [b.id, b]));
  }, [snapshot.brands]);

  // Index assigned employees by processId and date: `${processId}:${date}` -> string[] (employee codes)
  const assignmentsByProcAndDate = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const cell of cellsByEmpAndDate.values()) {
      if (cell.status === 'WORK' && cell.processId) {
        const emp = empById.get(cell.employeeId);
        if (emp) {
          const key = `${cell.processId}:${cell.date}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(emp.code);
        }
      }
    }
    return map;
  }, [cellsByEmpAndDate, empById]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <th className="p-3 font-semibold text-slate-700 min-w-56 sticky left-0 bg-slate-50 border-r border-slate-200 z-20">
                Operating Process &amp; Brand
              </th>
              {days.map((d) => {
                const dayNum = d.split('-')[2];
                const letter = getWeekdayLetter(d);
                const weekend = isWeekend(d);

                return (
                  <th
                    key={d}
                    className={`p-1.5 text-center font-medium min-w-16 border-r border-slate-100 ${
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

          <tbody>
            {snapshot.processes.map((proc) => {
              const brand = brandById.get(proc.brandId);

              return (
                <tr
                  key={proc.id}
                  className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                >
                  <td className="p-2.5 font-medium text-slate-900 sticky left-0 bg-white border-r border-slate-200 z-10 shadow-xs">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{proc.name}</span>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                        {proc.type}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {brand?.name} ({brand?.code})
                    </div>
                  </td>

                  {days.map((d) => {
                    const required = resolveDemand(proc, d, snapshot);
                    const assignedEmpCodes = assignmentsByProcAndDate.get(`${proc.id}:${d}`) || [];
                    const weekend = isWeekend(d);

                    if (required === 0) {
                      return (
                        <td
                          key={d}
                          className={`p-1 text-center border-r border-slate-100 text-slate-300 font-mono text-[10px] ${
                            weekend ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          off
                        </td>
                      );
                    }

                    const isUnfilled = assignedEmpCodes.length === 0;

                    return (
                      <td
                        key={d}
                        className={`p-1 text-center border-r border-slate-100 ${
                          weekend ? 'bg-amber-50/20' : ''
                        } ${isUnfilled ? 'bg-rose-50/70' : ''}`}
                      >
                        {isUnfilled ? (
                          <span className="text-[10px] font-bold text-rose-600 font-mono">
                            GAP (0/{required})
                          </span>
                        ) : (
                          <div className="flex flex-col gap-0.5 items-center justify-center">
                            {assignedEmpCodes.map((code) => (
                              <span
                                key={code}
                                className="inline-block px-1 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-14"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
