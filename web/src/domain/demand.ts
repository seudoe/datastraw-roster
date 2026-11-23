/**
 * Pure Staffing Demand Resolution Logic for RosterIQ
 * Resolves daily required headcount per process based on calendar and coverage rules.
 */

import { getWeekday } from './dates';
import { isOperating, type CalendarLookupContext } from './calendar';
import type { CoverageRuleModel, ProcessModel } from './types';

export interface DemandResolutionContext extends CalendarLookupContext {
  coverageRules: CoverageRuleModel[];
}

/**
 * Resolves the required minimum staffing for a process on a given date.
 * Precedence:
 * 1. If not operating -> 0
 * 2. Date-specific rule (rule.date === date)
 * 3. Weekday-specific rule (rule.weekday === getWeekday(date))
 * 4. Process defaultMinStaff
 */
export function resolveDemand(
  process: ProcessModel,
  date: string,
  context: DemandResolutionContext,
): number {
  // If the process is closed on this date, demand is strictly 0
  if (!isOperating(process, date, context)) {
    return 0;
  }

  const processRules = context.coverageRules.filter((r) => r.processId === process.id);

  // 1. Date-specific rule has highest precedence
  const dateRule = processRules.find((r) => r.date === date);
  if (dateRule) {
    return Math.max(0, dateRule.minStaff);
  }

  // 2. Weekday-specific rule has second precedence
  const weekday = getWeekday(date);
  const weekdayRule = processRules.find((r) => r.weekday === weekday && !r.date);
  if (weekdayRule) {
    return Math.max(0, weekdayRule.minStaff);
  }

  // 3. Default minimum staff
  return Math.max(0, process.defaultMinStaff);
}

/**
 * Resolves demand matrix for all processes across an array of dates.
 * Returns: Record<processId, Record<date, minStaff>>
 */
export function resolveAllDemands(
  processes: ProcessModel[],
  days: string[],
  context: DemandResolutionContext,
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  for (const process of processes) {
    result[process.id] = {};
    for (const day of days) {
      result[process.id][day] = resolveDemand(process, day, context);
    }
  }

  return result;
}
