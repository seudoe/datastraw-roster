"""Universal entrypoint for RosterIQ Solver on Render / Cloud platforms."""
import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

solver_sub = os.path.join(base_dir, "solver")
if os.path.isdir(solver_sub) and solver_sub not in sys.path:
    sys.path.insert(0, solver_sub)

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting RosterIQ Solver on {host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port)
