'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, Tag, ArrowRight, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [priority, setPriority] = useState('2');

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await fetch('/api/brands');
      if (!res.ok) throw new Error('Failed to load brands');
      return res.json();
    },
  });

  const { data: calendars = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      const res = await fetch('/api/calendars');
      if (!res.ok) throw new Error('Failed to load calendars');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create brand');
      return data;
    },
    onSuccess: () => {
      toast.success('Brand created successfully');
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setIsCreateOpen(false);
      setCode('');
      setName('');
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !calendarId) {
      toast.error('Please fill in brand code, name, and operating calendar');
      return;
    }
    createMutation.mutate({
      code,
      name,
      calendarId,
      priority: Number(priority),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-indigo-600" />
            Brand Catalog ({brands.length})
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            D2C client brands, process definitions, operating calendars, and minimum staffing requirements.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger
            render={
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="h-4 w-4" /> Add Brand
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client Brand</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">Brand Code</label>
                <Input
                  placeholder="e.g. BR_26"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Brand Name</label>
                <Input
                  placeholder="e.g. UrbanSprout Organics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Operating Calendar</label>
                <Select value={calendarId} onValueChange={(v) => v && setCalendarId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select operating calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.rule})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">SLA Priority (1 = Low, 3 = High)</label>
                <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Priority 1 (Standard)</SelectItem>
                    <SelectItem value="2">Priority 2 (Elevated)</SelectItem>
                    <SelectItem value="3">Priority 3 (Critical SLA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 text-white">
                  {createMutation.isPending ? 'Saving...' : 'Create Brand'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Operating Calendar</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Processes</TableHead>
                <TableHead>Primary Assignees</TableHead>
                <TableHead className="w-24 text-right">Configure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Loading brands...
                  </TableCell>
                </TableRow>
              ) : brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No brands found.
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand: any) => {
                  const primaryEmployees = Array.from(
                    new Set(
                      brand.processes.flatMap((p: any) =>
                        p.assignments
                          .filter((a: any) => a.role === 'PRIMARY')
                          .map((a: any) => `${a.employee.name} (${a.employee.code})`),
                      ),
                    ),
                  );

                  return (
                    <TableRow key={brand.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono font-bold text-xs text-indigo-700">
                        {brand.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{brand.name}</div>
                        {brand.code === 'BR_03' || brand.code === 'BR_18' ? (
                          <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                            <ShieldAlert className="h-3 w-3" /> Structurally uncoverable 365
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            brand.calendar?.rule === 'ALL_365'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : brand.calendar?.rule === 'SUN_AND_HOLIDAYS_OFF'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }
                        >
                          {brand.calendar?.name || 'Default'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={brand.priority === 3 ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          P{brand.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {brand.processes?.length || 0} process(es)
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                        {primaryEmployees.length > 0 ? primaryEmployees.join(', ') : 'Unassigned'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/setup/brands/${brand.id}`}
                          className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1 text-indigo-600' })}
                        >
                          Edit <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
