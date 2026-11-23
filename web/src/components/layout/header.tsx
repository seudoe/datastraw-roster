'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, RefreshCw, Shield, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState<'OPS_MANAGER' | 'POD_LEAD' | 'VIEWER'>('OPS_MANAGER');
  const [selectedMonth, setSelectedMonth] = useState('2026-12');
  const [healthStatus, setHealthStatus] = useState<{
    db: string;
    solver: string;
  }>({ db: 'checking', solver: 'checking' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthStatus({
          db: data.services?.db === 'ok' ? 'ok' : 'degraded',
          solver: data.services?.solver === 'ok' ? 'ok' : data.services?.solver || 'offline',
        });
      }
    } catch {
      setHealthStatus({ db: 'error', solver: 'offline' });
    }
  };

  // Sync role from cookie on boot
  useEffect(() => {
    fetch('/api/auth/role')
      .then((res) => res.json())
      .then((data) => {
        if (data.role) setRole(data.role);
      })
      .catch(() => {});

    // Check system health
    checkHealth();
  }, []);

  const handleRoleChange = async (newRole: 'OPS_MANAGER' | 'POD_LEAD' | 'VIEWER') => {
    setRole(newRole);
    try {
      const res = await fetch('/api/auth/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success(`Switched role to ${newRole.replace('_', ' ')}`);
        router.refresh();
      }
    } catch {
      toast.error('Failed to change role');
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    // If currently on a roster page, navigate to the selected month
    if (pathname.startsWith('/roster/')) {
      router.push(`/roster/${month}`);
    }
  };

  const handleResetSeed = async () => {
    if (!confirm('Reset database to default seed data (32 employees, 25 brands, 4 pods)?')) {
      return;
    }
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/scenarios/reset-seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Database reset successfully');
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to reset seed');
      }
    } catch {
      toast.error('Network error during reset');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
      {/* Left: Month Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
          <Calendar className="h-4 w-4 text-indigo-600" />
          <span>Active Planning Month:</span>
        </div>
        <Select value={selectedMonth} onValueChange={(v) => v && handleMonthChange(v)}>
          <SelectTrigger className="w-36 h-9 font-semibold text-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026-12">Dec 2026 (Demo)</SelectItem>
            <SelectItem value="2027-01">Jan 2027</SelectItem>
            <SelectItem value="2027-02">Feb 2027</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right: Role Switcher & System Status */}
      <div className="flex items-center gap-4">
        {/* Reset Database Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetSeed}
          disabled={isRefreshing}
          className="text-xs h-9 text-slate-700 gap-1.5"
          title="Reset database to seed state"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Reset Demo Data
        </Button>

        {/* Solver & DB Status */}
        <div className="hidden md:flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              healthStatus.db === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-300'
            }
          >
            PostgreSQL: {healthStatus.db}
          </Badge>
          <Badge
            variant="outline"
            className={
              healthStatus.solver === 'ok'
                ? 'bg-sky-50 text-sky-700 border-sky-300'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }
          >
            CP-SAT: {healthStatus.solver}
          </Badge>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Shield className="h-3.5 w-3.5 text-indigo-600" />
            <span>Role:</span>
          </div>
          <Select
            value={role}
            onValueChange={(v) => v && handleRoleChange(v as 'OPS_MANAGER' | 'POD_LEAD' | 'VIEWER')}
          >
            <SelectTrigger className="w-36 h-9 font-semibold text-indigo-700 bg-indigo-50/60 border-indigo-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPS_MANAGER">Ops Manager (Full)</SelectItem>
              <SelectItem value="POD_LEAD">Pod Lead (Scoped)</SelectItem>
              <SelectItem value="VIEWER">Viewer (Read-only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
