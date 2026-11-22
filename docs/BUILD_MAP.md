# RosterIQ Implementation Build Map

This map outlines every route, component, underlying API endpoint, and the corresponding delivery stage.

| Route | Purpose | Key Components | API Endpoints | Target Stage |
|---|---|---|---|---|
| `/` | Operations Dashboard (KPIs, resilience summary, open conflicts, solver status, demo guide) | `DashboardView`, `KpiCards`, `OpenConflictsCard`, `DemoGuidePanel` | `GET /api/rosters/[month]`, `GET /api/resilience/[month]`, `GET /api/health` | Stage 5, 11 |
| `/setup/employees` | Employee directory, skills, weekly offs, unavailable weekdays | `EmployeeTable`, `EmployeeDrawer`, `SkillsBadge` | `GET/POST /api/employees`, `PUT/DELETE /api/employees/[id]` | Stage 5 |
| `/setup/pods` | Pods, pod lead assignment, member lists | `PodGrid`, `PodLeadSelect`, `PodMemberList` | `GET/POST /api/pods`, `PUT/DELETE /api/pods/[id]` | Stage 5 |
| `/setup/brands` | Brand catalog, process list, coverage rules | `BrandTable`, `BrandForm` | `GET/POST /api/brands`, `PUT/DELETE /api/brands/[id]` | Stage 5 |
| `/setup/brands/[id]` | Brand detail, processes, coverage rules, assignments, holidays | `ProcessList`, `CoverageRuleModal`, `AssignmentManager`, `BrandHolidayList` | `GET/PUT /api/brands/[id]`, `/api/processes`, `/api/coverage-rules` | Stage 5 |
| `/setup/calendars` | Operating calendars (365, Sun-off, etc.) and company holidays | `CalendarList`, `CalendarEditor`, `HolidayTable` | `GET/POST /api/calendars`, `GET/POST /api/holidays` | Stage 5 |
| `/setup/settings` | Global rules (max consecutive days, backup cap), weight profiles | `SettingsForm`, `WeightProfileSlider`, `NotificationToggles` | `GET/PUT /api/settings` | Stage 5 |
| `/roster/[month]` | Primary monthly roster grid (Company, Pods, Brands, Processes, Employees) | `RosterGrid`, `RosterHeader`, `CellPopover`, `ConflictPanel`, `CoverageFooter` | `GET /api/rosters/[month]`, `POST /api/rosters/generate`, `PATCH /api/rosters/[id]/entries` | Stage 7–9 |
| `/roster/[month]/compare` | Plan profile comparison (BALANCED vs FAIRNESS vs COVERAGE) | `PlanCompareView`, `MetricDiffTable`, `PromotePlanButton` | `POST /api/rosters/compare` | Stage 13 |
| `/roster/[month]/versions` | Version history and interactive diff | `VersionList`, `RosterDiffViewer`, `RollbackModal` | `GET /api/rosters/[month]/versions` | Stage 12 |
| `/absences` | Leave and comp-off management + Safe-to-Approve Calendar | `AbsenceList`, `RequestAbsenceModal`, `SafeToApproveCalendar` | `GET/POST /api/absences`, `GET /api/absences/safe-dates`, `POST /api/absences/[id]/approve` | Stage 10 |
| `/ripple` | Change-Impact Simulator ("blast radius", cascade, ranked fixes) | `ChangeSetBuilder`, `BlastRadiusGraph`, `RankedFixList`, `RepairCompareCard` | `POST /api/ripple/simulate`, `POST /api/ripple/repair`, `POST /api/ripple/apply` | Stage 10 |
| `/resilience` | Single Points of Failure (SPOF) heatmap, bus factor, employee criticality | `SlackHeatmap`, `SpofTable`, `CriticalityIndexChart`, `StructuralCheckTable` | `GET /api/resilience/[month]` | Stage 11 |
| `/audit` | Audit log trail and notification center | `AuditTable`, `NotificationFeed`, `AuditDetailDrawer` | `GET /api/audit`, `GET /api/notifications` | Stage 12 |
