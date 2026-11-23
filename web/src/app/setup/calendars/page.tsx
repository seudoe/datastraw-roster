'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Layers, Plus, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CalendarsPage() {
  const queryClient = useQueryClient();
  const [isCalDialogOpen, setIsCalDialogOpen] = useState(false);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);

  // Calendar form
  const [calName, setCalName] = useState('');
  const [calRule, setCalRule] = useState<'ALL_365' | 'DAILY_EXCEPT_HOLIDAYS' | 'SUN_AND_HOLIDAYS_OFF' | 'CUSTOM'>('CUSTOM');

  // Holiday form
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  const { data: calendars = [] } = useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      const res = await fetch('/api/calendars');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const res = await fetch('/api/holidays');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createCalMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create calendar');
      return data;
    },
    onSuccess: () => {
      toast.success('Operating calendar created');
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      setIsCalDialogOpen(false);
      setCalName('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createHolidayMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create holiday');
      return data;
    },
    onSuccess: () => {
      toast.success('Holiday declared');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setIsHolidayDialogOpen(false);
      setHolidayDate('');
      setHolidayName('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete holiday');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Holiday removed');
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Layers className="h-6 w-6 text-indigo-600" />
          Operating Calendars &amp; Holidays
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Demand-side rules governing when brands and processes operate or observe closures.
        </p>
      </div>

      {/* Calendars Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-slate-800">Operating Calendars ({calendars.length})</h2>
          <Dialog open={isCalDialogOpen} onOpenChange={setIsCalDialogOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="bg-indigo-600 text-white gap-1.5">
                  <Plus className="h-4 w-4" /> Add Calendar
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Operating Calendar</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Calendar Name</label>
                  <Input
                    placeholder="e.g. 6-Day Operation (Sat Off)"
                    value={calName}
                    onChange={(e) => setCalName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Operating Rule</label>
                  <Select value={calRule} onValueChange={(v: any) => setCalRule(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_365">ALL_365 (365 Days Uninterrupted)</SelectItem>
                      <SelectItem value="DAILY_EXCEPT_HOLIDAYS">DAILY_EXCEPT_HOLIDAYS (Daily, Off on Holidays)</SelectItem>
                      <SelectItem value="SUN_AND_HOLIDAYS_OFF">SUN_AND_HOLIDAYS_OFF (Sundays &amp; Holidays Off)</SelectItem>
                      <SelectItem value="CUSTOM">CUSTOM (Specific Weekdays)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCalDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      createCalMutation.mutate({
                        name: calName,
                        rule: calRule,
                        workingWeekdays: [1, 2, 3, 4, 5],
                        observesHolidays: calRule !== 'ALL_365',
                      })
                    }
                    className="bg-indigo-600 text-white"
                  >
                    Save Calendar
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Calendar Name</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Observes Holidays</TableHead>
                <TableHead>Active Brands</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendars.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-slate-900">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {c.rule}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.observesHolidays ? (
                      <span className="text-xs text-emerald-600 font-medium">Yes (Closed on Holidays)</span>
                    ) : (
                      <span className="text-xs text-slate-400">No (Operates on Holidays)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {c.brands?.length || 0} brand(s)
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Holidays Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-slate-800">Company &amp; Brand Holidays ({holidays.length})</h2>
          <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
            <DialogTrigger
              render={
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4 text-indigo-600" /> Declare Holiday
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Declare Observed Holiday</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Date (YYYY-MM-DD)</label>
                  <Input
                    type="date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Holiday Name</label>
                  <Input
                    placeholder="e.g. Diwali Holiday"
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsHolidayDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      createHolidayMutation.mutate({
                        date: holidayDate,
                        name: holidayName,
                        brandId: null, // Company-wide
                      })
                    }
                    className="bg-indigo-600 text-white"
                  >
                    Save Holiday
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Holiday Name</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="w-16 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {h.date.split('T')[0]}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{h.name}</TableCell>
                  <TableCell>
                    {h.brandId ? (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                        Brand-Specific: {h.brand?.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700">
                        Company-Wide
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteHolidayMutation.mutate(h.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
