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
  Zap,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Users,
  Calendar,
  Layers,
  Activity,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import type {
  ChangeSet,
  RemediationOption,
  RippleSimulationResult,
  SafeDateEvaluation,
} from '@/domain/ripple/types';
import type { DomainSnapshot } from '@/domain/types';

interface DemoScenario {
  id: string;
  name: string;
  changeSet: any;
}

interface RippleSimulatorProps {
  month: string;
  rosterId: string;
  rosterVersion: number;
  snapshot: DomainSnapshot;
  scenarios: DemoScenario[];
  userRole: 'OPS_MANAGER' | 'POD_LEAD' | 'VIEWER';
}

export function RippleSimulator({
  month,
  rosterId,
  rosterVersion,
  snapshot,
  scenarios,
  userRole,
}: RippleSimulatorProps) {
  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    snapshot.employees[0]?.id || '',
  );
  const [startDate, setStartDate] = useState<string>(`${month}-08`);
  const [endDate, setEndDate] = useState<string>(`${month}-08`);
  const [absenceType, setAbsenceType] = useState<'PLANNED_LEAVE' | 'SICK' | 'COMP_OFF'>('PLANNED_LEAVE');
  const [reason, setReason] = useState<string>('Personal emergency leave request');

  // Simulation & Safe Dates State
  const [safeDates, setSafeDates] = useState<SafeDateEvaluation[]>([]);
  const [isLoadingSafeDates, setIsLoadingSafeDates] = useState(false);
  const [simulationResult, setSimulationResult] = useState<RippleSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [isSolvingRepair, setIsSolvingRepair] = useState(false);

  // Active Employee lookup
  const selectedEmployee = snapshot.employees.find((e) => e.id === selectedEmpId);
  const podMap = new Map(snapshot.pods.map((p) => [p.id, p.name]));

  // Fetch Safe Dates Calendar when employee changes
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

  // Run Simulation
  const handleSimulate = async (customChangeSet?: ChangeSet) => {
    setIsSimulating(true);

    const changeSetToRun: ChangeSet = customChangeSet || {
      type: 'LEAVE_REQUEST',
      payload: {
        employeeId: selectedEmpId,
        startDate,
        endDate,
        absenceType,
        reason,
      },
    };

    try {
      const res = await fetch('/api/ripple/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          changeSet: changeSetToRun,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Simulation failed');
      }

      const data = await res.json();
      setSimulationResult(data.result);
      toast.success(
        `Simulation finished in ${data.result.simulationTimeMs}ms: ${data.result.safetyLevel} status`,
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSimulating(false);
    }
  };

  const searchParams = useSearchParams();

  // Run on initial load and respond to URL parameters
  useEffect(() => {
    const codeParam = searchParams.get('employeeCode');
    const idParam = searchParams.get('employeeId');
    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');
    const typeParam = searchParams.get('absenceType');

    let emp = null;
    if (codeParam) {
      emp = snapshot.employees.find((e) => e.code.toLowerCase() === codeParam.toLowerCase());
    } else if (idParam) {
      emp = snapshot.employees.find((e) => e.id === idParam);
    }

    if (emp) setSelectedEmpId(emp.id);
    if (startParam) setStartDate(startParam);
    if (endParam) setEndDate(endParam);
    if (typeParam && ['PLANNED_LEAVE', 'SICK', 'COMP_OFF'].includes(typeParam)) {
      setAbsenceType(typeParam as any);
    }

    if (emp || startParam || endParam) {
      const activeEmpId = emp ? emp.id : selectedEmpId;
      const activeStart = startParam || startDate;
      const activeEnd = endParam || endDate;
      const activeType = (typeParam as any) || absenceType;

      handleSimulate({
        type: 'LEAVE_REQUEST',
        payload: {
          employeeId: activeEmpId,
          startDate: activeStart,
          endDate: activeEnd,
          absenceType: activeType,
          reason: 'Guided demo scenario evaluation',
        },
      });
    } else if (selectedEmpId) {
      handleSimulate();
    }
  }, [searchParams]);

  // Quick load demo scenario
  const handleLoadScenario = (sc: DemoScenario) => {
    const cs = sc.changeSet as ChangeSet;
    if (cs.type === 'LEAVE_REQUEST') {
      const p = cs.payload as any;
      if (p.employeeId) setSelectedEmpId(p.employeeId);
      if (p.startDate) setStartDate(p.startDate);
      if (p.endDate) setEndDate(p.endDate);
      if (p.absenceType) setAbsenceType(p.absenceType);
      if (p.reason) setReason(p.reason);

      handleSimulate(cs);
      toast.info(`Loaded Scenario: ${sc.name}`);
    }
  };

  // Apply Quick-Fix
  const handleApplyFix = async (fix: RemediationOption) => {
    if (userRole === 'VIEWER') {
      toast.info('Read-only view mode. Ops Manager or Pod Lead role required to apply remediations.');
      return;
    }

    setIsApplyingFix(true);
    try {
      const res = await fetch('/api/ripple/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rosterId,
          changeSet: {
            type: 'LEAVE_REQUEST',
            payload: {
              employeeId: selectedEmpId,
              startDate,
              endDate,
              absenceType,
              reason,
            },
          },
          selectedFix: fix,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to apply remediation');
      }

      toast.success(`Quick-Fix Applied: ${fix.title}! Roster updated.`);
      // Re-run simulation to show clean zero-deficit state
      await handleSimulate();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsApplyingFix(false);
    }
  };

  // Trigger CP-SAT Solver Repair
  const handleSolverRepair = async () => {
    if (userRole === 'VIEWER') {
      toast.info('Read-only mode. Ops Manager role required.');
      return;
    }

    setIsSolvingRepair(true);
    try {
      const res = await fetch('/api/ripple/repair-solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          rosterId,
          changeSet: {
            type: 'LEAVE_REQUEST',
            payload: {
              employeeId: selectedEmpId,
              startDate,
              endDate,
              absenceType,
              reason,
            },
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Solver repair failed');
      }

      const data = await res.json();
      toast.success(
        `CP-SAT Repair Solved! New Version v${data.roster.version} generated with minimal shift disruption.`,
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSolvingRepair(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
                <Zap className="h-5 w-5 text-amber-300" />
              </span>
              <h1 className="text-xl font-bold tracking-tight">The Ripple Engine</h1>
              <Badge className="bg-amber-400/20 text-amber-200 border-amber-400/30 text-xs">
                Live Blast-Radius Simulation
              </Badge>
            </div>
            <p className="text-sm text-indigo-200 max-w-2xl leading-relaxed">
              When an employee asks for leave, who steps in? What shifts? Is it safe to approve?
              The Ripple Engine simulates operational blast radius in &lt;5ms and generates 4
              ranked remediation quick-fixes or triggers CP-SAT minimal-disruption repair.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/roster/${month}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur-sm transition-colors border border-white/10"
            >
              <Calendar className="h-4 w-4" />
              View Roster Grid ({month} v{rosterVersion})
            </Link>
          </div>
        </div>

        {/* Demo Scenarios Quick-Bar */}
        <div className="mt-5 pt-4 border-t border-indigo-700/50 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Assessment Demo Scenarios:
          </span>
          {scenarios.map((sc, i) => (
            <button
              key={sc.id}
              onClick={() => handleLoadScenario(sc)}
              className="text-xs px-2.5 py-1 rounded bg-indigo-700/60 hover:bg-indigo-600 text-indigo-100 font-medium border border-indigo-500/40 transition-colors flex items-center gap-1.5"
            >
              <span className="w-4 h-4 rounded-full bg-indigo-900 text-[10px] flex items-center justify-center font-bold text-amber-300">
                {i + 1}
              </span>
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Form Left, Safe Calendar & Results Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: ChangeSet Builder */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                Configure Change-Set
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select an employee and proposed absence dates to test coverage safety.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Team Member
                </label>
                <Select value={selectedEmpId} onValueChange={(val) => val && setSelectedEmpId(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {snapshot.employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.code}) — {podMap.get(emp.podId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEmployee && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>Pod: {podMap.get(selectedEmployee.podId)}</span>
                    <span>•</span>
                    <span>Skills: {selectedEmployee.skills.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Absence Type */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Absence Type
                </label>
                <Select
                  value={absenceType}
                  onValueChange={(val) => val && setAbsenceType(val as any)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED_LEAVE">Planned Leave (Annual/Vacation)</SelectItem>
                    <SelectItem value="SICK">Sick / Unplanned Absence</SelectItem>
                    <SelectItem value="COMP_OFF">Compensatory Off Redemption</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Justification / Operational Note
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Medical emergency, urgent travel"
                  className="text-xs"
                />
              </div>

              {/* Action Button */}
              <Button
                onClick={() => handleSimulate()}
                disabled={isSimulating}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium"
              >
                {isSimulating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Simulate Operational Ripple (&lt;5ms)
              </Button>
            </CardContent>
          </Card>

          {/* Safe-to-Approve Calendar Ribbon for Selected Employee */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Safe-to-Approve Calendar ({selectedEmployee?.code})</span>
                {isLoadingSafeDates && <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />}
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Green = safe (standby free) • Yellow = caution (cross-pod) • Red = unsafe (uncovered)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {safeDates.map((sd) => {
                  const dayNum = sd.date.split('-')[2];
                  const isSelected = sd.date >= startDate && sd.date <= endDate;

                  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (sd.safety === 'SAFE') {
                    bgClass = sd.isScheduledToWork
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200';
                  } else if (sd.safety === 'CAUTION') {
                    bgClass = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
                  } else if (sd.safety === 'UNSAFE') {
                    bgClass = 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 font-bold';
                  }

                  return (
                    <button
                      key={sd.date}
                      onClick={() => {
                        setStartDate(sd.date);
                        setEndDate(sd.date);
                      }}
                      title={`${sd.date}: ${sd.reason}`}
                      className={`h-7 rounded flex flex-col items-center justify-center text-[10px] border transition-all ${bgClass} ${
                        isSelected ? 'ring-2 ring-indigo-600 ring-offset-1 font-bold' : ''
                      }`}
                    >
                      <span>{parseInt(dayNum, 10)}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Simulation Results & Remediation */}
        <div className="lg:col-span-8 space-y-6">
          {simulationResult ? (
            <>
              {/* Overall Safety Banner */}
              <div
                className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
                  simulationResult.safetyLevel === 'SAFE'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : simulationResult.safetyLevel === 'CAUTION'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      simulationResult.safetyLevel === 'SAFE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : simulationResult.safetyLevel === 'CAUTION'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {simulationResult.safetyLevel === 'SAFE' ? (
                      <ShieldCheck className="h-6 w-6" />
                    ) : simulationResult.safetyLevel === 'CAUTION' ? (
                      <AlertTriangle className="h-6 w-6" />
                    ) : (
                      <ShieldAlert className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-lg">
                        {simulationResult.safetyLevel === 'SAFE'
                          ? 'SAFE TO APPROVE'
                          : simulationResult.safetyLevel === 'CAUTION'
                          ? 'PROCEED WITH CAUTION'
                          : 'UNSAFE TO APPROVE'}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-white font-mono text-xs border-current"
                      >
                        {simulationResult.simulationTimeMs}ms simulation
                      </Badge>
                    </div>
                    <div className="text-xs mt-1 max-w-xl opacity-90">
                      {simulationResult.safetyLevel === 'SAFE'
                        ? 'Qualified standby floaters are currently available on weekly off with zero operational friction.'
                        : simulationResult.safetyLevel === 'CAUTION'
                        ? 'Approval is possible but requires cross-pod borrowing or an overtime shift.'
                        : 'Approval will cause guaranteed unfilled coverage gaps on structurally uncoverable brand processes.'}
                    </div>
                  </div>
                </div>

                {/* Metric Delta Badge */}
                <div className="bg-white/80 rounded-lg p-3 border border-current text-xs space-y-1 min-w-44">
                  <div className="font-semibold text-slate-800">Blast Radius Impact:</div>
                  <div className="flex justify-between text-slate-600">
                    <span>Coverage Rate:</span>
                    <span className="font-mono font-bold">
                      {simulationResult.metricDelta.coverageRateBefore}% →{' '}
                      <span
                        className={
                          simulationResult.metricDelta.coverageRateAfter <
                          simulationResult.metricDelta.coverageRateBefore
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }
                      >
                        {simulationResult.metricDelta.coverageRateAfter}%
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Unfilled Gaps:</span>
                    <span className="font-mono font-bold">
                      {simulationResult.metricDelta.totalGapsBefore} →{' '}
                      <span
                        className={
                          simulationResult.metricDelta.totalGapsAfter >
                          simulationResult.metricDelta.totalGapsBefore
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }
                      >
                        {simulationResult.metricDelta.totalGapsAfter}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Gaps & Cascade Impact Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Direct Gaps */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-rose-500" />
                      Direct Coverage Gaps ({simulationResult.directImpacts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    {simulationResult.directImpacts.length === 0 ? (
                      <div className="text-slate-400 py-4 text-center">
                        Zero direct gaps: Employee was not rostered to work on these dates.
                      </div>
                    ) : (
                      simulationResult.directImpacts.map((d, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded bg-rose-50/70 border border-rose-200 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-rose-950 flex items-center gap-1.5">
                              <span className="font-mono font-bold">{d.date}:</span>
                              <span>{d.affectedBrandName} ({d.affectedBrandCode})</span>
                            </div>
                            <div className="text-[11px] text-rose-800">
                              Process: {d.affectedProcessName} • Priority: P{d.brandPriority}
                            </div>
                          </div>
                          <Badge className="bg-rose-600 text-white font-mono text-xs">
                            -{d.deficitCreated} Shift
                          </Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Cascade / Domino Impacts */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-amber-500" />
                      Upstream / Downstream Dominos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    {simulationResult.cascadeImpacts.length === 0 ? (
                      <div className="text-slate-400 py-4 text-center">
                        Zero domino impacts detected.
                      </div>
                    ) : (
                      simulationResult.cascadeImpacts.map((c, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded border text-xs ${
                            c.severity === 'ERROR'
                              ? 'bg-rose-50 border-rose-200 text-rose-900'
                              : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider mb-0.5">
                            <span>{c.date}</span>
                            <span>•</span>
                            <span className="text-indigo-600">{c.dominoType}</span>
                          </div>
                          <div>{c.description}</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Ranked Quick-Fix Remediation Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Ranked Remediation Quick-Fixes
                    </h2>
                    <p className="text-xs text-slate-500">
                      Evaluated options ordered by operational preference and minimal friction.
                    </p>
                  </div>

                  <Button
                    onClick={handleSolverRepair}
                    disabled={isSolvingRepair}
                    variant="outline"
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs gap-1.5"
                  >
                    {isSolvingRepair ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                    Run Deep CP-SAT Repair
                  </Button>
                </div>

                {simulationResult.remediationOptions.length === 0 ? (
                  <Card className="border-dashed border-slate-300 bg-slate-50/50">
                    <CardContent className="py-8 text-center text-xs text-slate-500">
                      No automated quick-fix available. The brand process has no qualified backup
                      staff configured.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {simulationResult.remediationOptions.map((fix) => {
                      return (
                        <Card
                          key={fix.id}
                          className={`transition-all border ${
                            fix.rank === 1
                              ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <CardHeader className="pb-2 pt-3 px-4">
                            <div className="flex items-center justify-between">
                              <Badge
                                className={
                                  fix.rank === 1
                                    ? 'bg-emerald-600 text-white font-bold text-[10px]'
                                    : 'bg-slate-700 text-white font-bold text-[10px]'
                                }
                              >
                                Rank #{fix.rank}: {fix.type.replace('_', ' ')}
                              </Badge>
                              <span className="font-mono text-xs font-semibold text-slate-500">
                                {fix.targetDate}
                              </span>
                            </div>
                            <CardTitle className="text-sm font-bold text-slate-900 mt-1">
                              {fix.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 space-y-3 text-xs">
                            <p className="text-slate-600 leading-relaxed">{fix.description}</p>

                            <div className="space-y-1 bg-white p-2.5 rounded border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                Trade-offs &amp; Operational Notes:
                              </span>
                              {fix.tradeoffs.map((t, idx) => (
                                <div
                                  key={idx}
                                  className="text-[11px] text-slate-700 flex items-start gap-1"
                                >
                                  <span className="text-slate-400">•</span>
                                  <span>{t}</span>
                                </div>
                              ))}
                            </div>

                            <Button
                              onClick={() => handleApplyFix(fix)}
                              disabled={isApplyingFix || !fix.isFeasible}
                              className={`w-full text-xs font-semibold gap-1.5 ${
                                fix.rank === 1
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {isApplyingFix ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              1-Click Apply This Remediation
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <Card className="border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
              <CardContent className="space-y-2">
                <Zap className="h-8 w-8 text-slate-400 mx-auto" />
                <div className="text-sm font-semibold text-slate-700">Ready to Simulate Ripple</div>
                <div className="text-xs text-slate-500 max-w-md mx-auto">
                  Click &quot;Simulate Operational Ripple&quot; or select any assessment demo scenario to view
                  live blast radius analysis.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
