/**
 * Type definitions for The Ripple Engine
 * Covers ChangeSet modeling, simulation impact deltas, ranked remediation options,
 * and safe-to-approve date evaluations.
 */
import type { DayStatus } from '@/domain/types';

export type ChangeType =
  | 'LEAVE_REQUEST'
  | 'DEMAND_CHANGE'
  | 'CAPACITY_CHANGE'
  | 'SWAP_REQUEST';

export interface LeaveChangePayload {
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  absenceType: 'PLANNED_LEAVE' | 'SICK' | 'COMP_OFF' | 'OTHER';
  reason?: string;
}

export interface DemandChangePayload {
  processId: string;
  date: string; // YYYY-MM-DD
  newMinStaff: number;
  reason?: string;
}

export interface CapacityChangePayload {
  employeeId: string;
  unavailableWeekdays?: number[];
  maxConsecutiveWorkDays?: number;
}

export interface SwapChangePayload {
  employeeAId: string;
  dateA: string;
  employeeBId: string;
  dateB: string;
}

export interface ChangeSet {
  id?: string;
  type: ChangeType;
  payload: LeaveChangePayload | DemandChangePayload | CapacityChangePayload | SwapChangePayload;
  createdAt?: string;
}

export interface DirectImpact {
  date: string;
  affectedEmployeeId: string;
  affectedEmployeeName: string;
  affectedProcessId: string;
  affectedProcessName: string;
  affectedBrandCode: string;
  affectedBrandName: string;
  brandPriority: number;
  previousStatus: DayStatus;
  newStatus: DayStatus;
  deficitCreated: number;
}

export interface CascadeImpact {
  date: string;
  dominoType: 'BACKUP_ACTIVATION' | 'CROSS_POD_DEPLETION' | 'OVERTIME_TRIGGER' | 'GAP_FORMED';
  description: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  brandCode?: string;
  employeeCode?: string;
}

export interface MetricDelta {
  coverageRateBefore: number;
  coverageRateAfter: number;
  totalGapsBefore: number;
  totalGapsAfter: number;
  conflictsBefore: number;
  conflictsAfter: number;
}

export interface RemediationOption {
  id: string;
  rank: 1 | 2 | 3 | 4;
  type: 'EXISTING_FLOATER' | 'OVERTIME_STANDBY' | 'CROSS_POD_BORROW' | 'PEER_SWAP';
  title: string;
  description: string;
  assignedEmployeeId: string;
  assignedEmployeeCode: string;
  assignedEmployeeName: string;
  assignedEmployeePod: string;
  targetProcessId: string;
  targetProcessName: string;
  targetDate: string;
  tradeoffs: string[];
  isFeasible: boolean;
  resultingDelta: {
    netGaps: number;
    newViolations: number;
  };
}

export interface RippleSimulationResult {
  change: ChangeSet;
  isSafeToApprove: boolean;
  safetyLevel: 'SAFE' | 'CAUTION' | 'UNSAFE';
  directImpacts: DirectImpact[];
  cascadeImpacts: CascadeImpact[];
  metricDelta: MetricDelta;
  remediationOptions: RemediationOption[];
  simulationTimeMs: number;
}

export interface SafeDateEvaluation {
  date: string; // YYYY-MM-DD
  safety: 'SAFE' | 'CAUTION' | 'UNSAFE';
  reason: string;
  isScheduledToWork: boolean;
  brandCode?: string;
  brandName?: string;
  availableBackups: {
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    podName: string;
    isSamePod: boolean;
  }[];
}
