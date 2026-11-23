'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { Conflict } from '@/domain/validator/types';

interface ConflictSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rosterId: string;
  conflicts: Conflict[];
  onAcknowledgeSuccess: () => void;
}

export function ConflictSheet({
  open,
  onOpenChange,
  rosterId,
  conflicts,
  onAcknowledgeSuccess,
}: ConflictSheetProps) {
  const [filter, setFilter] = useState<'ALL' | 'ERRORS' | 'WARNS' | 'ACKED'>('ALL');
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [ackReason, setAckReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filteredConflicts = conflicts.filter((c) => {
    if (filter === 'ERRORS') return c.severity === 'ERROR' && !c.acknowledged;
    if (filter === 'WARNS') return c.severity === 'WARN' && !c.acknowledged;
    if (filter === 'ACKED') return c.acknowledged;
    return true;
  });

  const handleAcknowledge = async (fingerprint: string) => {
    if (!ackReason || ackReason.trim().length < 3) {
      toast.error('Please enter an operational justification (at least 3 characters)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/rosters/${rosterId}/conflicts/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, reason: ackReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to acknowledge');

      toast.success('Conflict acknowledged and approved as an operational exception');
      setAckingId(null);
      setAckReason('');
      onAcknowledgeSuccess();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorCount = conflicts.filter((c) => c.severity === 'ERROR' && !c.acknowledged).length;
  const warnCount = conflicts.filter((c) => c.severity === 'WARN' && !c.acknowledged).length;
  const ackedCount = conflicts.filter((c) => c.acknowledged).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-6">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-slate-900">
            <ShieldAlert className="h-5 w-5 text-indigo-600" />
            Roster Conflict Inspector
          </SheetTitle>
          <SheetDescription className="text-xs">
            Review rule conflicts, coverage deficits, and acknowledge operational exceptions.
          </SheetDescription>
        </SheetHeader>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-1.5 py-3 border-b">
          <Button
            size="xs"
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
            className={filter === 'ALL' ? 'bg-indigo-600 text-white' : ''}
          >
            All ({conflicts.length})
          </Button>
          <Button
            size="xs"
            variant={filter === 'ERRORS' ? 'default' : 'outline'}
            onClick={() => setFilter('ERRORS')}
            className={filter === 'ERRORS' ? 'bg-rose-600 text-white' : 'text-rose-700'}
          >
            Errors ({errorCount})
          </Button>
          <Button
            size="xs"
            variant={filter === 'WARNS' ? 'default' : 'outline'}
            onClick={() => setFilter('WARNS')}
            className={filter === 'WARNS' ? 'bg-amber-600 text-white' : 'text-amber-700'}
          >
            Warnings ({warnCount})
          </Button>
          <Button
            size="xs"
            variant={filter === 'ACKED' ? 'default' : 'outline'}
            onClick={() => setFilter('ACKED')}
            className={filter === 'ACKED' ? 'bg-emerald-600 text-white' : 'text-emerald-700'}
          >
            Acknowledged ({ackedCount})
          </Button>
        </div>

        {/* Conflict List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {filteredConflicts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No conflicts matching current filter.
            </div>
          ) : (
            filteredConflicts.map((c) => (
              <div
                key={c.id}
                className={`p-3 rounded-lg border text-xs space-y-2 ${
                  c.acknowledged
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : c.severity === 'ERROR'
                    ? 'border-rose-200 bg-rose-50/60'
                    : 'border-amber-200 bg-amber-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={
                        c.severity === 'ERROR'
                          ? 'destructive'
                          : c.acknowledged
                          ? 'outline'
                          : 'secondary'
                      }
                      className="text-[10px] font-mono px-1.5 py-0"
                    >
                      {c.code}
                    </Badge>
                    <span className="font-mono text-[11px] text-slate-500">{c.date}</span>
                  </div>

                  {c.acknowledged ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded">
                      <CheckCircle2 className="h-3 w-3" /> Acknowledged
                    </span>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setAckingId(c.id);
                        setAckReason('');
                      }}
                      className="text-[10px] h-6 bg-white"
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>

                <div className="text-slate-800 leading-relaxed">{c.message}</div>

                {c.acknowledged && c.ackReason && (
                  <div className="text-[11px] text-emerald-800 bg-white/70 p-2 rounded border border-emerald-100">
                    <span className="font-semibold">Reason:</span> {c.ackReason}
                  </div>
                )}

                {/* Inline Acknowledgment Input Form */}
                {ackingId === c.id && (
                  <div className="pt-2 border-t border-slate-200 space-y-2 bg-white p-2.5 rounded-lg">
                    <div className="font-semibold text-slate-800 text-[11px]">
                      Operational Exception Justification:
                    </div>
                    <Input
                      placeholder="e.g. Client requested scheduled offline maintenance"
                      value={ackReason}
                      onChange={(e) => setAckReason(e.target.value)}
                      className="h-8 text-xs"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setAckingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        onClick={() => handleAcknowledge(c.id)}
                        disabled={isSubmitting}
                        className="bg-indigo-600 text-white"
                      >
                        {isSubmitting ? 'Approving...' : 'Confirm Exception'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
