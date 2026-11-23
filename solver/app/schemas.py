"""Pydantic v2 schemas for RosterIQ CP-SAT optimization service.

Strict contract between the Next.js TypeScript backend and the Python solver.
"""
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class AssignmentRole(str, Enum):
    PRIMARY = "PRIMARY"
    BACKUP = "BACKUP"
    TEMPORARY = "TEMPORARY"


class DayStatus(str, Enum):
    WORK = "WORK"
    WEEKLY_OFF = "WEEKLY_OFF"
    HOLIDAY = "HOLIDAY"
    LEAVE = "LEAVE"
    COMP_OFF = "COMP_OFF"


class SolverStatus(str, Enum):
    OPTIMAL = "OPTIMAL"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    UNKNOWN = "UNKNOWN"


class WeightProfile(str, Enum):
    BALANCED = "BALANCED"
    COVERAGE_FIRST = "COVERAGE_FIRST"
    FAIRNESS_FIRST = "FAIRNESS_FIRST"
    PREFERENCE_FIRST = "PREFERENCE_FIRST"


# ============================================================================
# Input Request Models
# ============================================================================

class EmployeeSpec(BaseModel):
    id: str
    code: str
    weeklyOffsTarget: int = Field(default=4, ge=0)
    preferredOffWeekdays: List[int] = Field(default_factory=list)  # 0=Sun..6=Sat or 1=Mon..7=Sun
    maxConsecutiveWorkDays: int = Field(default=6, ge=1)
    maxBackupBrandsPerDay: int = Field(default=2, ge=1)
    primaryProcessIds: List[str] = Field(default_factory=list)
    backupProcessIds: List[str] = Field(default_factory=list)


class ProcessSpec(BaseModel):
    id: str
    brandId: str
    brandPriority: int = Field(default=2, ge=1, le=3)
    demand: Dict[str, int] = Field(default_factory=dict)  # date -> minStaff (0 if closed)


class AssignmentSpec(BaseModel):
    employeeId: str
    processId: str
    role: AssignmentRole


class ForcedSpec(BaseModel):
    employeeId: str
    date: str  # YYYY-MM-DD
    status: DayStatus
    reason: str = "Forced state"


class LockSpec(BaseModel):
    employeeId: str
    date: str  # YYYY-MM-DD
    status: DayStatus
    processId: Optional[str] = None


class SolveRequest(BaseModel):
    month: str = Field(description="YYYY-MM format, e.g. 2026-12")
    days: List[str] = Field(description="List of ISO date strings YYYY-MM-DD")
    employees: List[EmployeeSpec]
    processes: List[ProcessSpec]
    assignments: List[AssignmentSpec]
    forced: List[ForcedSpec] = Field(default_factory=list)
    locks: List[LockSpec] = Field(default_factory=list)
    profile: WeightProfile = Field(default=WeightProfile.BALANCED)
    timeLimitSec: int = Field(default=20, ge=1, le=120)
    seed: int = Field(default=42)


# ============================================================================
# Output Response Models
# ============================================================================

class RosterEntryOut(BaseModel):
    employeeId: str
    date: str
    status: DayStatus
    processId: Optional[str] = None
    role: Optional[AssignmentRole] = None
    isOverride: bool = False
    note: Optional[str] = None


class BackupDutyOut(BaseModel):
    employeeId: str
    brandId: str
    date: str
    role: str = "STANDBY"  # STANDBY or ACTIVE
    reason: Optional[str] = None


class CoverageGapOut(BaseModel):
    processId: str
    brandId: str
    date: str
    requiredStaff: int
    actualStaff: int
    deficit: int
    brandPriority: int


class MetricsOut(BaseModel):
    coverageRate: float = Field(description="Percentage 0.0 - 100.0 of required staffing fulfilled")
    totalGaps: int
    totalBackupActivations: int
    preferenceSatisfactionRate: float = Field(description="Percentage 0.0 - 100.0")
    maxConsecutiveDaysObserved: int
    weekendSpreadMaxDelta: int


class SolverMetaOut(BaseModel):
    status: SolverStatus
    objectiveValue: float
    solveTimeSec: float
    numVariables: int
    numConstraints: int
    deterministicSeed: int
    profile: WeightProfile


class SolveResponse(BaseModel):
    status: SolverStatus
    objectiveValue: float
    entries: List[RosterEntryOut]
    backupDuties: List[BackupDutyOut]
    gaps: List[CoverageGapOut]
    metrics: MetricsOut
    solverMeta: SolverMetaOut


# ============================================================================
# Repair (Minimal Disruption) Request / Response
# ============================================================================

class ExistingCell(BaseModel):
    employeeId: str
    date: str
    status: DayStatus
    processId: Optional[str] = None


class RepairRequest(BaseModel):
    baseProblem: SolveRequest
    currentEntries: List[ExistingCell]
    disruptionWeight: int = Field(default=5000, description="Penalty for flipping a cell away from baseline")
