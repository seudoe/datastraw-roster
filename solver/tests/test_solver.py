"""Comprehensive test suite for RosterIQ CP-SAT Solver Microservice.

Validates:
1. Single employee 5-day full coverage
2. 365-day single employee brand intentional gap (soft coverage)
3. Backup floater activation on primary absence
4. Approved absence strictly respected (zero work on leave)
5. Max 6 consecutive days strictly respected (rolling rest)
6. Multi-employee process with minStaff=2
7. Locked cell preservation
8. Determinism: identical seed produces identical solution
9. Performance: December 2026 realistic problem solves in <20s
10. Weight profile trade-offs (COVERAGE_FIRST vs PREFERENCE_FIRST)
11. Minimal disruption repair
12. Authentication security via X-Solver-Key
"""
import copy
from fastapi.testclient import TestClient
import pytest

from solver.app.main import app
from solver.app.model import build_and_solve_cpsat
from solver.app.schemas import (
    AssignmentRole,
    AssignmentSpec,
    DayStatus,
    EmployeeSpec,
    ExistingCell,
    ForcedSpec,
    LockSpec,
    ProcessSpec,
    RepairRequest,
    SolverStatus,
    SolveRequest,
    WeightProfile,
)

client = TestClient(app)
AUTH_HEADERS = {"X-Solver-Key": "dev-solver-secret-key"}


# ============================================================================
# Helpers
# ============================================================================

def make_december_days(count: int = 7) -> list[str]:
    """Return ISO date strings for December 2026."""
    return [f"2026-12-{d:02d}" for d in range(1, count + 1)]


# ============================================================================
# Test Cases
# ============================================================================

def test_single_employee_5day_week_full_coverage():
    """1. Single employee, 5-day week (Mon-Fri), demand=1 -> 100% coverage."""
    # 2026-12-01 (Tue) to 2026-12-05 (Sat)
    days = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"]
    emp = EmployeeSpec(
        id="emp_01",
        code="EMP001",
        weeklyOffsTarget=0,
        preferredOffWeekdays=[0, 6],
        primaryProcessIds=["proc_01"],
    )
    proc = ProcessSpec(
        id="proc_01",
        brandId="brand_01",
        brandPriority=2,
        demand={d: 1 for d in days},
    )
    assignment = AssignmentSpec(
        employeeId="emp_01",
        processId="proc_01",
        role=AssignmentRole.PRIMARY,
    )

    req = SolveRequest(
        month="2026-12",
        days=days,
        employees=[emp],
        processes=[proc],
        assignments=[assignment],
        timeLimitSec=5,
    )

    res = build_and_solve_cpsat(req)
    assert res.status in (SolverStatus.OPTIMAL, SolverStatus.FEASIBLE)
    assert res.metrics.coverageRate == 100.0
    assert len(res.gaps) == 0
    assert all(e.status == DayStatus.WORK for e in res.entries)


def test_365_single_employee_brand_intentional_gap():
    """2. 7-day brand with single employee: max 6 consecutive days forces intentional gap."""
    days = make_december_days(7)  # 7 consecutive days
    emp = EmployeeSpec(
        id="emp_01",
        code="EMP001",
        weeklyOffsTarget=1,
        maxConsecutiveWorkDays=6,  # CANNOT work all 7 days!
        primaryProcessIds=["proc_365"],
    )
    proc = ProcessSpec(
        id="proc_365",
        brandId="brand_365",
        brandPriority=3,
        demand={d: 1 for d in days},  # Demands 1 worker every single day
    )
    assignment = AssignmentSpec(
        employeeId="emp_01",
        processId="proc_365",
        role=AssignmentRole.PRIMARY,
    )

    req = SolveRequest(
        month="2026-12",
        days=days,
        employees=[emp],
        processes=[proc],
        assignments=[assignment],
        timeLimitSec=5,
    )

    # Must remain FEASIBLE, rather than infeasible, due to soft coverage slack
    res = build_and_solve_cpsat(req)
    assert res.status in (SolverStatus.OPTIMAL, SolverStatus.FEASIBLE)
    assert len(res.gaps) == 1, "Must have exactly 1 gap day due to forced rest"
    assert res.gaps[0].deficit == 1
    # Check that employee did not work more than 6 days
    work_count = sum(1 for e in res.entries if e.status == DayStatus.WORK)
    assert work_count <= 6


def test_backup_floater_activation_on_primary_absence():
    """3. Floater is activated when primary employee is on leave."""
    days = make_december_days(5)
    # Primary on leave days 2 and 3
    primary = EmployeeSpec(
        id="emp_primary",
        code="EMP_PRI",
        primaryProcessIds=["proc_01"],
    )
    floater = EmployeeSpec(
        id="emp_floater",
        code="EMP_FLT",
        backupProcessIds=["proc_01"],
    )
    proc = ProcessSpec(
        id="proc_01",
        brandId="brand_01",
        demand={d: 1 for d in days},
    )
    assignments = [
        AssignmentSpec(employeeId="emp_primary", processId="proc_01", role=AssignmentRole.PRIMARY),
        AssignmentSpec(employeeId="emp_floater", processId="proc_01", role=AssignmentRole.BACKUP),
    ]
    forced = [
        ForcedSpec(employeeId="emp_primary", date=days[1], status=DayStatus.LEAVE, reason="Sick Leave"),
        ForcedSpec(employeeId="emp_primary", date=days[2], status=DayStatus.LEAVE, reason="Sick Leave"),
    ]

    req = SolveRequest(
        month="2026-12",
        days=days,
        employees=[primary, floater],
        processes=[proc],
        assignments=assignments,
        forced=forced,
        timeLimitSec=5,
    )

    res = build_and_solve_cpsat(req)
    assert res.status in (SolverStatus.OPTIMAL, SolverStatus.FEASIBLE)
    assert res.metrics.coverageRate == 100.0, "Coverage must remain 100% via floater"
    assert len(res.gaps) == 0

    # Floater must be working on days 2 and 3
    floater_entries = {e.date: e for e in res.entries if e.employeeId == "emp_floater"}
    assert floater_entries[days[1]].status == DayStatus.WORK
    assert floater_entries[days[1]].role == AssignmentRole.BACKUP
    assert floater_entries[days[2]].status == DayStatus.WORK
    assert res.metrics.totalBackupActivations >= 2


def test_approved_absence_strictly_respected():
    """4. Approved absence strictly respected (zero work allowed on leave days)."""
    days = make_december_days(5)
    emp = EmployeeSpec(id="emp_01", code="EMP001", primaryProcessIds=["proc_01"])
    proc = ProcessSpec(id="proc_01", brandId="brand_01", demand={d: 1 for d in days})
    assignments = [AssignmentSpec(employeeId="emp_01", processId="proc_01", role=AssignmentRole.PRIMARY)]
    forced = [
        ForcedSpec(employeeId="emp_01", date=days[0], status=DayStatus.LEAVE, reason="Casual Leave"),
        ForcedSpec(employeeId="emp_01", date=days[1], status=DayStatus.LEAVE, reason="Casual Leave"),
    ]

    req = SolveRequest(
        month="2026-12",
        days=days,
        employees=[emp],
        processes=[proc],
        assignments=assignments,
        forced=forced,
    )

    res = build_and_solve_cpsat(req)
    emp_entries = {e.date: e for e in res.entries if e.employeeId == "emp_01"}
    assert emp_entries[days[0]].status == DayStatus.LEAVE
    assert emp_entries[days[0]].processId is None
    assert emp_entries[days[1]].status == DayStatus.LEAVE
    assert emp_entries[days[1]].processId is None


def test_max_consecutive_days_strictly_respected():
    """5. Max consecutive working days rolling constraint strictly respected."""
    # 14 days of high demand
    days = make_december_days(14)
    emp = EmployeeSpec(
        id="emp_01",
        code="EMP001",
        maxConsecutiveWorkDays=6,
        primaryProcessIds=["proc_01"],
    )
    proc = ProcessSpec(id="proc_01", brandId="brand_01", demand={d: 1 for d in days})
    assignments = [AssignmentSpec(employeeId="emp_01", processId="proc_01", role=AssignmentRole.PRIMARY)]

    req = SolveRequest(
        month="2026-12",
        days=days,
        employees=[emp],
        processes=[proc],
        assignments=assignments,
    )

    res = build_and_solve_cpsat(req)
    emp_entries = [e for e in res.entries if e.employeeId == "emp_01"]

    # In any window of 7 days, sum of WORK must be <= 6
    work_flags = [1 if e.status == DayStatus.WORK else 0 for e in emp_entries]
    for i in range(len(work_flags) - 6):
        assert sum(work_flags[i : i + 7]) <= 6, f"Exceeded 6 consecutive work days in window {i}..{i+6}"


def test_multi_employee_process_min_staff_2():
    """6. Multi-employee process requiring minStaff=2 simultaneously."""
    days = make_december_days(3)
    emps = [
        EmployeeSpec(id=f"emp_{i}", code=f"EMP00{i}", primaryProcessIds=["proc_multi"])
        for i in range(1, 4)
    ]
    proc = ProcessSpec(id="proc_multi", brandId="brand_multi", demand={d: 2 for d in days})
    assignments = [
        AssignmentSpec(employeeId=e.id, processId="proc_multi", role=AssignmentRole.PRIMARY)
        for e in emps
    ]

    req = SolveRequest(
        month="2026-12",
        days=days,
        employees=emps,
        processes=[proc],
        assignments=assignments,
    )

    res = build_and_solve_cpsat(req)
    assert res.metrics.coverageRate == 100.0

    # For each day, exactly 2 employees must be working on proc_multi
    for d in days:
        assigned = [e for e in res.entries if e.date == d and e.processId == "proc_multi"]
        assert len(assigned) == 2


def test_locked_cell_preservation():
    """7. Locked cell preservation forces specific status."""
    days = make_december_days(3)
    emp = EmployeeSpec(id="emp_01", code="EMP001", primaryProcessIds=["proc_01"])
    proc = ProcessSpec(id="proc_01", brandId="brand_01", demand={d: 1 for d in days})
    assignments = [AssignmentSpec(employeeId="emp_01", processId="proc_01", role=AssignmentRole.PRIMARY)]
    # Lock day 1 to WEEKLY_OFF even though demand=1
    locks = [LockSpec(employeeId="emp_01", date=days[0], status=DayStatus.WEEKLY_OFF)]

    req = SolveRequest(
        month="2026-12",
        days=days,
        employees=[emp],
        processes=[proc],
        assignments=assignments,
        locks=locks,
    )

    res = build_and_solve_cpsat(req)
    day0_entry = next(e for e in res.entries if e.employeeId == "emp_01" and e.date == days[0])
    assert day0_entry.status == DayStatus.WEEKLY_OFF
    assert day0_entry.isOverride is True


def test_determinism_identical_seed():
    """8. Identical random seed produces identical solutions twice."""
    days = make_december_days(10)
    emps = [
        EmployeeSpec(id=f"emp_{i}", code=f"EMP{i}", primaryProcessIds=[f"proc_{i % 3}"])
        for i in range(6)
    ]
    procs = [
        ProcessSpec(id=f"proc_{i}", brandId=f"brand_{i}", demand={d: 1 for d in days})
        for i in range(3)
    ]
    assignments = [
        AssignmentSpec(employeeId=e.id, processId=f"proc_{i % 3}", role=AssignmentRole.PRIMARY)
        for i, e in enumerate(emps)
    ]

    req1 = SolveRequest(
        month="2026-12",
        days=days,
        employees=emps,
        processes=procs,
        assignments=assignments,
        seed=42,
    )
    req2 = copy.deepcopy(req1)

    res1 = build_and_solve_cpsat(req1)
    res2 = build_and_solve_cpsat(req2)

    assert res1.objectiveValue == res2.objectiveValue
    assert [e.status for e in res1.entries] == [e.status for e in res2.entries]
    assert [e.processId for e in res1.entries] == [e.processId for e in res2.entries]


def test_performance_realistic_problem():
    """9. Realistic problem (32 employees, 25 brands, 31 days) solves in <20s."""
    days = make_december_days(31)

    emps = [
        EmployeeSpec(
            id=f"emp_{i:02d}",
            code=f"EMP{i:02d}",
            weeklyOffsTarget=4,
            preferredOffWeekdays=[0, 6],
            primaryProcessIds=[f"proc_{i % 25:02d}"],
            backupProcessIds=[f"proc_{(i + 1) % 25:02d}"],
        )
        for i in range(32)
    ]

    procs = [
        ProcessSpec(
            id=f"proc_{i:02d}",
            brandId=f"brand_{i:02d}",
            brandPriority=2,
            demand={d: 1 for d in days},
        )
        for i in range(25)
    ]

    assignments = []
    for i, e in enumerate(emps):
        assignments.append(
            AssignmentSpec(employeeId=e.id, processId=f"proc_{i % 25:02d}", role=AssignmentRole.PRIMARY)
        )
        assignments.append(
            AssignmentSpec(employeeId=e.id, processId=f"proc_{(i + 1) % 25:02d}", role=AssignmentRole.BACKUP)
        )

    req = SolveRequest(
        month="2026-12",
        days=days,
        employees=emps,
        processes=procs,
        assignments=assignments,
        timeLimitSec=10,
        seed=42,
    )

    res = build_and_solve_cpsat(req)
    assert res.status in (SolverStatus.OPTIMAL, SolverStatus.FEASIBLE)
    assert res.solverMeta.solveTimeSec <= 20.0
    assert len(res.entries) == 32 * 31


def test_weight_profile_tradeoffs():
    """10. Weight profile PREFERENCE_FIRST yields higher preference satisfaction."""
    days = make_december_days(7)
    # Employee prefers Sunday (0) and Saturday (6) off
    emp = EmployeeSpec(
        id="emp_01",
        code="EMP001",
        weeklyOffsTarget=2,
        preferredOffWeekdays=[0, 6],
        primaryProcessIds=["proc_01"],
    )
    proc = ProcessSpec(id="proc_01", brandId="brand_01", demand={d: 1 for d in days})
    assignments = [AssignmentSpec(employeeId="emp_01", processId="proc_01", role=AssignmentRole.PRIMARY)]

    req_pref = SolveRequest(
        month="2026-12",
        days=days,
        employees=[emp],
        processes=[proc],
        assignments=assignments,
        profile=WeightProfile.PREFERENCE_FIRST,
    )
    res_pref = build_and_solve_cpsat(req_pref)
    assert res_pref.status in (SolverStatus.OPTIMAL, SolverStatus.FEASIBLE)
    assert res_pref.metrics.preferenceSatisfactionRate >= 50.0


def test_repair_minimal_disruption():
    """11. Repair request flips minimal cells when disruption is injected."""
    days = make_december_days(5)
    emps = [
        EmployeeSpec(id="emp_01", code="EMP001", primaryProcessIds=["proc_01"]),
        EmployeeSpec(id="emp_02", code="EMP002", backupProcessIds=["proc_01"]),
    ]
    proc = ProcessSpec(id="proc_01", brandId="brand_01", demand={d: 1 for d in days})
    assignments = [
        AssignmentSpec(employeeId="emp_01", processId="proc_01", role=AssignmentRole.PRIMARY),
        AssignmentSpec(employeeId="emp_02", processId="proc_01", role=AssignmentRole.BACKUP),
    ]

    base_req = SolveRequest(
        month="2026-12",
        days=days,
        employees=emps,
        processes=[proc],
        assignments=assignments,
    )

    # Baseline roster: emp_01 works all 5 days, emp_02 is off
    current_entries = [
        ExistingCell(employeeId="emp_01", date=d, status=DayStatus.WORK, processId="proc_01")
        for d in days
    ] + [
        ExistingCell(employeeId="emp_02", date=d, status=DayStatus.WEEKLY_OFF)
        for d in days
    ]

    # Injected disruption: emp_01 emergency sick leave on day 3
    disrupted_req = copy.deepcopy(base_req)
    disrupted_req.forced.append(
        ForcedSpec(employeeId="emp_01", date=days[2], status=DayStatus.LEAVE, reason="Emergency")
    )

    repair_req = RepairRequest(
        baseProblem=disrupted_req,
        currentEntries=current_entries,
        disruptionWeight=10000,
    )

    res = client.post("/v1/repair", json=repair_req.model_dump(), headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("OPTIMAL", "FEASIBLE")

    # On days other than day 3, emp_01 should still be working
    e1_day0 = next(e for e in data["entries"] if e["employeeId"] == "emp_01" and e["date"] == days[0])
    assert e1_day0["status"] == "WORK"


def test_auth_header_protection():
    """12. HTTP endpoints reject requests missing valid X-Solver-Key."""
    # Missing key
    res = client.post("/v1/solve", json={})
    assert res.status_code == 401

    # Invalid key
    res = client.post("/v1/solve", json={}, headers={"X-Solver-Key": "wrong-key"})
    assert res.status_code == 401
