/**
 * Shared Domain Types for RosterIQ
 * All dates are plain ISO strings (YYYY-MM-DD)
 */

export type ProcessType = 'CS' | 'ACC' | 'NDR' | 'RETENTION' | 'OTHER';

export type OperatingRule =
  | 'ALL_365'
  | 'DAILY_EXCEPT_HOLIDAYS'
  | 'SUN_AND_HOLIDAYS_OFF'
  | 'CUSTOM';

export type AssignmentRole = 'PRIMARY' | 'BACKUP' | 'TEMPORARY';

export type AbsenceType = 'PLANNED_LEAVE' | 'SICK' | 'COMP_OFF' | 'OTHER';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type DayStatus = 'WORK' | 'WEEKLY_OFF' | 'HOLIDAY' | 'LEAVE' | 'COMP_OFF';

export type EntrySource = 'SOLVER' | 'MANUAL' | 'REPAIR';

export type RosterStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'SUPERSEDED';

export type AvailabilityState =
  | 'FORCED_L'
  | 'FORCED_C'
  | 'FORCED_H'
  | 'UNAVAILABLE_WEEKDAY'
  | 'FREE';

export interface PodModel {
  id: string;
  name: string;
  leadId?: string | null;
}

export interface EmployeeModel {
  id: string;
  code: string;
  name: string;
  email?: string | null;
  podId: string;
  skills: ProcessType[];
  weeklyOffsPerWeek: number;
  preferredOffWeekdays: number[]; // 0=Sun..6=Sat
  unavailableWeekdays: number[]; // 0=Sun..6=Sat
  maxConsecutiveWorkDays?: number | null;
  maxBackupBrandsPerDay?: number | null;
  active: boolean;
}

export interface OperatingCalendarModel {
  id: string;
  name: string;
  rule: OperatingRule;
  workingWeekdays: number[];
  observesHolidays: boolean;
}

export interface BrandModel {
  id: string;
  code: string;
  name: string;
  calendarId: string;
  priority: number; // 1 (low) to 3 (critical)
  active: boolean;
}

export interface ProcessModel {
  id: string;
  brandId: string;
  type: ProcessType;
  name: string;
  calendarId?: string | null; // Override calendar
  defaultMinStaff: number;
}

export interface CoverageRuleModel {
  id: string;
  processId: string;
  weekday?: number | null; // 0=Sun..6=Sat
  date?: string | null; // YYYY-MM-DD
  minStaff: number;
  note?: string | null;
}

export interface HolidayModel {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  brandId?: string | null; // null = company-wide
}

export interface AssignmentModel {
  id: string;
  employeeId: string;
  processId: string;
  role: AssignmentRole;
  allocationPct: number;
  validFrom?: string | null; // YYYY-MM-DD
  validTo?: string | null; // YYYY-MM-DD
}

export interface AbsenceModel {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: RequestStatus;
  reason?: string | null;
}

export interface GlobalSettings {
  maxConsecutiveWorkDays: number; // default 6
  maxBackupBrandsPerDay: number; // default 2
  fiscalWeekStart: number; // default 1 (Monday)
  compOffValidityDays: number; // default 30
}

export interface DomainSnapshot {
  employees: EmployeeModel[];
  pods: PodModel[];
  calendars: OperatingCalendarModel[];
  brands: BrandModel[];
  processes: ProcessModel[];
  coverageRules: CoverageRuleModel[];
  holidays: HolidayModel[];
  assignments: AssignmentModel[];
  absences: AbsenceModel[];
  settings: GlobalSettings;
}

export interface SolverProblemSpec {
  month: string; // YYYY-MM
  days: string[]; // List of YYYY-MM-DD
  employees: {
    id: string;
    code: string;
    weeklyOffsTarget: number;
    preferredOffWeekdays: number[];
    maxConsecutiveWorkDays: number;
    maxBackupBrandsPerDay: number;
    primaryProcessIds: string[];
    backupProcessIds: string[];
  }[];
  processes: {
    id: string;
    brandId: string;
    brandPriority: number;
    demand: Record<string, number>; // date -> minStaff (0 if closed)
  }[];
  assignments: {
    employeeId: string;
    processId: string;
    role: AssignmentRole;
  }[];
  forced: {
    employeeId: string;
    date: string;
    status: DayStatus;
    reason: string;
  }[];
  locks: {
    employeeId: string;
    date: string;
    status: DayStatus;
  }[];
  profile: string;
  timeLimitSec: number;
  seed: number;
}
