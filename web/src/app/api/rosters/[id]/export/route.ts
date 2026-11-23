import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getDaysInMonth } from '@/domain/dates';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';

    const roster = await db.roster.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            employee: {
              include: {
                pod: true,
              },
            },
          },
        },
      },
    });

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
    }

    const days = getDaysInMonth(roster.month);

    // Group entries by employee
    const empEntriesMap = new Map<
      string,
      {
        code: string;
        name: string;
        podName: string;
        shiftsByDate: Map<string, string>;
      }
    >();

    for (const entry of roster.entries) {
      const emp = entry.employee;
      if (!empEntriesMap.has(emp.id)) {
        empEntriesMap.set(emp.id, {
          code: emp.code,
          name: emp.name,
          podName: emp.pod.name,
          shiftsByDate: new Map(),
        });
      }

      const dateStr = entry.date.toISOString().split('T')[0];
      let cellText: string = entry.status;
      if (entry.status === 'WORK' && entry.note?.startsWith('process:')) {
        cellText = `WORK (${entry.note.replace('process:', '')})`;
      }
      empEntriesMap.get(emp.id)!.shiftsByDate.set(dateStr, cellText);
    }

    // Generate CSV
    const csvRows: string[] = [];

    // Header row
    const headerCols = ['Employee Code', 'Employee Name', 'Pod', 'Work Shifts', 'Off Days', ...days];
    csvRows.push(headerCols.map((c) => `"${c}"`).join(','));

    // Data rows sorted by Pod then Code
    const sortedEmployees = Array.from(empEntriesMap.values()).sort((a, b) => {
      if (a.podName !== b.podName) return a.podName.localeCompare(b.podName);
      return a.code.localeCompare(b.code);
    });

    for (const emp of sortedEmployees) {
      let workCount = 0;
      let offCount = 0;
      const dayValues: string[] = [];

      for (const d of days) {
        const val = emp.shiftsByDate.get(d) || 'WEEKLY_OFF';
        if (val.startsWith('WORK')) workCount++;
        else offCount++;
        dayValues.push(`"${val}"`);
      }

      const row = [
        `"${emp.code}"`,
        `"${emp.name}"`,
        `"${emp.podName}"`,
        workCount,
        offCount,
        ...dayValues,
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\r\n');
    const filename = `roster-${roster.month}-v${roster.version}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to export roster' },
      { status: 500 },
    );
  }
}
