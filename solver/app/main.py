"""FastAPI application for RosterIQ CP-SAT optimization service.

Provides stateless endpoints for roster generation and minimal-disruption repair.
"""
import os
from typing import Optional
from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel

from solver.app.model import build_and_solve_cpsat
from solver.app.schemas import RepairRequest, SolveRequest, SolveResponse

app = FastAPI(
    title="RosterIQ CP-SAT Solver API",
    version="1.0.0",
    description="Stateless optimization service powering RosterIQ shift scheduling and minimal-disruption repair.",
)

EXPECTED_API_KEY = os.getenv("SOLVER_API_KEY", "dev-solver-secret-key")


def verify_api_key(x_solver_key: Optional[str] = Header(None)) -> None:
    """Validate solver secret key header."""
    if not x_solver_key or x_solver_key != EXPECTED_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Solver-Key header",
        )


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    solver: str


@app.get("/v1/health", response_model=HealthResponse, tags=["System"])
def health_check() -> HealthResponse:
    """Return health status of the solver microservice."""
    return HealthResponse(
        status="ok",
        service="roster-iq-solver",
        version="1.0.0",
        solver="Google OR-Tools CP-SAT 9.15",
    )


@app.post(
    "/v1/solve",
    response_model=SolveResponse,
    dependencies=[Depends(verify_api_key)],
    tags=["Solver"],
)
def solve_roster(
    request: SolveRequest,
) -> SolveResponse:
    """
    Solve monthly roster optimization problem with CP-SAT.
    Guarantees feasibility via soft coverage slack with explicit conflict accounting.
    """
    return build_and_solve_cpsat(request)


@app.post(
    "/v1/repair",
    response_model=SolveResponse,
    dependencies=[Depends(verify_api_key)],
    tags=["Solver"],
)
def repair_roster(
    request: RepairRequest,
) -> SolveResponse:
    """
    Perform minimal-disruption repair on an existing published roster.
    Penalizes changes away from baseline schedule while resolving newly injected disruptions.
    """
    return build_and_solve_cpsat(
        request=request.baseProblem,
        current_entries=request.currentEntries,
        disruption_weight=request.disruptionWeight,
    )
