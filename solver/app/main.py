"""FastAPI application for RosterIQ CP-SAT optimization service."""
import os
from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel

app = FastAPI(
    title="RosterIQ CP-SAT Solver API",
    version="1.0.0",
    description="Stateless optimization service powering RosterIQ shift scheduling and minimal-disruption repair.",
)

EXPECTED_API_KEY = os.getenv("SOLVER_API_KEY", "dev-solver-secret-key")


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
