# Architecture Decision Records (ADRs)

This document tracks key architectural choices, context, rejected alternatives, and trade-offs. Every significant technical choice is justified and defensible in technical review and interviews.

---

## ADR-0001: Package Manager — `npm` over `pnpm`
- **Context:** The project requires dependency management and orchestration for the Next.js web application and root scripts. The environment runs Node.js 24 on Windows with native npm.
- **Decision:** Standardize on standard `npm` (v12.x) and `npx` across the repository.
- **Alternatives Rejected:**
  - `pnpm`: While efficient with symlinks, pnpm requires specific global script execution policies on Windows and additional setup; user explicitly instructed to use standard `npm`.
  - `yarn`: Unnecessary third-party package manager overhead.
- **Trade-off:** Slightly slower initial cache population compared to pnpm, but zero environmental friction, universal standard compatibility, and native reliability.

---

## ADR-0002: Solver Technology — Google OR-Tools CP-SAT over Greedy Heuristic or MIP
- **Context:** Roster generation must satisfy hard employee rest constraints, availability, and coverage requirements while optimizing fairness, stability, and preferred weekly offs across ~32 employees and 25 brands.
- **Decision:** Use Google OR-Tools 9.15 (CP-SAT constraint programming solver) running in Python 3.12.
- **Alternatives Rejected:**
  - *Pure TypeScript Greedy Heuristic:* Incapable of proving optimality or detecting subtle multi-employee combinatorial deadlocks; brittle when adding soft objectives.
  - *Mixed Integer Programming (MIP / PuLP):* Slower on highly boolean constraint satisfaction problems like employee shift/rest windows compared to SAT-based solvers.
  - *LLM / Generative AI Scheduling:* Non-deterministic, unprovable, prone to hallucinating dates/constraints, impossible to mathematically verify.
- **Trade-off:** Introduces a lightweight Python microservice boundary, but delivers exact constraint satisfaction, determinism, and minimal-disruption repair capabilities.

---

## ADR-0003: Domain Logic Separation — Pure TypeScript Core for Calendar & Demand
- **Context:** Business rules govern operating calendars (365 days, Sunday-off, holidays, process-level overrides) and employee availability.
- **Decision:** Keep all calendar, holiday, and demand resolution exclusively in a pure TypeScript domain core (`web/src/domain`). The Python solver receives a flat, already-resolved problem matrix and contains zero calendar logic.
- **Alternatives Rejected:**
  - *Shared Calendar Logic in Python and TypeScript:* High risk of drift and synchronization bugs between solver and web UI.
  - *Solver-driven Calendar Calculations:* Couples OR-Tools directly to calendar edge cases and makes client-side live preview impossible.
- **Trade-off:** TypeScript layer must prepare the demand snapshot, but ensures single source of truth and instant client-side execution.

---

## ADR-0004: Verification Architecture — Independent TypeScript Validator ("Trust, But Verify")
- **Context:** Solvers may produce outputs that satisfy objective functions but fail edge cases if weights or formulations differ slightly.
- **Decision:** The TypeScript validator (`web/src/domain/validator`) re-checks every generated or repaired roster against all mandatory and preference rules before persisting.
- **Alternatives Rejected:**
  - *Trusting the Solver Output Directly:* Masking model bugs or missed constraints.
- **Trade-off:** Small redundant computation (~30-50ms), but provides ironclad correctness guarantees and a unified conflict taxonomy for solver outputs and manual edits.

---

## ADR-0005: Solver Contract — OpenAPI to TypeScript (`openapi-typescript`)
- **Context:** Web application communicates with the Python solver via HTTP JSON endpoints (`/v1/solve`, `/v1/repair`).
- **Decision:** FastAPI auto-generates OpenAPI 3.1 schemas, compiled directly to TypeScript types via `openapi-typescript`.
- **Alternatives Rejected:**
  - *Hand-written TypeScript interfaces:* Prone to subtle field type/optionality drift.
  - *gRPC / Protocol Buffers:* Unnecessary tooling overhead for a stateless local/Render microservice.
- **Trade-off:** Requires a type generation step on solver schema changes, but guarantees 100% type safety at the service boundary.

---

## ADR-0006: Temporal Modeling — Plain ISO Date Strings (`YYYY-MM-DD`)
- **Context:** Timezones and daylight saving time conversions are the #1 source of roster off-by-one errors.
- **Decision:** All calendar calculations, domain models, solver payloads, and grid indices use plain UTC-free ISO date strings `YYYY-MM-DD`. Converted to `@db.Date` only at the database boundary.
- **Alternatives Rejected:**
  - *JavaScript `Date` / `DateTime` objects:* Inherently timezone-aware; causes date shifting across clients and servers.
- **Trade-off:** Requires custom date math helpers (`dates.ts`), but eliminates all timezone-related roster bugs permanently.

---

## ADR-0007: Database Architecture — PostgreSQL with Prisma ORM 7.x
- **Context:** Org structure, demand calendars, assignments, absences, and roster versions require relational integrity, cascade protections, and transactional updates.
- **Decision:** PostgreSQL (Neon free-tier / local Postgres) managed via Prisma ORM 7.x with `@prisma/adapter-pg`.
- **Alternatives Rejected:**
  - *Document Store (MongoDB):* Weak relational integrity for assignments and referential checks.
  - *Prisma 8 (RC):* Pinned to stable 7.x to avoid breaking changes in release candidate versions.
- **Trade-off:** Requires migration workflow, but guarantees foreign-key safety and atomic roster version commits.

---

## ADR-0008: Authentication & Access Control — Demo Role Switcher
- **Context:** The application is a demonstration and assessment system evaluated by hiring managers.
- **Decision:** Implement a lightweight, verifiable role switcher (Ops Manager, Pod Lead, Viewer) stored in signed HTTP-only cookies, with server-side enforcement on mutating API routes.
- **Alternatives Rejected:**
  - *Full OAuth / Clerk / Auth.js:* Heavy external setup requiring third-party credentials that create friction for evaluators.
- **Trade-off:** Not suitable for multi-tenant production enterprise without SSO, but ideal, honest, and frictionless for hiring review while keeping server authorization real.

---

## ADR-0009: Infeasibility Handling — Soft Slack Variables with Escalated Penalties
- **Context:** When a 365-day brand has a single worker and 0 backups, meeting all coverage and labor constraints is mathematically impossible. A strict solver would return `INFEASIBLE`, producing zero output and halting operations.
- **Decision:** Introduce non-negative integer slack variables $gap_{p, d}$ for every process on every day with an astronomical objective penalty ($W_{gap} = 100,000$).
- **Alternatives Rejected:**
  - *Hard Infeasibility Error:* Fails entire roster generation when a single brand cannot be staffed.
  - *Violating Labor Rest Rules:* Forcing employees to work 7+ consecutive days without rest violates legal labor compliance.
- **Trade-off:** Roster is always guaranteed to generate optimal schedules for coverable brands, while structurally uncoverable brands are clearly highlighted with explicit gap counts and grounded operational explanations.

---

## ADR-0010: Change Handling — The Ripple Engine with <5ms Pure TS Simulation
- **Context:** When an employee requests leave or an emergency occurs, managers need instant visibility into downstream impacts before approving. Calling an external solver for every keystroke creates prohibitive latency (2–10s).
- **Decision:** Build "The Ripple Engine" in pure TypeScript to compute direct coverage gaps, upstream/downstream domino cascades, and metric deltas entirely in-memory in under 5 milliseconds.
- **Alternatives Rejected:**
  - *Synchronous Solver Re-solve on Change Preview:* 2–5s network latency makes interactive exploration frustrating.
  - *Simple Cell-Only Checks:* Fails to detect domino effects where covering one brand starves another brand.
- **Trade-off:** Pure TS engine must maintain mirrored validation rules, but delivers sub-5ms instant interactive blast radius visualization.

---

## ADR-0011: Dual Remediation Strategy — Ranked Fast Heuristics + Minimal-Disruption Repair
- **Context:** Once a coverage gap is detected, managers need actionable options. Some situations require quick manual swaps; others require complex multi-agent rescheduling.
- **Decision:** Implement a dual-tier remediation pipeline: (1) 4 ranked 1-click deterministic quick-fixes (Existing Floater, Overtime, Cross-Pod Borrow, Peer Swap) generated in <10ms; and (2) An optimal CP-SAT minimal-disruption repair microservice (`/v1/repair`) that re-solves only the affected time window while penalizing shift movements with $\sum |x - x^{(0)}|$.
- **Alternatives Rejected:**
  - *Full Roster Regeneration on Leave:* Shuffles the entire month's schedule for 32 employees, destroying predictability and agent morale.
  - *Heuristics Only:* Fails on complex multi-day combinatorial cascades.
- **Trade-off:** Dual approach requires maintaining both the TS heuristic ranking and Python repair model, but combines instant 1-click remedies with mathematical optimality.

---

## ADR-0012: Governance & Quality Gate — Hard Publish Gate with Explicit Exception Acknowledgment
- **Context:** Unfinished drafts or rosters with critical coverage gaps must never be accidentally published as the official operating plan.
- **Decision:** Enforce a hard Publish Gate in `rosterService.ts`: publication is strictly blocked if any unacknowledged `ERROR` conflict exists (`COVERAGE_ZERO`, `WORKING_WHILE_ABSENT`, `MAX_CONSECUTIVE_EXCEEDED`, `UNAVAILABLE_WEEKDAY_WORKED`, `BACKUP_OVERLOAD`, `CASCADE_GAP`). Ops Managers must explicitly log an acknowledgment (`ConflictAck`) with a business justification to proceed.
- **Alternatives Rejected:**
  - *Soft Warnings:* Managers can easily overlook critical gaps and publish invalid schedules.
  - *Absolute Publish Block without Override:* Paralyzes business operations on structurally uncoverable brands like `BR_03` where client contracts accept known weekend gaps.
- **Trade-off:** Requires explicit operational overhead to acknowledge exceptions, but guarantees complete auditability and governance.

---

## ADR-0013: Multi-Perspective Grid Modeling — 5 Synchronized Views
- **Context:** Different operational personas require different angles: Pod leads care about pod peers; account managers care about brand SLAs; ops executives care about company-wide fairness.
- **Decision:** Model the roster grid with 5 first-class synchronized perspectives (Company, Pods, Brands, Processes, Employees) driven by a unified cell data model.
- **Alternatives Rejected:**
  - *Single Monolithic Grid:* Overwhelming cognitive load; difficult to inspect brand-level coverage rows.
- **Trade-off:** Requires client-side grouping and aggregation logic, but provides tailor-made workspaces for every operational stakeholder.

---

## ADR-0014: Resilience Analytics — Bus Factor & Outage Stress Testing over Static Counts
- **Context:** Standard staffing dashboards only show headcount. A pod with 8 agents may look safe, but if only 1 agent is certified on a critical brand, the organization has a hidden single point of failure (SPOF).
- **Decision:** Compute deterministic Brand Bus Factors (number of unique certified agents), an Employee Criticality Index (0–100 blast radius score), and simulate 60 distinct pairwise outage combinations to evaluate real shock survival rates.
- **Alternatives Rejected:**
  - *Simple Staff-to-Brand Ratio:* Masks qualification bottlenecks (e.g. 10 CS agents cannot cover 1 specialized NDR process).
- **Trade-off:** Extra analytical computation, but proactively alerts leadership to fragile single-resource accounts before an emergency occurs.
