# RosterIQ — Smart Roster Management System

RosterIQ is an operations scheduling and roster optimization platform for D2C customer-experience operations. It balances brand operating calendars, employee availability, fairness, and coverage constraints using Google OR-Tools CP-SAT and an independent TypeScript validation engine.

---

## Key Capabilities
- **Demand-Side Modeling:** Separate operating calendars (`ALL_365`, `DAILY_EXCEPT_HOLIDAYS`, `SUN_AND_HOLIDAYS_OFF`, `CUSTOM`), process-level overrides, and date/weekday specific minimum staffing rules.
- **Supply-Side Constraints:** Weekly off targets, consecutive work day limits (max 6 days), leave/comp-off availability, and cross-trained backup allocations.
- **The Ripple Engine:** Change-impact simulation ("blast radius") showing which brands and days break when an absence is requested or a calendar changes, with ranked quick fixes and minimal-disruption CP-SAT repair.
- **Safe-to-Approve Calendar:** Real-time green/amber/red pre-approval impact check on leave requests.
- **Resilience Analytics:** Slack heatmap, single-point-of-failure (SPOF) detection, bus factor per brand, and employee criticality index.

---

## Architecture
- **Web & API:** Next.js 16 App Router, TypeScript (strict), Tailwind CSS v4, shadcn/ui, TanStack Query/Table.
- **Domain Core:** Pure TypeScript (`web/src/domain`) for calendar, demand, and availability resolution.
- **Solver Microservice:** Python 3.12, FastAPI, Google OR-Tools 9.15 CP-SAT constraint programming.
- **Database:** PostgreSQL (Neon / local) managed with Prisma ORM 7.x.

---

## Development Setup

### Prerequisites
- Node.js $\ge 20.9$ (v24.x tested) & npm
- Python 3.12 (`py -3.12` on Windows)

### Quick Start
```bash
# 1. Install solver dependencies
npm run solver:install

# 2. Run solver tests
npm run solver:test

# 3. Start web development server
npm run dev
```

For detailed architectural decisions and assumptions, see:
- [docs/DECISIONS.md](docs/DECISIONS.md)
- [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md)
- [docs/BUILD_MAP.md](docs/BUILD_MAP.md)
