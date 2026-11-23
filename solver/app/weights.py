"""Weight profiles for CP-SAT multi-objective optimization.

Translates high-level business modes (BALANCED, COVERAGE_FIRST, etc.)
into integer weights for the CP-SAT objective function.
"""
from dataclasses import dataclass
import sys
from pathlib import Path

# Ensure current package, solver directory, and repo root are on sys.path
_this_dir = Path(__file__).resolve().parent
for _p in (_this_dir, _this_dir.parent, _this_dir.parent.parent):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

try:
    from .schemas import WeightProfile
except (ImportError, ValueError):
    try:
        from app.schemas import WeightProfile
    except (ImportError, ValueError):
        try:
            from solver.app.schemas import WeightProfile
        except (ImportError, ValueError):
            from schemas import WeightProfile


@dataclass(frozen=True)
class SolverWeights:
    w_gap_base: int  # Multiplied by brandPriority (1..3)
    w_pref_violation: int  # Working on a preferred off weekday
    w_backup_activation: int  # Assigning a backup instead of primary
    w_floater_standby: int  # Standby duty assignment
    w_off_deficit: int  # Failing to grant weekly off target
    w_consecutive_fatigue: int  # Pressure to avoid back-to-back 6-day runs


WEIGHT_PROFILES = {
    WeightProfile.BALANCED: SolverWeights(
        w_gap_base=100_000,
        w_pref_violation=100,
        w_backup_activation=30,
        w_floater_standby=10,
        w_off_deficit=1_000,
        w_consecutive_fatigue=5,
    ),
    WeightProfile.COVERAGE_FIRST: SolverWeights(
        w_gap_base=500_000,
        w_pref_violation=20,
        w_backup_activation=10,
        w_floater_standby=5,
        w_off_deficit=500,
        w_consecutive_fatigue=1,
    ),
    WeightProfile.FAIRNESS_FIRST: SolverWeights(
        w_gap_base=100_000,
        w_pref_violation=100,
        w_backup_activation=20,
        w_floater_standby=10,
        w_off_deficit=5_000,
        w_consecutive_fatigue=50,
    ),
    WeightProfile.PREFERENCE_FIRST: SolverWeights(
        w_gap_base=100_000,
        w_pref_violation=1_500,
        w_backup_activation=50,
        w_floater_standby=10,
        w_off_deficit=1_000,
        w_consecutive_fatigue=10,
    ),
}


def get_weights(profile: WeightProfile) -> SolverWeights:
    """Return weights dataclass for given profile."""
    return WEIGHT_PROFILES.get(profile, WEIGHT_PROFILES[WeightProfile.BALANCED])
