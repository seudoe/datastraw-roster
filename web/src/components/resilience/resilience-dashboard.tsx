'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  AlertTriangle,
  Activity,
  Zap,
  RefreshCw,
  Search,
  Flame,
} from 'lucide-react';
import type { FullResilienceReport } from '@/domain/resilience/types';

interface ResilienceDashboardProps {
  initialReport: FullResilienceReport;
}

export function ResilienceDashboard({ initialReport }: ResilienceDashboardProps) {
  const [report, setReport] = useState<FullResilienceReport>(initialReport);
  const [activeTab, setActiveTab] = useState<'HEATMAP' | 'CRITICALITY' | 'STRESS_TEST'>('HEATMAP');
  const [brandFilter, setBrandFilter] = useState<'ALL' | 'CRITICAL' | 'FRAGILE' | 'HEALTHY'>('ALL');
  const [brandSearch, setBrandSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { overview, brands, employees, stressTest } = report;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/analysis/resilience');
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredBrands = brands.filter((b) => {
    if (brandFilter !== 'ALL' && b.riskLevel !== brandFilter) return false;
    if (brandSearch) {
      const query = brandSearch.toLowerCase();
      return (
        b.brandCode.toLowerCase().includes(query) ||
        b.brandName.toLowerCase().includes(query) ||
        b.primaryStaff.some((s) => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const filteredEmployees = employees.filter((e) => {
    if (empSearch) {
      const query = empSearch.toLowerCase();
      return (
        e.employeeName.toLowerCase().includes(query) ||
        e.employeeCode.toLowerCase().includes(query) ||
        e.podName.toLowerCase().includes(query) ||
        e.solePrimaryFor.some((b) => b.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </span>
              <h1 className="text-xl font-bold tracking-tight">System Resilience &amp; SPOF Analytics</h1>
              <Badge className="bg-emerald-400/20 text-emerald-200 border-emerald-400/30 text-xs font-semibold">
                Bus Factor &amp; Vulnerability Matrix
              </Badge>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time operational fragility monitoring across {overview.totalBrands} brands and{' '}
              {overview.totalEmployees} employees. Identifies single points of failure, keystone
              floaters, and pairwise absence shock absorption.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Re-Calculate Analytics
            </Button>
            <Link
              href="/ripple"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              <Zap className="h-4 w-4" />
              Test in Ripple Engine
            </Link>
          </div>
        </div>

        {/* Highlight Alert for Structural Uncoverables */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>
              <strong>Structural Alert:</strong> Brands BR_03 and BR_18 operate on 365-day schedules
              with Bus Factor = 1 and 0 backups.
            </span>
          </div>
          <Link
            href="/setup/brands"
            className="text-indigo-300 hover:text-white underline text-[11px]"
          >
            Manage brand cross-training →
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Resilience Score */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500">
              System Resilience Index
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center justify-between">
              <span>{overview.overallScore}/100</span>
              <Badge
                className={
                  overview.healthStatus === 'ROBUST'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : overview.healthStatus === 'STABLE'
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    : overview.healthStatus === 'VULNERABLE'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }
              >
                {overview.healthStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  overview.overallScore >= 75
                    ? 'bg-emerald-500'
                    : overview.overallScore >= 55
                    ? 'bg-indigo-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${overview.overallScore}%` }}
              />
            </div>
            Weighted composite of coverage buffer, bus factors, and shock survival.
          </CardContent>
        </Card>

        {/* SPOF Brands */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500">
              Single Points of Failure (SPOF)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-rose-600 flex items-center justify-between">
              <span>{overview.spofBrandsCount} Brands</span>
              <Flame className="h-5 w-5 text-rose-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Brands with Bus Factor = 1. A single sick day or leave directly causes an unfilled shift.
          </CardContent>
        </Card>

        {/* Fragile Brands */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500">
              Fragile Brands (Bus Factor = 2)
            </CardDescription>
            <CardTitle className="text-2xl font-black text-amber-600 flex items-center justify-between">
              <span>{overview.fragileBrandsCount} Brands</span>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Only 1 qualified backup agent. Highly susceptible to simultaneous absence collisions.
          </CardContent>
        </Card>

        {/* Floater Slack Buffer */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium text-slate-500">
              Cross-Trained Floaters
            </CardDescription>
            <CardTitle className="text-2xl font-black text-indigo-600 flex items-center justify-between">
              <span>{overview.floaterCount} Floaters</span>
              <Badge variant="outline" className="text-xs font-mono font-semibold">
                {overview.floaterSlackRatio}% of team
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Agents qualified on $\ge$3 brands providing rapid cross-pod absence absorption.
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('HEATMAP')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'HEATMAP'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Brand SPOF Heatmap &amp; Matrix ({brands.length})
        </button>
        <button
          onClick={() => setActiveTab('CRITICALITY')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'CRITICALITY'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Employee Criticality Index ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('STRESS_TEST')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'STRESS_TEST'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Shock Outage Simulator ({stressTest.survivalRate}% Survival)
        </button>
      </div>

      {/* TAB 1: Brand SPOF Heatmap & Matrix */}
      {activeTab === 'HEATMAP' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1">Filter by Risk:</span>
              <button
                onClick={() => setBrandFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-medium border ${
                  brandFilter === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({brands.length})
              </button>
              <button
                onClick={() => setBrandFilter('CRITICAL')}
                className={`px-2.5 py-1 rounded text-xs font-medium border ${
                  brandFilter === 'CRITICAL'
                    ? 'bg-rose-600 text-white border-rose-600 font-bold'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
              >
                Critical SPOF ({overview.spofBrandsCount})
              </button>
              <button
                onClick={() => setBrandFilter('FRAGILE')}
                className={`px-2.5 py-1 rounded text-xs font-medium border ${
                  brandFilter === 'FRAGILE'
                    ? 'bg-amber-600 text-white border-amber-600 font-bold'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                Fragile Buffer ({overview.fragileBrandsCount})
              </button>
              <button
                onClick={() => setBrandFilter('HEALTHY')}
                className={`px-2.5 py-1 rounded text-xs font-medium border ${
                  brandFilter === 'HEALTHY'
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Healthy Buffer ({overview.healthyBrandsCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search brand or staff..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          {/* Brands Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBrands.map((brand) => (
              <Card
                key={brand.brandId}
                className={`border transition-all ${
                  brand.riskLevel === 'CRITICAL'
                    ? 'border-rose-300 bg-rose-50/20 shadow-xs'
                    : brand.riskLevel === 'FRAGILE'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {brand.brandCode}
                    </span>
                    <Badge
                      className={
                        brand.riskLevel === 'CRITICAL'
                          ? 'bg-rose-600 text-white font-bold text-[10px]'
                          : brand.riskLevel === 'FRAGILE'
                          ? 'bg-amber-600 text-white font-bold text-[10px]'
                          : 'bg-emerald-600 text-white font-bold text-[10px]'
                      }
                    >
                      Bus Factor: {brand.busFactor}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-1">
                    {brand.brandName}
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{brand.calendarName}</span>
                    <span>•</span>
                    <span>Priority P{brand.priority}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-4 pb-4 space-y-3 text-xs">
                  {/* Primary Staff */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Primary Assigned Staff ({brand.primaryStaff.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {brand.primaryStaff.map((p) => (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-medium"
                          title={`${p.name} (${p.podName})`}
                        >
                          {p.name} ({p.code})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Backup Staff */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Qualified Backups ({brand.backupStaff.length}):
                    </span>
                    {brand.backupStaff.length === 0 ? (
                      <span className="text-[11px] font-bold text-rose-600 block">
                        Zero backups configured!
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {brand.backupStaff.map((b) => (
                          <span
                            key={b.id}
                            className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]"
                            title={`${b.name} (${b.podName})`}
                          >
                            {b.name} ({b.code})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Operational Recommendation Box */}
                  <div
                    className={`p-2.5 rounded text-[11px] border leading-relaxed ${
                      brand.isStructurallyUncoverable
                        ? 'bg-rose-100 text-rose-950 border-rose-300 font-medium'
                        : brand.riskLevel === 'CRITICAL'
                        ? 'bg-rose-50 text-rose-900 border-rose-200'
                        : brand.riskLevel === 'FRAGILE'
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <strong>Action:</strong> {brand.recommendedAction}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Employee Criticality Index */}
      {activeTab === 'CRITICALITY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600">
              Evaluates individual system dependency. Agents with high scores are irreplaceable
              primaries or versatile keystone floaters.
            </p>
            <div className="relative w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search employee or pod..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Agent</th>
                    <th className="py-2.5 px-3">Pod</th>
                    <th className="py-2.5 px-3 text-center">Criticality</th>
                    <th className="py-2.5 px-3">Sole Primary For</th>
                    <th className="py-2.5 px-3 text-center">Backups</th>
                    <th className="py-2.5 px-3">Skills</th>
                    <th className="py-2.5 px-3">Operational Dependency Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {emp.employeeName}
                        <div className="font-mono text-[11px] text-slate-500">{emp.employeeCode}</div>
                      </td>
                      <td className="py-2.5 px-3">{emp.podName}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          className={
                            emp.criticalityLevel === 'CRITICAL'
                              ? 'bg-rose-600 text-white font-bold'
                              : emp.criticalityLevel === 'HIGH'
                              ? 'bg-amber-600 text-white font-bold'
                              : emp.criticalityLevel === 'MEDIUM'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }
                        >
                          {emp.criticalityScore} ({emp.criticalityLevel})
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        {emp.solePrimaryFor.length === 0 ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {emp.solePrimaryFor.map((b) => (
                              <span
                                key={b}
                                className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-mono text-[10px] font-bold"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">
                        {emp.backupBrandsCount}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {emp.skills.map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-xs leading-relaxed">
                        {emp.riskSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Shock Outage Simulator */}
      {activeTab === 'STRESS_TEST' && (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    Simultaneous Outage Stress Test (Pairwise Absence Shocks)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Tests all random 2-person simultaneous employee absences across the roster to
                    determine SLA survival rate.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-600 text-white text-xs font-bold">
                  {stressTest.survivalRate}% Survival Rate
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Scenarios Evaluated</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {stressTest.simulationsRun} Outage Pairs
                  </div>
                </div>
                <div>
                  <div className="text-xs text-emerald-600 font-medium">Clean Absorptions</div>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">
                    {stressTest.cleanAbsorptionCount} ({stressTest.survivalRate}%)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-rose-600 font-medium">Coverage Deficit Formed</div>
                  <div className="text-xl font-black text-rose-700 mt-0.5">
                    {stressTest.gapsFormedCount} (
                    {Math.round((stressTest.gapsFormedCount / (stressTest.simulationsRun || 1)) * 1000) / 10}
                    %)
                  </div>
                </div>
              </div>

              {/* Vulnerable Brands Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Top 5 Most Vulnerable Brands Under Pairwise Outages:
                </h3>
                <div className="space-y-2">
                  {stressTest.mostVulnerableBrands.map((b) => (
                    <div
                      key={b.brandCode}
                      className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-rose-950 flex items-center gap-2">
                          <span className="font-mono bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">
                            {b.brandCode}
                          </span>
                          <span>{b.brandName}</span>
                        </div>
                        <div className="text-[11px] text-rose-700 mt-0.5">
                          Failed in {b.failureCount} out of {stressTest.simulationsRun} outage
                          scenarios.
                        </div>
                      </div>
                      <Badge className="bg-rose-600 text-white font-mono font-bold">
                        {b.failureRate}% Failure Risk
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
