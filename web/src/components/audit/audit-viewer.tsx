'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Bell,
  CheckCircle2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditEventItem {
  id: string;
  at: string | Date;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: any;
}

interface NotificationItem {
  id: string;
  audience: string;
  message: string;
  readAt?: string | Date | null;
  createdAt: string | Date;
}

interface AuditViewerProps {
  initialEvents: AuditEventItem[];
  initialNotifications: NotificationItem[];
}

export function AuditViewer({ initialEvents, initialNotifications }: AuditViewerProps) {
  const [events, setEvents] = useState<AuditEventItem[]>(initialEvents);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'NOTIFICATIONS'>('AUDIT');
  const [selectedPayload, setSelectedPayload] = useState<{ title: string; json: any } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [auditRes, notifRes] = await Promise.all([
        fetch(`/api/audit?action=${actionFilter}&actor=${actorFilter}`),
        fetch('/api/notifications'),
      ]);

      if (auditRes.ok) {
        const aData = await auditRes.json();
        setEvents(aData.events || []);
      }
      if (notifRes.ok) {
        const nData = await notifRes.json();
        setNotifications(nData.notifications || []);
      }
      toast.success('Audit trail refreshed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkNotifRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
      }
    } catch {
      // non-blocking
    }
  };

  const filteredEvents = events.filter((e) => {
    if (actionFilter !== 'ALL' && e.action !== actionFilter) return false;
    if (actorFilter !== 'ALL' && e.actor !== actorFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
                <FileText className="h-5 w-5 text-indigo-400" />
              </span>
              <h1 className="text-xl font-bold tracking-tight">Audit Trail &amp; Governance Center</h1>
              <Badge className="bg-indigo-400/20 text-indigo-200 border-indigo-400/30 text-xs font-semibold">
                SOC2 / Regulatory Compliance Log
              </Badge>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Immutable logging of all operational roster mutations, CP-SAT solve actions,
              managerial publish approvals, conflict acknowledgments, and Ripple Engine remediations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Log
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'AUDIT'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Audit Mutation Trail ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'NOTIFICATIONS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          Broadcast Notifications ({notifications.length})
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Audit Events */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Action:</span>
                <Select value={actionFilter} onValueChange={(val) => val && setActionFilter(val)}>
                  <SelectTrigger className="text-xs h-8 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Actions</SelectItem>
                    <SelectItem value="ROSTER_GENERATED">ROSTER_GENERATED</SelectItem>
                    <SelectItem value="ROSTER_PUBLISHED">ROSTER_PUBLISHED</SelectItem>
                    <SelectItem value="ROSTER_CELL_UPDATED">ROSTER_CELL_UPDATED</SelectItem>
                    <SelectItem value="CONFLICT_ACKNOWLEDGED">CONFLICT_ACKNOWLEDGED</SelectItem>
                    <SelectItem value="RIPPLE_REPAIR_APPLIED">RIPPLE_REPAIR_APPLIED</SelectItem>
                    <SelectItem value="ROSTER_REPAIRED_SOLVER">ROSTER_REPAIRED_SOLVER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Actor:</span>
                <Select value={actorFilter} onValueChange={(val) => val && setActorFilter(val)}>
                  <SelectTrigger className="text-xs h-8 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Actors</SelectItem>
                    <SelectItem value="Ops Manager">Ops Manager</SelectItem>
                    <SelectItem value="Pod Lead">Pod Lead</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Showing <strong>{filteredEvents.length}</strong> recorded audit events
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity Type &amp; ID</th>
                    <th className="py-2.5 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No audit events match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((evt) => {
                      const dateStr =
                        typeof evt.at === 'string'
                          ? evt.at.replace('T', ' ').slice(0, 19)
                          : new Date(evt.at).toISOString().replace('T', ' ').slice(0, 19);

                      return (
                        <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {dateStr}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900">{evt.actor}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              className={
                                evt.action === 'ROSTER_PUBLISHED'
                                  ? 'bg-emerald-600 text-white font-mono text-[10px]'
                                  : evt.action === 'ROSTER_GENERATED'
                                  ? 'bg-indigo-600 text-white font-mono text-[10px]'
                                  : evt.action === 'RIPPLE_REPAIR_APPLIED'
                                  ? 'bg-amber-600 text-white font-mono text-[10px]'
                                  : 'bg-slate-700 text-white font-mono text-[10px]'
                              }
                            >
                              {evt.action}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800">{evt.entityType}</div>
                            <div className="font-mono text-[10px] text-slate-400">{evt.entityId}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              onClick={() =>
                                setSelectedPayload({
                                  title: `${evt.action} on ${evt.entityType}`,
                                  json: evt.payload,
                                })
                              }
                              variant="ghost"
                              className="h-7 text-xs text-indigo-600 hover:text-indigo-800 gap-1 px-2"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Inspect Payload
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Notifications */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card className="border-dashed border-slate-300 py-12 text-center text-xs text-slate-500">
              No notifications recorded.
            </Card>
          ) : (
            notifications.map((n) => {
              const dateStr =
                typeof n.createdAt === 'string'
                  ? n.createdAt.replace('T', ' ').slice(0, 19)
                  : new Date(n.createdAt).toISOString().replace('T', ' ').slice(0, 19);

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-lg border transition-all flex items-start justify-between gap-4 ${
                    n.readAt
                      ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                      : 'bg-indigo-50/50 border-indigo-200 text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-1.5 rounded-lg mt-0.5 ${
                        n.readAt ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 text-white'
                      }`}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold leading-relaxed">{n.message}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        Audience: {n.audience} • Sent: {dateStr}
                      </div>
                    </div>
                  </div>

                  {!n.readAt && (
                    <Button
                      onClick={() => handleMarkNotifRead(n.id)}
                      variant="ghost"
                      className="text-xs text-indigo-600 hover:text-indigo-800 gap-1 h-7"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Read
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Payload Inspection Modal */}
      <Dialog open={!!selectedPayload} onOpenChange={(open) => !open && setSelectedPayload(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              {selectedPayload?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-slate-950 text-slate-100 p-3 rounded-lg font-mono text-xs max-h-96 overflow-y-auto">
            <pre>{JSON.stringify(selectedPayload?.json, null, 2)}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
