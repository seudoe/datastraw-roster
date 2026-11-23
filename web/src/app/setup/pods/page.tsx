'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function PodsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [podName, setPodName] = useState('');

  const { data: pods = [], isLoading } = useQuery({
    queryKey: ['pods'],
    queryFn: async () => {
      const res = await fetch('/api/pods');
      if (!res.ok) throw new Error('Failed to load pods');
      return res.json();
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to load employees');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create pod');
      return data;
    },
    onSuccess: () => {
      toast.success('Pod created successfully');
      queryClient.invalidateQueries({ queryKey: ['pods'] });
      setIsCreateOpen(false);
      setPodName('');
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ podId, leadId }: { podId: string; leadId: string }) => {
      const res = await fetch(`/api/pods/${podId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update lead');
      return data;
    },
    onSuccess: () => {
      toast.success('Pod lead updated');
      queryClient.invalidateQueries({ queryKey: ['pods'] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            Operational Pods ({pods.length})
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Autonomous staffing units managed by designated Pod Leads.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger
            render={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="h-4 w-4" /> Add Pod
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Operational Pod</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">Pod Name</label>
                <Input
                  placeholder="e.g. Pod Vanguard"
                  value={podName}
                  onChange={(e) => setPodName(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate({ name: podName })}
                  disabled={!podName || createMutation.isPending}
                  className="bg-indigo-600 text-white"
                >
                  Create
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 text-center py-12 text-slate-500">Loading pods...</div>
        ) : (
          pods.map((pod: any) => {
            const podMembers = employees.filter((e: any) => e.podId === pod.id);

            return (
              <Card key={pod.id} className="border border-slate-200 shadow-xs">
                <CardHeader className="pb-3 bg-slate-50/70 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-900">{pod.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {podMembers.length} active member(s)
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200">
                      Pod ID: {pod.id.slice(-6)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Lead Assignment */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Designated Pod Lead
                    </label>
                    <Select
                      value={pod.leadId || 'none'}
                      onValueChange={(val) => {
                        if (val !== 'none') {
                          updateLeadMutation.mutate({ podId: pod.id, leadId: val });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Assign a pod lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>
                          Select a member
                        </SelectItem>
                        {podMembers.map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Members List */}
                  <div>
                    <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      Pod Members ({podMembers.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-100">
                      {podMembers.map((member: any) => (
                        <Badge
                          key={member.id}
                          variant={member.id === pod.leadId ? 'default' : 'secondary'}
                          className={
                            member.id === pod.leadId
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-slate-700 border-slate-200'
                          }
                        >
                          {member.name} ({member.code})
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
