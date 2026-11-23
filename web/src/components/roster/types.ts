/**
 * Types and interfaces for the interactive Roster Workspace
 */
import type { DayStatus } from '@/domain/types';
import type { Conflict } from '@/domain/validator/types';

export interface RosterCellData {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: DayStatus;
  processId: string | null;
  processName?: string;
  brandCode?: string;
  role?: 'PRIMARY' | 'BACKUP' | 'TEMPORARY' | null;
  locked: boolean;
  source: string;
  note?: string | null;
  conflicts?: Conflict[];
}

export type RosterViewMode = 'COMPANY' | 'PODS' | 'BRANDS' | 'PROCESSES' | 'EMPLOYEES';
