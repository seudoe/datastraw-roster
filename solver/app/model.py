"""CP-SAT formulation for RosterIQ shift scheduling and minimal disruption repair.

Formulates constraints and multi-objective optimization using Google OR-Tools CP-SAT.
Guarantees feasibility via soft coverage slack with explicit conflict accounting.
"""
from datetime import date
import time
from typing import Dict, List, Optional, Set, Tuple

from ortools.sat.python import cp_model

try:
    from .schemas import (
        AssignmentRole,
        BackupDutyOut,
        CoverageGapOut,
        DayStatus,
        MetricsOut,
        RepairRequest,
        RosterEntryOut,
        SolverMetaOut,
        SolverStatus,
        SolveRequest,
        SolveResponse,
    )
    from .weights import get_weights
except ImportError:
    from solver.app.schemas import (
        AssignmentRole,
        BackupDutyOut,
        CoverageGapOut,
        DayStatus,
        MetricsOut,
        RepairRequest,
        RosterEntryOut,
        SolverMetaOut,
        SolverStatus,
        SolveRequest,
        SolveResponse,
    )
    from solver.app.weights import get_weights


def get_weekday_from_iso(date_str: str) -> int:
    """Return weekday in 0=Sun..6=Sat format matching domain core."""
    d = date.fromisoformat(date_str)
    # Python isoweekday: 1=Mon..7=Sun -> (isoweekday % 7): Sun=0, Mon=1, ..., Sat=6
    return d.isoweekday() % 7


def is_weekend_iso(date_str: str) -> bool:
    """Check if date is Saturday (6) or Sunday (0)."""
    wd = get_weekday_from_iso(date_str)
    return wd == 0 or wd == 6


def build_and_solve_cpsat(
    request: SolveRequest,
    current_entries: Optional[List] = None,
    disruption_weight: int = 5000,
) -> SolveResponse:
    """Build and solve CP-SAT model for given SolveRequest."""
    start_time = time.perf_counter()
    model = cp_model.CpModel()
    weights = get_weights(request.profile)

    days = request.days
    num_days = len(days)
    day_to_idx = {day: idx for idx, day in enumerate(days)}

    # Index structures
    emp_by_id = {e.id: e for e in request.employees}
    proc_by_id = {p.id: p for p in request.processes}

    # Assignment roles mapping: (emp_id, proc_id) -> AssignmentRole
    assignment_roles: Dict[Tuple[str, str], AssignmentRole] = {}
    emp_to_procs: Dict[str, Set[str]] = {e.id: set() for e in request.employees}
    proc_to_emps: Dict[str, Set[str]] = {p.id: set() for p in request.processes}

    for a in request.assignments:
        assignment_roles[(a.employeeId, a.processId)] = a.role
        if a.employeeId in emp_to_procs and a.processId in proc_to_emps:
            emp_to_procs[a.employeeId].add(a.processId)
            proc_to_emps[a.processId].add(a.employeeId)

    # Forced states lookup: (emp_id, day) -> ForcedSpec
    forced_lookup = {(f.employeeId, f.date): f for f in request.forced}

    # Locks lookup: (emp_id, day) -> LockSpec
    locks_lookup = {(l.employeeId, l.date): l for l in request.locks}

    # ========================================================================
    # Decision Variables
    # ========================================================================

    # x[e, p, d] in {0, 1}: employee e works process p on date d
    x: Dict[Tuple[str, str, str], cp_model.IntVar] = {}
    # w[e, d] in {0, 1}: employee e works on date d
    w: Dict[Tuple[str, str], cp_model.IntVar] = {}

    for e in request.employees:
        for d in days:
            w_var = model.NewBoolVar(f"w_{e.code}_{d}")
            w[(e.id, d)] = w_var
            emp_procs_on_day = []

            for p_id in sorted(emp_to_procs.get(e.id, set())):
                x_var = model.NewBoolVar(f"x_{e.code}_{p_id[:6]}_{d}")
                x[(e.id, p_id, d)] = x_var
                emp_procs_on_day.append(x_var)

            # At most 1 process per day, and w[e, d] == sum(x[e, p, d])
            if emp_procs_on_day:
                model.Add(w_var == sum(emp_procs_on_day))
            else:
                model.Add(w_var == 0)

    # gap[p, d] >= 0: coverage slack variable
    gaps: Dict[Tuple[str, str], cp_model.IntVar] = {}
    for p in request.processes:
        for d in days:
            demand = p.demand.get(d, 0)
            gap_var = model.NewIntVar(0, max(demand, 1), f"gap_{p.id[:6]}_{d}")
            gaps[(p.id, d)] = gap_var

            # Assigned workers on this process on day d
            qualified_emps = sorted(proc_to_emps.get(p.id, set()))
            assigned_vars = [x[(e_id, p.id, d)] for e_id in qualified_emps if (e_id, p.id, d) in x]

            if demand > 0:
                # Coverage constraint with slack: sum(x) + gap == demand
                model.Add(sum(assigned_vars) + gap_var == demand)
                model.Add(sum(assigned_vars) <= demand)
            else:
                # Process is closed on this day (demand == 0)
                model.Add(gap_var == 0)
                if assigned_vars:
                    model.Add(sum(assigned_vars) == 0)

    # ========================================================================
    # Hard Constraints
    # ========================================================================

    # 1. Forced States (Absences, Holidays, Mandatory Leaves)
    for e in request.employees:
        for d in days:
            forced_spec = forced_lookup.get((e.id, d))
            if forced_spec and forced_spec.status != DayStatus.WORK:
                # Cannot work on approved leave or forced off
                model.Add(w[(e.id, d)] == 0)

    # 2. Locked Cells (Manual supervisor locks)
    for e in request.employees:
        for d in days:
            lock_spec = locks_lookup.get((e.id, d))
            if lock_spec:
                if lock_spec.status == DayStatus.WORK:
                    model.Add(w[(e.id, d)] == 1)
                    if lock_spec.processId and (e.id, lock_spec.processId, d) in x:
                        model.Add(x[(e.id, lock_spec.processId, d)] == 1)
                else:
                    model.Add(w[(e.id, d)] == 0)

    # 3. Max Consecutive Work Days (Rolling Window)
    for e in request.employees:
        max_consec = e.maxConsecutiveWorkDays
        window_size = max_consec + 1
        if window_size <= num_days:
            for start_idx in range(num_days - window_size + 1):
                window_days = days[start_idx : start_idx + window_size]
                # In any window of size (max_consec + 1), at least 1 day must be off
                model.Add(sum(w[(e.id, d)] for d in window_days) <= max_consec)

    # 4. Weekly Offs Target with Soft Deficit
    off_deficits: Dict[str, cp_model.IntVar] = {}
    for e in request.employees:
        target = e.weeklyOffsTarget
        # Total days off = num_days - sum(w)
        # We want num_days - sum(w) + deficit >= target
        deficit_var = model.NewIntVar(0, num_days, f"off_def_{e.code}")
        off_deficits[e.id] = deficit_var
        model.Add(num_days - sum(w[(e.id, d)] for d in days) + deficit_var >= target)

    # ========================================================================
    # Objective Terms
    # ========================================================================
    objective_terms = []

    # A. Unfilled Demand Gaps Penalty (weighted by brand priority 1..3)
    for p in request.processes:
        p_weight = weights.w_gap_base * p.brandPriority
        for d in days:
            if p.demand.get(d, 0) > 0:
                objective_terms.append(p_weight * gaps[(p.id, d)])

    # B. Preferred Off Weekday Violations
    for e in request.employees:
        if e.preferredOffWeekdays:
            pref_set = set(e.preferredOffWeekdays)
            for d in days:
                if get_weekday_from_iso(d) in pref_set:
                    objective_terms.append(weights.w_pref_violation * w[(e.id, d)])

    # C. Backup / Floater Activation Penalty (prefer primary over backup)
    for (e_id, p_id, d), x_var in x.items():
        role = assignment_roles.get((e_id, p_id))
        if role != AssignmentRole.PRIMARY:
            objective_terms.append(weights.w_backup_activation * x_var)

    # D. Weekly Off Deficit Penalty
    for e in request.employees:
        objective_terms.append(weights.w_off_deficit * off_deficits[e.id])

    # E. Minimal Disruption Penalty for Repair Mode
    if current_entries:
        for entry in current_entries:
            key = (entry.employeeId, entry.date)
            if key in w:
                was_working = entry.status == DayStatus.WORK
                if was_working:
                    # Penalize flipping from WORK to OFF: disruption_weight * (1 - w)
                    objective_terms.append(disruption_weight * (1 - w[key]))
                    # Also penalize moving away from original process
                    if entry.processId and (entry.employeeId, entry.processId, entry.date) in x:
                        objective_terms.append((disruption_weight // 2) * (1 - x[(entry.employeeId, entry.processId, entry.date)]))
                else:
                    # Penalize flipping from OFF to WORK: disruption_weight * w
                    objective_terms.append(disruption_weight * w[key])

    # Set Model Objective
    if objective_terms:
        model.Minimize(sum(objective_terms))

    # ========================================================================
    # Solve Configuration
    # ========================================================================
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(request.timeLimitSec)
    solver.parameters.random_seed = request.seed
    solver.parameters.num_workers = 1

    cp_status = solver.Solve(model)
    solve_time = time.perf_counter() - start_time

    # Map solver status
    status_map = {
        cp_model.OPTIMAL: SolverStatus.OPTIMAL,
        cp_model.FEASIBLE: SolverStatus.FEASIBLE,
        cp_model.INFEASIBLE: SolverStatus.INFEASIBLE,
        cp_model.MODEL_INVALID: SolverStatus.UNKNOWN,
        cp_model.UNKNOWN: SolverStatus.UNKNOWN,
    }
    solver_status = status_map.get(cp_status, SolverStatus.UNKNOWN)

    # ========================================================================
    # Extract Solution
    # ========================================================================
    entries_out: List[RosterEntryOut] = []
    backup_duties_out: List[BackupDutyOut] = []
    gaps_out: List[CoverageGapOut] = []

    total_demand = sum(p.demand.get(d, 0) for p in request.processes for d in days)
    total_unfilled = 0
    total_backup_activations = 0
    total_pref_days = 0
    violated_pref_days = 0
    weekend_counts: Dict[str, int] = {e.id: 0 for e in request.employees}
    consec_days_observed: Dict[str, int] = {e.id: 0 for e in request.employees}

    if solver_status in (SolverStatus.OPTIMAL, SolverStatus.FEASIBLE):
        for e in request.employees:
            curr_consec = 0
            for d in days:
                forced_spec = forced_lookup.get((e.id, d))
                is_working = solver.Value(w[(e.id, d)]) == 1

                # Track consecutive days
                if is_working:
                    curr_consec += 1
                    if curr_consec > consec_days_observed[e.id]:
                        consec_days_observed[e.id] = curr_consec
                    if is_weekend_iso(d):
                        weekend_counts[e.id] += 1
                else:
                    curr_consec = 0

                # Track preferred off satisfaction
                if e.preferredOffWeekdays and get_weekday_from_iso(d) in set(e.preferredOffWeekdays):
                    total_pref_days += 1
                    if is_working:
                        violated_pref_days += 1

                # Determine assigned process and role
                assigned_proc_id: Optional[str] = None
                assigned_role: Optional[AssignmentRole] = None

                if is_working:
                    for p_id in sorted(emp_to_procs.get(e.id, set())):
                        if (e.id, p_id, d) in x and solver.Value(x[(e.id, p_id, d)]) == 1:
                            assigned_proc_id = p_id
                            assigned_role = assignment_roles.get((e.id, p_id), AssignmentRole.PRIMARY)
                            break

                # Determine status
                if is_working:
                    day_status = DayStatus.WORK
                    if assigned_role != AssignmentRole.PRIMARY:
                        total_backup_activations += 1
                        proc = proc_by_id.get(assigned_proc_id or "")
                        if proc:
                            backup_duties_out.append(
                                BackupDutyOut(
                                    employeeId=e.id,
                                    brandId=proc.brandId,
                                    date=d,
                                    role="ACTIVE",
                                    reason=f"Active coverage for {proc.brandId}",
                                )
                            )
                elif forced_spec:
                    day_status = forced_spec.status
                else:
                    day_status = DayStatus.WEEKLY_OFF

                entries_out.append(
                    RosterEntryOut(
                        employeeId=e.id,
                        date=d,
                        status=day_status,
                        processId=assigned_proc_id,
                        role=assigned_role,
                        isOverride=bool(locks_lookup.get((e.id, d))),
                        note=forced_spec.reason if forced_spec else None,
                    )
                )

        # Extract coverage gaps
        for p in request.processes:
            for d in days:
                demand = p.demand.get(d, 0)
                deficit = solver.Value(gaps[(p.id, d)])
                if deficit > 0:
                    total_unfilled += deficit
                    gaps_out.append(
                        CoverageGapOut(
                            processId=p.id,
                            brandId=p.brandId,
                            date=d,
                            requiredStaff=demand,
                            actualStaff=demand - deficit,
                            deficit=deficit,
                            brandPriority=p.brandPriority,
                        )
                    )

    # Compute high-level metrics
    coverage_rate = (
        round(((total_demand - total_unfilled) / total_demand) * 100.0, 2)
        if total_demand > 0
        else 100.0
    )
    pref_satisfaction = (
        round(((total_pref_days - violated_pref_days) / total_pref_days) * 100.0, 2)
        if total_pref_days > 0
        else 100.0
    )
    max_consec = max(consec_days_observed.values()) if consec_days_observed else 0
    weekend_vals = list(weekend_counts.values())
    weekend_spread = (max(weekend_vals) - min(weekend_vals)) if weekend_vals else 0

    metrics = MetricsOut(
        coverageRate=coverage_rate,
        totalGaps=len(gaps_out),
        totalBackupActivations=total_backup_activations,
        preferenceSatisfactionRate=pref_satisfaction,
        maxConsecutiveDaysObserved=max_consec,
        weekendSpreadMaxDelta=weekend_spread,
    )

    solver_meta = SolverMetaOut(
        status=solver_status,
        objectiveValue=float(solver.ObjectiveValue()) if solver_status in (SolverStatus.OPTIMAL, SolverStatus.FEASIBLE) else 0.0,
        solveTimeSec=round(solve_time, 3),
        numVariables=model.Proto().variables.__len__(),
        numConstraints=model.Proto().constraints.__len__(),
        deterministicSeed=request.seed,
        profile=request.profile,
    )

    return SolveResponse(
        status=solver_status,
        objectiveValue=solver_meta.objectiveValue,
        entries=entries_out,
        backupDuties=backup_duties_out,
        gaps=gaps_out,
        metrics=metrics,
        solverMeta=solver_meta,
    )
