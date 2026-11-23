"""Connected components graph decomposition for RosterIQ CP-SAT problem.

Partitions the employee-process bipartite assignment graph into disjoint clusters.
Enables independent or parallel solving when pods/brands have zero shared floaters.
"""
from typing import Dict, List, Set, Tuple
import sys
from pathlib import Path

# Ensure current package, solver directory, and repo root are on sys.path
_this_dir = Path(__file__).resolve().parent
for _p in (_this_dir, _this_dir.parent, _this_dir.parent.parent):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

try:
    from .schemas import SolveRequest
except (ImportError, ValueError):
    try:
        from app.schemas import SolveRequest
    except (ImportError, ValueError):
        try:
            from solver.app.schemas import SolveRequest
        except (ImportError, ValueError):
            from schemas import SolveRequest


def find_connected_components(request: SolveRequest) -> List[Tuple[Set[str], Set[str]]]:
    """
    Partition the problem into connected components of (employee_ids, process_ids).
    Two entities are in the same component if connected via any assignment.
    """
    # Adjacency lists
    emp_to_procs: Dict[str, Set[str]] = {e.id: set() for e in request.employees}
    proc_to_emps: Dict[str, Set[str]] = {p.id: set() for p in request.processes}

    for a in request.assignments:
        if a.employeeId in emp_to_procs and a.processId in proc_to_emps:
            emp_to_procs[a.employeeId].add(a.processId)
            proc_to_emps[a.processId].add(a.employeeId)

    visited_emps: Set[str] = set()
    components: List[Tuple[Set[str], Set[str]]] = []

    for emp_id in emp_to_procs:
        if emp_id in visited_emps:
            continue

        comp_emps: Set[str] = set()
        comp_procs: Set[str] = set()
        queue = [emp_id]
        visited_emps.add(emp_id)

        while queue:
            curr_emp = queue.pop(0)
            comp_emps.add(curr_emp)

            for proc_id in emp_to_procs.get(curr_emp, set()):
                if proc_id not in comp_procs:
                    comp_procs.add(proc_id)
                    for next_emp in proc_to_emps.get(proc_id, set()):
                        if next_emp not in visited_emps:
                            visited_emps.add(next_emp)
                            queue.append(next_emp)

        components.append((comp_emps, comp_procs))

    # Also capture any processes that had zero employee assignments
    unassigned_procs = set(p.id for p in request.processes) - {p for _, procs in components for p in procs}
    if unassigned_procs:
        components.append((set(), unassigned_procs))

    return components
