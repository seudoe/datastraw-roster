/**
 * Ranked Remediation Option Generator for The Ripple Engine
 * Generates 4 distinct, operationally grounded quick-fix remediations:
 * 1. Existing Floater / Backup Standby (Zero net gaps, within-pod or trained floater)
 * 2. Overtime / Dedicated Standby (Extra shift to qualified peer with comp-off credit)
 * 3. Cross-Pod Borrow (Borrowing from another pod with trade-off accounting)
 * 4. Peer Swap (Bilateral day swap between pod peers preserving weekly hour balance)
 */
import { getWeekday } from '@/domain/dates';
import type { RemediationOption } from './types';
import type { DomainSnapshot, EmployeeModel, ProcessModel, BrandModel } from '@/domain/types';

interface ShiftEntry {
  employeeId: string;
  date: string;
  status: string;
  processId?: string | null;
}

export function generateQuickFixes(
  targetDate: string,
  absentEmployee: EmployeeModel,
  targetProcess: ProcessModel,
  targetBrand: BrandModel,
  allEntries: ShiftEntry[],
  snapshot: DomainSnapshot,
): RemediationOption[] {
  const options: RemediationOption[] = [];
  const weekday = getWeekday(targetDate);

  // Index entries by `${employeeId}:${date}`
  const entryMap = new Map<string, ShiftEntry>();
  const monthlyWorkDaysPerEmp = new Map<string, number>();

  for (const e of allEntries) {
    entryMap.set(`${e.employeeId}:${e.date}`, e);
    if (e.status === 'WORK') {
      monthlyWorkDaysPerEmp.set(
        e.employeeId,
        (monthlyWorkDaysPerEmp.get(e.employeeId) || 0) + 1,
      );
    }
  }

  const podMap = new Map(snapshot.pods.map((p) => [p.id, p.name]));
  const absentPodName = podMap.get(absentEmployee.podId) || 'Primary Pod';

  // Find all assignments for this process
  const processAssignments = snapshot.assignments.filter(
    (a) => a.processId === targetProcess.id,
  );
  const backupEmployeeIds = new Set(
    processAssignments.filter((a) => a.role === 'BACKUP').map((a) => a.employeeId),
  );
  const allQualifiedEmployeeIds = new Set(processAssignments.map((a) => a.employeeId));

  const empById = new Map(snapshot.employees.map((e) => [e.id, e]));

  // --------------------------------------------------------------------------
  // Rank 1: Existing Floater / Backup Activation
  // --------------------------------------------------------------------------
  let rank1Option: RemediationOption | null = null;

  for (const backupId of backupEmployeeIds) {
    if (backupId === absentEmployee.id) continue;
    const candidate = empById.get(backupId);
    if (!candidate || !candidate.active) continue;

    // Hard availability check
    if (candidate.unavailableWeekdays.includes(weekday)) continue;

    const existingEntry = entryMap.get(`${candidate.id}:${targetDate}`);
    const isOffOnTargetDay = !existingEntry || existingEntry.status === 'WEEKLY_OFF';

    if (isOffOnTargetDay) {
      const isSamePod = candidate.podId === absentEmployee.podId;
      const podName = podMap.get(candidate.podId) || 'Support Pod';

      rank1Option = {
        id: `fix-floater-${candidate.id}-${targetDate}`,
        rank: 1,
        type: 'EXISTING_FLOATER',
        title: `Activate Floater: ${candidate.name} (${candidate.code})`,
        description: `Assign trained backup ${candidate.code} to cover ${targetBrand.name} (${targetBrand.code}) on ${targetDate}.`,
        assignedEmployeeId: candidate.id,
        assignedEmployeeCode: candidate.code,
        assignedEmployeeName: candidate.name,
        assignedEmployeePod: podName,
        targetProcessId: targetProcess.id,
        targetProcessName: targetProcess.name,
        targetDate,
        tradeoffs: [
          isSamePod
            ? 'Internal pod reallocation: Zero cross-team friction.'
            : `Cross-team floater from ${podName}: Reallocates general standby resource.`,
          'Compensatory day off will need to be rescheduled for this employee.',
        ],
        isFeasible: true,
        resultingDelta: {
          netGaps: 0,
          newViolations: 0,
        },
      };
      break;
    }
  }

  if (rank1Option) {
    options.push(rank1Option);
  } else {
    // If no OFF backup found, look for any qualified backup even if already working, noting the trade-off
    const anyBackupId = Array.from(backupEmployeeIds).find((id) => id !== absentEmployee.id);
    if (anyBackupId) {
      const candidate = empById.get(anyBackupId);
      if (candidate) {
        options.push({
          id: `fix-floater-busy-${candidate.id}-${targetDate}`,
          rank: 1,
          type: 'EXISTING_FLOATER',
          title: `Reallocate Backup: ${candidate.name} (${candidate.code})`,
          description: `Backup ${candidate.code} is currently on another duty but holds certified qualifications for ${targetBrand.code}.`,
          assignedEmployeeId: candidate.id,
          assignedEmployeeCode: candidate.code,
          assignedEmployeeName: candidate.name,
          assignedEmployeePod: podMap.get(candidate.podId) || 'Pod',
          targetProcessId: targetProcess.id,
          targetProcessName: targetProcess.name,
          targetDate,
          tradeoffs: ['Backup is already rostered elsewhere; secondary gap will form if moved.'],
          isFeasible: false,
          resultingDelta: {
            netGaps: 1,
            newViolations: 0,
          },
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Rank 2: Overtime / Dedicated Standby
  // --------------------------------------------------------------------------
  // Find qualified employee with the least monthly shifts who is OFF on targetDate
  let leastShiftsCandidate: EmployeeModel | null = null;
  let minShifts = Infinity;

  for (const empId of allQualifiedEmployeeIds) {
    if (empId === absentEmployee.id) continue;
    // Skip if already picked as rank 1
    if (rank1Option && empId === rank1Option.assignedEmployeeId) continue;

    const candidate = empById.get(empId);
    if (!candidate || !candidate.active) continue;
    if (candidate.unavailableWeekdays.includes(weekday)) continue;

    const existingEntry = entryMap.get(`${candidate.id}:${targetDate}`);
    if (!existingEntry || existingEntry.status === 'WEEKLY_OFF') {
      const shifts = monthlyWorkDaysPerEmp.get(candidate.id) || 0;
      if (shifts < minShifts) {
        minShifts = shifts;
        leastShiftsCandidate = candidate;
      }
    }
  }

  if (leastShiftsCandidate) {
    options.push({
      id: `fix-overtime-${leastShiftsCandidate.id}-${targetDate}`,
      rank: 2,
      type: 'OVERTIME_STANDBY',
      title: `Overtime Shift: ${leastShiftsCandidate.name} (${leastShiftsCandidate.code})`,
      description: `Schedule ${leastShiftsCandidate.code} for an additional shift on ${targetDate}. They currently have ${minShifts} working days this month (lowest in qualified pool).`,
      assignedEmployeeId: leastShiftsCandidate.id,
      assignedEmployeeCode: leastShiftsCandidate.code,
      assignedEmployeeName: leastShiftsCandidate.name,
      assignedEmployeePod: podMap.get(leastShiftsCandidate.podId) || absentPodName,
      targetProcessId: targetProcess.id,
      targetProcessName: targetProcess.name,
      targetDate,
      tradeoffs: [
        'Requires approving 1 comp-off credit or overtime payment.',
        'Increases agent monthly duty hours by +8.0 hrs.',
      ],
      isFeasible: true,
      resultingDelta: {
        netGaps: 0,
        newViolations: 0,
      },
    });
  }

  // --------------------------------------------------------------------------
  // Rank 3: Cross-Pod Borrow
  // --------------------------------------------------------------------------
  // Look in other pods for agents with matching process type skill (e.g. CS, ACC)
  let crossPodCandidate: EmployeeModel | null = null;
  let crossPodSource: string = '';

  for (const candidate of snapshot.employees) {
    if (!candidate.active) continue;
    if (candidate.podId === absentEmployee.podId) continue; // Must be cross-pod
    if (candidate.unavailableWeekdays.includes(weekday)) continue;
    if (!candidate.skills.includes(targetProcess.type)) continue;

    // Check if free on target day
    const existingEntry = entryMap.get(`${candidate.id}:${targetDate}`);
    if (!existingEntry || existingEntry.status === 'WEEKLY_OFF') {
      crossPodCandidate = candidate;
      crossPodSource = podMap.get(candidate.podId) || 'External Pod';
      break;
    }
  }

  if (crossPodCandidate) {
    options.push({
      id: `fix-borrow-${crossPodCandidate.id}-${targetDate}`,
      rank: 3,
      type: 'CROSS_POD_BORROW',
      title: `Cross-Pod Borrow: ${crossPodCandidate.name} (${crossPodCandidate.code})`,
      description: `Temporarily borrow certified agent ${crossPodCandidate.code} from ${crossPodSource} who holds ${targetProcess.type} competency.`,
      assignedEmployeeId: crossPodCandidate.id,
      assignedEmployeeCode: crossPodCandidate.code,
      assignedEmployeeName: crossPodCandidate.name,
      assignedEmployeePod: crossPodSource,
      targetProcessId: targetProcess.id,
      targetProcessName: targetProcess.name,
      targetDate,
      tradeoffs: [
        `Inter-pod coordination: Pod Lead of ${crossPodSource} must approve the temporary borrow.`,
        'Agent may need a 15-minute operational briefing on brand-specific nuances.',
      ],
      isFeasible: true,
      resultingDelta: {
        netGaps: 0,
        newViolations: 0,
      },
    });
  }

  // --------------------------------------------------------------------------
  // Rank 4: Peer Shift Swap
  // --------------------------------------------------------------------------
  // Find a teammate in the same pod who works on a day where absentEmployee was scheduled OFF
  let swapCandidate: EmployeeModel | null = null;
  let swapDate: string = '';

  // Look +/- 3 days for a clean swap
  const targetTime = new Date(`${targetDate}T00:00:00.000Z`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const offset of [-2, -1, 1, 2, 3]) {
    const candidateTime = new Date(targetTime + offset * dayMs);
    const candidateDateStr = candidateTime.toISOString().split('T')[0];

    // Absent employee must be OFF on candidateDateStr
    const absentEntryOnOtherDay = entryMap.get(`${absentEmployee.id}:${candidateDateStr}`);
    if (absentEntryOnOtherDay && absentEntryOnOtherDay.status === 'WEEKLY_OFF') {
      // Find a teammate in the same pod who is WORKING on candidateDateStr and qualified for targetProcess
      for (const empId of allQualifiedEmployeeIds) {
        if (empId === absentEmployee.id) continue;
        const peer = empById.get(empId);
        if (!peer || !peer.active || peer.podId !== absentEmployee.podId) continue;

        const peerEntryOnTargetDay = entryMap.get(`${peer.id}:${targetDate}`);
        const peerEntryOnOtherDay = entryMap.get(`${peer.id}:${candidateDateStr}`);

        if (
          (!peerEntryOnTargetDay || peerEntryOnTargetDay.status === 'WEEKLY_OFF') &&
          peerEntryOnOtherDay &&
          peerEntryOnOtherDay.status === 'WORK'
        ) {
          swapCandidate = peer;
          swapDate = candidateDateStr;
          break;
        }
      }
    }
    if (swapCandidate) break;
  }

  if (swapCandidate) {
    options.push({
      id: `fix-swap-${swapCandidate.id}-${targetDate}`,
      rank: 4,
      type: 'PEER_SWAP',
      title: `Peer Swap: ${swapCandidate.name} (${swapCandidate.code})`,
      description: `Bilateral swap: ${swapCandidate.code} covers ${targetDate}, while ${absentEmployee.code} reciprocates by covering ${swapDate}.`,
      assignedEmployeeId: swapCandidate.id,
      assignedEmployeeCode: swapCandidate.code,
      assignedEmployeeName: swapCandidate.name,
      assignedEmployeePod: absentPodName,
      targetProcessId: targetProcess.id,
      targetProcessName: targetProcess.name,
      targetDate,
      tradeoffs: [
        'Zero overtime cost: Hour balances are perfectly preserved for both employees.',
        `Requires mutual agreement between ${absentEmployee.code} and ${swapCandidate.code}.`,
      ],
      isFeasible: true,
      resultingDelta: {
        netGaps: 0,
        newViolations: 0,
      },
    });
  }

  return options;
}
