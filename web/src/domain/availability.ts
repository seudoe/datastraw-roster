/**
 * Pure Employee Availability & Forced States Resolution for RosterIQ
 * Resolves forced leave, comp-off, holiday closures, and contract unavailable weekdays.
 */

import { getWeekday, isDateInRange } from './dates';
import { isHolidayForBrand } from './calendar';
import type {
  AbsenceModel,
  AssignmentModel,
  AvailabilityState,
  BrandModel,
  DayStatus,
  EmployeeModel,
  HolidayModel,
  OperatingCalendarModel,
  ProcessModel,
} from './types';

export interface AvailabilityContext {
  absences: AbsenceModel[];
  assignments: AssignmentModel[];
  processes: ProcessModel[];
  brands: BrandModel[];
  calendars: OperatingCalendarModel[];
  holidays: HolidayModel[];
}

/**
 * Resolves an employee's availability state for a specific date.
 * Returns:
 * - FORCED_L: Approved leave / sick / other absence
 * - FORCED_C: Approved comp-off
 * - UNAVAILABLE_WEEKDAY: Hard contractual unavailable weekday
 * - FORCED_H: All assigned primary processes closed due to holiday
 * - FREE: Available to be scheduled
 */
export function resolveAvailability(
  employee: EmployeeModel,
  date: string,
  context: AvailabilityContext,
): { state: AvailabilityState; forcedStatus?: DayStatus; reason?: string } {
  // 1. Check for approved absences
  const approvedAbsence = context.absences.find(
    (a) =>
      a.employeeId === employee.id &&
      a.status === 'APPROVED' &&
      isDateInRange(date, a.startDate, a.endDate),
  );

  if (approvedAbsence) {
    if (approvedAbsence.type === 'COMP_OFF') {
      return {
        state: 'FORCED_C',
        forcedStatus: 'COMP_OFF',
        reason: approvedAbsence.reason || 'Approved Comp-off',
      };
    }
    return {
      state: 'FORCED_L',
      forcedStatus: 'LEAVE',
      reason: approvedAbsence.reason || `Approved ${approvedAbsence.type}`,
    };
  }

  const weekday = getWeekday(date);

  // 2. Check for contractual blocked weekdays (HARD)
  if (employee.unavailableWeekdays.includes(weekday)) {
    return {
      state: 'UNAVAILABLE_WEEKDAY',
      forcedStatus: 'WEEKLY_OFF',
      reason: `Contractual unavailable weekday (${weekday})`,
    };
  }

  // 3. Check for operational holiday closure
  // If an employee is PRIMARY on processes, and ALL their primary processes are closed specifically because of a holiday
  const primaryAssignments = context.assignments.filter(
    (a) => a.employeeId === employee.id && a.role === 'PRIMARY',
  );

  if (primaryAssignments.length > 0) {
    const allPrimaryOnHoliday = primaryAssignments.every((assignment) => {
      const process = context.processes.find((p) => p.id === assignment.processId);
      if (!process) return false;
      const brand = context.brands.find((b) => b.id === process.brandId);
      if (!brand) return false;
      const calId = process.calendarId || brand.calendarId;
      const cal = context.calendars.find((c) => c.id === calId);
      if (!cal || !cal.observesHolidays) return false;

      return isHolidayForBrand(date, brand.id, context.holidays);
    });

    if (allPrimaryOnHoliday) {
      return {
        state: 'FORCED_H',
        forcedStatus: 'HOLIDAY',
        reason: 'Company / Brand Holiday (All primary processes closed)',
      };
    }
  }

  // 4. Fully available
  return {
    state: 'FREE',
  };
}
