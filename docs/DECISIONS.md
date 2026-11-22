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
