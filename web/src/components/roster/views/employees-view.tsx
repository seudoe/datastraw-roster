'use client';

import React, { useMemo } from 'react';
import { getWeekdayLetter, isWeekend } from '@/domain/dates';
import type { RosterCellData } from '../types';
import type { DomainSnapshot } from '@/domain/types';

interface EmployeesViewProps {
  days: string[];
  cellsByEmpAndDate: Map<string, RosterCellData>;
  snapshot: DomainSnapshot;
  onCellClick: (cell: RosterCellData, empName: string, empCode: string) => void;
}

export function EmployeesView({
  days,
  cellsByEmpAndDate,
  snapshot,
  onCellClick,
}: EmployeesViewProps) {
  const activeEmployees = useMemo(() => {
    return snapshot.employees.filter((e) => e.active);
  }, [snapshot.employees]);

  const podMap = useMemo(() => {
    return new Map(snapshot.pods.map((p) => [p.id, p.name]));
  }, [snapshot.pods]);

  // Compute individual statistics per employee
  const employeeMetrics = useMemo(() => {
    const map = new Map<
      string,
      { workDays: number; offDays: number; longestRun: number; weekendShifts: number }
    >();

    for (const emp of activeEmployees) {
      let workDays = 0;
      let offDays = 0;
      let longestRun = 0;
      let currentRun = 0;
      let weekendShifts = 0;

      for (const d of days) {
        const cell = cellsByEmpAndDate.get(`${emp.id}:${d}`);
        if (cell?.status === 'WORK') {
          workDays++;
          currentRun++;
          if (currentRun > longestRun) longestRun = currentRun;
          if (isWeekend(d)) weekendShifts++;
        } else {
          currentRun = 0;
          if (cell?.status === 'WEEKLY_OFF') offDays++;
        }
      }

      map.set(emp.id, { workDays, offDays, longestRun, weekendShifts });
    }
    return map;
  }, [activeEmployees, days, cellsByEmpAndDate]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <th className="p-3 font-semibold text-slate-700 min-w-44 sticky left-0 bg-slate-50 border-r border-slate-200 z-20">
                Employee Agent
              </th>
              <th className="p-2 font-semibold text-slate-700 text-center min-w-16 border-r border-slate-200">
                Work Days
              </th>
              <th className="p-2 font-semibold text-slate-700 text-center min-w-16 border-r border-slate-200">
                Off Days
              </th>
              <th className="p-2 font-semibold text-slate-700 text-center min-w-16 border-r border-slate-200">
                Max Run
              </th>
              <th className="p-2 font-semibold text-slate-700 text-center min-w-16 border-r border-slate-200">
                Weekend Shifts
              </th>
              {days.map((d) => {
                const dayNum = d.split('-')[2];
                const letter = getWeekdayLetter(d);
                const weekend = isWeekend(d);

                return (
                  <th
                    key={d}
                    className={`p-1 text-center font-medium min-w-8 border-r border-slate-100 ${
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
            {activeEmployees.map((emp) => {
              const stats = employeeMetrics.get(emp.id) || {
                workDays: 0,
                offDays: 0,
                longestRun: 0,
                weekendShifts: 0,
              };

              return (
                <tr
                  key={emp.id}
                  className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                >
                  {/* Name column */}
                  <td className="p-2.5 font-medium text-slate-900 sticky left-0 bg-white border-r border-slate-200 z-10 shadow-xs">
                    <div className="font-semibold text-slate-900">{emp.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] text-slate-500">{emp.code}</span>
                      <span className="text-[10px] text-slate-400">·</span>
                      <span className="text-[10px] text-indigo-600 font-medium">
                        {podMap.get(emp.podId)}
                      </span>
                    </div>
                  </td>

                  {/* Summary Metric Columns */}
                  <td className="p-2 text-center font-mono font-bold text-slate-900 border-r border-slate-100">
                    {stats.workDays}
                  </td>
                  <td className="p-2 text-center font-mono font-medium text-slate-600 border-r border-slate-100">
                    {stats.offDays}
                  </td>
                  <td
                    className={`p-2 text-center font-mono font-bold border-r border-slate-100 ${
                      stats.longestRun > (emp.maxConsecutiveWorkDays ?? 6)
                        ? 'text-rose-600 bg-rose-50'
                        : 'text-slate-700'
                    }`}
                  >
                    {stats.longestRun}d
                  </td>
                  <td className="p-2 text-center font-mono text-slate-700 border-r border-slate-100">
                    {stats.weekendShifts}
                  </td>

                  {/* Daily Badges */}
                  {days.map((d) => {
                    const cell = cellsByEmpAndDate.get(`${emp.id}:${d}`);
                    const weekend = isWeekend(d);

                    if (!cell) {
                      return (
                        <td
                          key={d}
                          className={`p-1 text-center border-r border-slate-100 ${
                            weekend ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          -
                        </td>
                      );
                    }

                    return (
                      <td
                        key={d}
                        onClick={() => onCellClick(cell, emp.name, emp.code)}
                        className={`p-1 text-center border-r border-slate-100 cursor-pointer hover:bg-indigo-50/70 ${
                          weekend ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <span
                          title={cell.status === 'WEEKLY_OFF' ? 'Weekly Off / Rest Day' : cell.status}
                          className={`inline-block ${cell.status === 'WEEKLY_OFF' ? 'px-1 h-5' : 'w-5 h-5'} rounded text-[9px] font-bold flex items-center justify-center ${
                            cell.status === 'WORK'
                              ? 'bg-indigo-600 text-white'
                              : cell.status === 'HOLIDAY'
                              ? 'bg-emerald-100 text-emerald-800'
                              : cell.status === 'LEAVE'
                              ? 'bg-rose-100 text-rose-800'
                              : cell.status === 'COMP_OFF'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {cell.status === 'WORK' ? 'W' : cell.status === 'WEEKLY_OFF' ? 'OFF' : cell.status[0]}
                        </span>
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
