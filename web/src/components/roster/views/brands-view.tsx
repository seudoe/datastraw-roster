'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { getWeekdayLetter, isWeekend } from '@/domain/dates';
import { resolveDemand } from '@/domain/demand';
import type { RosterCellData } from '../types';
import type { DomainSnapshot } from '@/domain/types';

interface BrandsViewProps {
  days: string[];
  cellsByEmpAndDate: Map<string, RosterCellData>;
  snapshot: DomainSnapshot;
}

export function BrandsView({ days, cellsByEmpAndDate, snapshot }: BrandsViewProps) {
  const activeBrands = useMemo(() => {
    return snapshot.brands.filter((b) => b.active);
  }, [snapshot.brands]);

  // Map processId -> brandId
  const procToBrand = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of snapshot.processes) {
      map.set(p.id, p.brandId);
    }
    return map;
  }, [snapshot.processes]);

  // Calculate actual workers per brand per day
  const brandActualWorkers = useMemo(() => {
    const map = new Map<string, number>(); // `${brandId}:${date}` -> count

    for (const cell of cellsByEmpAndDate.values()) {
      if (cell.status === 'WORK' && cell.processId) {
        const brandId = procToBrand.get(cell.processId);
        if (brandId) {
          const key = `${brandId}:${cell.date}`;
          map.set(key, (map.get(key) || 0) + 1);
        }
      }
    }
    return map;
  }, [cellsByEmpAndDate, procToBrand]);

  // Calculate required demand per brand per day
  const brandRequiredDemand = useMemo(() => {
    const map = new Map<string, number>(); // `${brandId}:${date}` -> required

    for (const brand of activeBrands) {
      const brandProcs = snapshot.processes.filter((p) => p.brandId === brand.id);
      for (const d of days) {
        let totalReq = 0;
        for (const proc of brandProcs) {
          totalReq += resolveDemand(proc, d, snapshot);
        }
        map.set(`${brand.id}:${d}`, totalReq);
      }
    }
    return map;
  }, [activeBrands, snapshot, days]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <th className="p-3 font-semibold text-slate-700 min-w-56 sticky left-0 bg-slate-50 border-r border-slate-200 z-20">
                D2C Client Brand &amp; SLA
              </th>
              {days.map((d) => {
                const dayNum = d.split('-')[2];
                const letter = getWeekdayLetter(d);
                const weekend = isWeekend(d);

                return (
                  <th
                    key={d}
                    className={`p-1.5 text-center font-medium min-w-10 border-r border-slate-100 ${
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
            {activeBrands.map((brand) => (
              <tr
                key={brand.id}
                className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
              >
                {/* Brand Name & Info */}
                <td className="p-2.5 font-medium text-slate-900 sticky left-0 bg-white border-r border-slate-200 z-10 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-indigo-700">
                      {brand.code}
                    </span>
                    <span className="font-semibold text-slate-900 truncate">{brand.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 h-3.5 font-medium ${
                        brand.priority === 3
                          ? 'border-rose-200 bg-rose-50 text-rose-700 font-bold'
                          : brand.priority === 2
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      Priority {brand.priority}
                    </Badge>
                    {brand.code === 'BR_03' || brand.code === 'BR_18' ? (
                      <Badge
                        variant="destructive"
                        className="text-[9px] px-1 py-0 h-3.5 bg-amber-600 text-white"
                      >
                        SPOF 365
                      </Badge>
                    ) : null}
                  </div>
                </td>

                {/* Daily Coverage Status Cells */}
                {days.map((d) => {
                  const required = brandRequiredDemand.get(`${brand.id}:${d}`) || 0;
                  const actual = brandActualWorkers.get(`${brand.id}:${d}`) || 0;
                  const weekend = isWeekend(d);

                  if (required === 0) {
                    return (
                      <td
                        key={d}
                        className={`p-1 text-center border-r border-slate-100 ${
                          weekend ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <span className="inline-block w-7 h-5 rounded text-[10px] text-slate-400 font-mono">
                          -
                        </span>
                      </td>
                    );
                  }

                  const isZeroCoverage = actual === 0;
                  const isUnderstaffed = actual < required && actual > 0;

                  return (
                    <td
                      key={d}
                      className={`p-1 text-center border-r border-slate-100 ${
                        weekend ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-mono font-bold shadow-2xs ${
                          isZeroCoverage
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : isUnderstaffed
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {actual}/{required}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
