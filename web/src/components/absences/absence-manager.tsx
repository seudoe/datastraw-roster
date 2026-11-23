'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Search,
  Plus,
  User,
  Building2,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SafeDateEvaluation } from '@/domain/ripple/types';

interface AbsenceItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  podName: string;
  podId?: string | null;
  type: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
  createdAt: string;
}

interface EmployeeOption {
  id: string;
  code: string;
  name: string;
  podName: string;
}

interface AbsenceManagerProps {
  initialAbsences: AbsenceItem[];
  employees: EmployeeOption[];
  month: string;
  userRole: 'OPS_MANAGER' | 'POD_LEAD' | 'VIEWER';
}

export function AbsenceManager({
  initialAbsences,
  employees,
  month,
  userRole,
}: AbsenceManagerProps) {
  const searchParams = useSearchParams();

  const [absences, setAbsences] = useState<AbsenceItem[]>(initialAbsences);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected employee for Safe Dates inspection
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    employees[0]?.id || '',
  );
  const [safeDates, setSafeDates] = useState<SafeDateEvaluation[]>([]);
  const [isLoadingSafeDates, setIsLoadingSafeDates] = useState(false);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  // Parse query param on boot
  useEffect(() => {
    const codeParam = searchParams.get('employeeCode');
    const idParam = searchParams.get('employeeId');

    if (codeParam) {
      const match = employees.find((e) => e.code.toLowerCase() === codeParam.toLowerCase());
      if (match) setSelectedEmpId(match.id);
    } else if (idParam) {
      const match = employees.find((e) => e.id === idParam);
      if (match) setSelectedEmpId(match.id);
    }
  }, [searchParams, employees]);

  // Fetch Safe Dates whenever selectedEmpId changes
  useEffect(() => {
    if (!selectedEmpId) return;
    let cancelled = false;
    setIsLoadingSafeDates(true);

    fetch(`/api/absences/safe-dates?employeeId=${selectedEmpId}&month=${month}`)
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed to fetch safe dates')))
      .then((data) => {
        if (!cancelled) {
          setSafeDates(data.safeDates || []);
          setIsLoadingSafeDates(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoadingSafeDates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEmpId, month]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);

  // Status update (Approve / Reject)
  const handleUpdateStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setIsUpdatingId(id);
    try {
      const res = await fetch(`/api/absences/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }

      setAbsences((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
      );
      toast.success(`Absence request marked as ${newStatus}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Filtered list
  const filteredAbsences = absences.filter((a) => {
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchesQuery =
      !searchQuery ||
      a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.podName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Clock className="h-8 w-8 text-indigo-600" />
            Absence &amp; Leave Intelligence
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Safe-to-approve pre-check calendars, leave requests, and Ripple blast-radius testing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/ripple"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            <Zap className="h-4 w-4" /> Open Ripple Simulator
          </Link>
        </div>
      </div>

      {/* 1. Safe-to-Approve Visual Calendar Panel */}
      <Card className="border-indigo-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Pre-Approval Leave Feasibility
              </div>
              <CardTitle className="text-xl text-white mt-1">
                Safe-to-Approve Heat Calendar ({month})
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs mt-0.5">
                Evaluates coverage blast radius for every day of the month before an ops manager commits approval.
              </CardDescription>
            </div>

            {/* Employee Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Select Agent:</span>
              <Select value={selectedEmpId} onValueChange={(v) => v && setSelectedEmpId(v)}>
                <SelectTrigger className="w-56 h-9 bg-white/10 text-white border-white/20 font-semibold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.code} — {e.name} ({e.podName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoadingSafeDates ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
              <span>Simulating month-wide blast radius...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Legend & Summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-3 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-700">Agent: {selectedEmployee?.name} ({selectedEmployee?.code})</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">Pod: {selectedEmployee?.podName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Safe (Zero Gaps)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-amber-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Caution (Backup needed)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-red-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Unsafe (Sole Resource / SPOF)
                  </span>
                </div>
              </div>

              {/* 31-day visual calendar grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {safeDates.map((d) => {
                  const dayNum = d.date.split('-')[2];
                  const weekdayName = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });

                  let cardBg = 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100';
                  let badgeBg = 'bg-emerald-200/80 text-emerald-800';

                  if (d.safety === 'UNSAFE') {
                    cardBg = 'bg-red-50/80 border-red-200 text-red-950 hover:bg-red-100';
                    badgeBg = 'bg-red-200 text-red-800 font-bold';
                  } else if (d.safety === 'CAUTION') {
                    cardBg = 'bg-amber-50/80 border-amber-200 text-amber-950 hover:bg-amber-100';
                    badgeBg = 'bg-amber-200 text-amber-800';
                  }

                  return (
                    <Link
                      key={d.date}
                      href={`/ripple?employeeId=${selectedEmpId}&startDate=${d.date}&endDate=${d.date}`}
                      title={`${d.date} (${weekdayName}): ${d.safety}\n${d.reason}\nClick to simulate in Ripple`}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between min-h-[92px] ${cardBg}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm">{dayNum}</span>
                        <span className="text-[10px] uppercase font-semibold opacity-75">{weekdayName}</span>
                      </div>
                      <div className="mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md block text-center truncate ${badgeBg}`}>
                          {d.safety}
                        </span>
                      </div>
                      <div className="text-[10px] truncate opacity-70 mt-1" title={d.reason}>
                        {!d.isScheduledToWork ? 'Scheduled Off' : d.brandCode ? `${d.brandCode}` : 'Shift'}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Absence Requests Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Operational Absence Register
            </CardTitle>
            <CardDescription className="text-xs">
              All planned leaves, sick occurrences, and comp-off redemptions.
            </CardDescription>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search employee or pod..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
              <SelectTrigger className="w-32 h-9 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="PENDING" className="text-xs">Pending</SelectItem>
                <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
                <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Pod</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAbsences.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No matching absence requests found.
                    </td>
                  </tr>
                ) : (
                  filteredAbsences.map((abs) => {
                    const isPending = abs.status === 'PENDING';
                    const isApproved = abs.status === 'APPROVED';

                    return (
                      <tr key={abs.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{abs.employeeName}</div>
                          <div className="text-[11px] font-mono text-slate-500">{abs.employeeCode}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 text-slate-700">
                            {abs.podName}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[10px] font-semibold ${
                              abs.type === 'SICK'
                                ? 'bg-red-100 text-red-800'
                                : abs.type === 'COMP_OFF'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {abs.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {abs.startDate} → {abs.endDate}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={abs.reason || ''}>
                          {abs.reason || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            className={`text-[10px] font-bold ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : abs.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            {abs.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Test in Ripple */}
                            <Link
                              href={`/ripple?employeeId=${abs.employeeId}&startDate=${abs.startDate}&endDate=${abs.endDate}&absenceType=${abs.type}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold text-[11px] transition-colors"
                              title="Simulate blast radius in Ripple Engine"
                            >
                              <Zap className="h-3 w-3 text-amber-600" /> Simulate
                            </Link>

                            {/* Approve / Reject actions for Ops Manager */}
                            {userRole !== 'VIEWER' && isPending && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdatingId === abs.id}
                                  onClick={() => handleUpdateStatus(abs.id, 'APPROVED')}
                                  className="h-7 px-2 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[11px]"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isUpdatingId === abs.id}
                                  onClick={() => handleUpdateStatus(abs.id, 'REJECTED')}
                                  className="h-7 px-2 text-rose-700 hover:bg-rose-50 border-rose-200 text-[11px]"
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
