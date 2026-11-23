'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const [maxConsecutiveWorkDays, setMaxConsecutiveWorkDays] = useState('6');
  const [maxBackupBrandsPerDay, setMaxBackupBrandsPerDay] = useState('2');
  const [fiscalWeekStart, setFiscalWeekStart] = useState('1'); // 1 = Monday
  const [compOffValidityDays, setCompOffValidityDays] = useState('30');
  const [solverTimeLimitSec, setSolverTimeLimitSec] = useState('20');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) return {};
      return res.json();
    },
  });

  useEffect(() => {
    if (settings) {
      if (settings.maxConsecutiveWorkDays) setMaxConsecutiveWorkDays(String(settings.maxConsecutiveWorkDays));
      if (settings.maxBackupBrandsPerDay) setMaxBackupBrandsPerDay(String(settings.maxBackupBrandsPerDay));
      if (settings.fiscalWeekStart) setFiscalWeekStart(String(settings.fiscalWeekStart));
      if (settings.compOffValidityDays) setCompOffValidityDays(String(settings.compOffValidityDays));
      if (settings.solverTimeLimitSec) setSolverTimeLimitSec(String(settings.solverTimeLimitSec));
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      return data;
    },
    onSuccess: () => {
      toast.success('Global settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      maxConsecutiveWorkDays: Number(maxConsecutiveWorkDays),
      maxBackupBrandsPerDay: Number(maxBackupBrandsPerDay),
      fiscalWeekStart: Number(fiscalWeekStart),
      compOffValidityDays: Number(compOffValidityDays),
      solverTimeLimitSec: Number(solverTimeLimitSec),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-600" />
          Global Operational Rules &amp; Optimization Profiles
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure workforce rest constraints, backup limits, and optimization weights without code changes.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workforce Rest &amp; Floater Constraints</CardTitle>
            <CardDescription>
              Hard limits enforced by the CP-SAT solver and verified by the independent domain engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Maximum Consecutive Work Days
                </label>
                <Input
                  type="number"
                  min={1}
                  max={14}
                  value={maxConsecutiveWorkDays}
                  onChange={(e) => setMaxConsecutiveWorkDays(e.target.value)}
                  required
                />
                <span className="text-[11px] text-slate-500">
                  Default 6 days. Guarantees rolling rest window.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Max Active Backup Brands Per Day
                </label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={maxBackupBrandsPerDay}
                  onChange={(e) => setMaxBackupBrandsPerDay(e.target.value)}
                  required
                />
                <span className="text-[11px] text-slate-500">
                  Default 2 brands. Prevents floater burnout.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Comp-Off Validity Window (Days)
                </label>
                <Input
                  type="number"
                  min={7}
                  max={90}
                  value={compOffValidityDays}
                  onChange={(e) => setCompOffValidityDays(e.target.value)}
                  required
                />
                <span className="text-[11px] text-slate-500">
                  Default 30 days before earned comp-off credits expire.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Solver Execution Time Limit (Seconds)
                </label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={solverTimeLimitSec}
                  onChange={(e) => setSolverTimeLimitSec(e.target.value)}
                  required
                />
                <span className="text-[11px] text-slate-500">
                  Default 20 seconds. CP-SAT early-termination budget.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Solver Weight Profiles Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solver Optimization Profiles</CardTitle>
            <CardDescription>
              Objective weight profiles selected when generating or comparing rosters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/50">
                <div className="font-semibold text-xs text-indigo-900 flex items-center gap-1.5">
                  <Badge className="bg-indigo-600 text-white text-[10px]">BALANCED</Badge> (Default)
                </div>
                <p className="text-[11px] text-indigo-700 mt-1">
                  Strong coverage penalty, moderate weekly-off preservation, and preference scoring.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/50">
                <div className="font-semibold text-xs text-emerald-900 flex items-center gap-1.5">
                  <Badge className="bg-emerald-600 text-white text-[10px]">COVERAGE_FIRST</Badge>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Massive gap penalties ($500,000) prioritizing client SLA fulfillment above all preferences.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-sky-100 bg-sky-50/50">
                <div className="font-semibold text-xs text-sky-900 flex items-center gap-1.5">
                  <Badge className="bg-sky-600 text-white text-[10px]">FAIRNESS_FIRST</Badge>
                </div>
                <p className="text-[11px] text-sky-700 mt-1">
                  Minimizes weekend and holiday workload spread between employees across the same pod.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-purple-100 bg-purple-50/50">
                <div className="font-semibold text-xs text-purple-900 flex items-center gap-1.5">
                  <Badge className="bg-purple-600 text-white text-[10px]">PREFERENCE_FIRST</Badge>
                </div>
                <p className="text-[11px] text-purple-700 mt-1">
                  Elevates weekly-off preferred weekday compliance while maintaining hard rest guarantees.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Saving Settings...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
