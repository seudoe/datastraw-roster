'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Layers,
  Zap,
  ShieldAlert,
  Users,
  Building2,
  Tag,
  Clock,
  Settings,
  FileText,
  LayoutDashboard,
  Loader2,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNav: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Roster Grid', href: '/roster/2026-12', icon: Calendar },
  { title: 'Absences & Leaves', href: '/absences', icon: Clock },
  { title: 'Ripple Simulator', href: '/ripple', icon: Zap },
  { title: 'Resilience Analytics', href: '/resilience', icon: ShieldAlert },
  { title: 'Audit Trail', href: '/audit', icon: FileText },
];

const setupNav: NavItem[] = [
  { title: 'Employees', href: '/setup/employees', icon: Users },
  { title: 'Pods & Leads', href: '/setup/pods', icon: Building2 },
  { title: 'Brands & Processes', href: '/setup/brands', icon: Tag },
  { title: 'Operating Calendars', href: '/setup/calendars', icon: Layers },
  { title: 'System Settings', href: '/setup/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear pending state once pathname matches
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const renderNavLinks = (items: NavItem[]) => (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isLinkActive(item.href);
        const isPending = pendingHref === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              if (pathname !== item.href) {
                setPendingHref(item.href);
              }
            }}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 relative group',
              active
                ? 'bg-indigo-600 text-white shadow-sm'
                : isPending
                ? 'bg-indigo-900/60 text-white ring-1 ring-indigo-400/50'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform group-hover:scale-110',
                  active || isPending ? 'text-white' : 'text-slate-400',
                )}
              />
              <span>{item.title}</span>
            </div>

            {/* Instant loading feedback */}
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300 ml-auto" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          R
        </div>
        <div>
          <span className="font-extrabold text-lg text-white tracking-tight">RosterIQ</span>
          <span className="text-[10px] block text-indigo-400 font-mono font-semibold uppercase tracking-wider">
            Smart Scheduling
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {/* Operations */}
        <div>
          <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Operations
          </div>
          {renderNavLinks(mainNav)}
        </div>

        {/* Setup & Configuration */}
        <div>
          <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Setup &amp; Config
          </div>
          {renderNavLinks(setupNav)}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span>Engine:</span>
          <span className="font-mono text-slate-300 font-semibold">OR-Tools 9.15</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Target:</span>
          <span className="font-mono text-emerald-400 font-semibold">PostgreSQL</span>
        </div>
      </div>
    </aside>
  );
}
