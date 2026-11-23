/**
 * Conflict Taxonomy and Validation Types for RosterIQ
 * Independent pure TypeScript validation engine.
 */

export type ConflictSeverity = 'ERROR' | 'WARN' | 'INFO';

export type ConflictCode =
  | 'COVERAGE_ZERO'
  | 'COVERAGE_BELOW_MIN'
  | 'WORKING_WHILE_ABSENT'
  | 'MAX_CONSECUTIVE_EXCEEDED'
  | 'UNAVAILABLE_WEEKDAY_WORKED'
  | 'BACKUP_OVERLOAD'
  | 'CASCADE_GAP'
  | 'WEEKLY_OFF_MISSING'
  | 'WEEKLY_OFF_PREFERENCE_VIOLATED';

export interface Conflict {
  id: string; // Deterministic fingerprint
  code: ConflictCode;
  severity: ConflictSeverity;
  message: string;
  date: string; // YYYY-MM-DD
  employeeId?: string;
  processId?: string;
  brandId?: string;
  acknowledged?: boolean;
  ackReason?: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean; // True if errorCount === 0 (or all errors acknowledged)
  errorCount: number;
  warnCount: number;
  infoCount: number;
  conflicts: Conflict[];
}

export interface RosterEntryValidationInput {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: 'WORK' | 'WEEKLY_OFF' | 'HOLIDAY' | 'LEAVE' | 'COMP_OFF';
  processId?: string | null;
  role?: 'PRIMARY' | 'BACKUP' | 'TEMPORARY' | null;
  locked?: boolean;
}

export interface ConflictAckInput {
  fingerprint: string;
  reason: string;
  ackBy: string;
}
