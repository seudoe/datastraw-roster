/**
 * Full Roster Validator
 * Runs the comprehensive conflict taxonomy against any candidate roster and incorporates supervisor acknowledgments.
 */
import { getDaysInMonth } from '@/domain/dates';
import { validateCoverage } from './rules/coverage';
import { validateAbsences } from './rules/absences';
import { validateConsecutiveDays } from './rules/consecutive';
import { validateAvailabilityAndPreferences } from './rules/availability';
import { validateBackupOverload, type BackupDutyValidationInput } from './rules/backupOverload';
import { validateCascadeGaps } from './rules/cascade';
import { validateWeeklyOffs } from './rules/weeklyOffs';
import type {
  Conflict,
  ConflictAckInput,
  RosterEntryValidationInput,
  ValidationResult,
} from './types';
import type { DomainSnapshot } from '@/domain/types';

export function validateRoster(
  month: string,
  entries: RosterEntryValidationInput[],
  backupDuties: BackupDutyValidationInput[] = [],
  snapshot: DomainSnapshot,
  acknowledgments: ConflictAckInput[] = [],
): ValidationResult {
  const days = getDaysInMonth(month);

  const rawConflicts: Conflict[] = [
    ...validateCoverage(days, entries, snapshot),
    ...validateAbsences(entries, snapshot),
    ...validateConsecutiveDays(days, entries, snapshot),
    ...validateAvailabilityAndPreferences(entries, snapshot),
    ...validateBackupOverload(backupDuties, snapshot),
    ...validateCascadeGaps(entries, snapshot),
    ...validateWeeklyOffs(month, entries, snapshot),
  ];

  // Map acknowledgments by fingerprint
  const ackMap = new Map<string, ConflictAckInput>();
  for (const ack of acknowledgments) {
    ackMap.set(ack.fingerprint, ack);
  }

  // Attach acknowledgment state
  const conflicts: Conflict[] = rawConflicts.map((c) => {
    const ack = ackMap.get(c.id);
    if (ack) {
      return {
        ...c,
        acknowledged: true,
        ackReason: ack.reason,
      };
    }
    return c;
  });

  // Calculate counts (unacknowledged errors block publish)
  let errorCount = 0;
  let warnCount = 0;
  let infoCount = 0;

  for (const c of conflicts) {
    if (c.severity === 'ERROR') {
      if (!c.acknowledged) {
        errorCount++;
      }
    } else if (c.severity === 'WARN') {
      warnCount++;
    } else if (c.severity === 'INFO') {
      infoCount++;
    }
  }

  return {
    isValid: errorCount === 0,
    errorCount,
    warnCount,
    infoCount,
    conflicts,
  };
}
