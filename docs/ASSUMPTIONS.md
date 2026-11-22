# RosterIQ Assumptions & Configurability

All assumptions made to address ambiguities in business rules are recorded here. In accordance with the system design requirements, every assumption is designed to be configurable via global settings (`Setting` table) or entity-level attributes rather than hardcoded in logic.

---

## 1. Calendar & Weekly Rest
1. **Week Boundaries:**
   - **Assumption:** The operational week starts on **Monday** (ISO-8601).
   - **Configuration:** Stored in global settings (`fiscalWeekStart`, default `1` for Monday).
2. **Weekly-Off Target:**
   - **Assumption:** Each full-time employee is entitled to 1 weekly off per full 7-day ISO week. Partial weeks at the start/end of a month are pro-rated (e.g., a 2-day stub week does not mandate a full weekly off unless configured).
   - **Configuration:** `Employee.weeklyOffsPerWeek` (default `1`, configurable per employee).
3. **Maximum Consecutive Work Days:**
   - **Assumption:** An employee cannot work more than 6 consecutive days without at least 1 day of rest (`O`, `L`, `C`, or `H`).
   - **Configuration:** `Setting.maxConsecutiveWorkDays` (default `6`, with override support in `Employee.maxConsecutiveWorkDays`).

---

## 2. Holidays & Operational Closures
4. **Holidays vs. Weekly Offs:**
   - **Assumption:** If an employee's assigned processes do not operate on a declared holiday, the employee is granted a holiday off (`H`). This holiday off does **not** consume their weekly-off entitlement.
   - **Configuration:** Handled in pure domain logic via `availability.ts`; toggleable in settings.
5. **Holiday Scope:**
   - **Assumption:** Public holidays apply company-wide across all brands unless a `Holiday` record explicitly specifies a `brandId`, in which case it is brand-specific.
   - **Configuration:** `Holiday.brandId` (null = company-wide, UUID = brand-specific).

---

## 3. Shifts & Overlaps
6. **Shift Modeling:**
   - **Assumption:** Daily operations are modeled at daily resolution (general single shift per operational day). Multiple shifts within a 24-hour cycle are out of scope for this monthly planner.
   - **Protection:** Incompatible overlaps across brands are bounded by the `BACKUP_OVERLOAD` constraint: an employee cannot be assigned active backup duty for more than `maxBackupBrandsPerDay` on the same date.
   - **Configuration:** `Setting.maxBackupBrandsPerDay` (default `2`, employee override via `Employee.maxBackupBrandsPerDay`).

---

## 4. Comp-Offs & Compensatory Leave
7. **Comp-Off Earning and Redemption:**
   - **Assumption:** Working on a mandatory rest day or operating holiday credits 1 comp-off (`CompOffCredit`). Comp-offs expire after 30 days and must be requested/approved as an absence type (`COMP_OFF`), not automatically inserted by the solver.
   - **Configuration:** `Setting.compOffValidityDays` (default `30`).

---

## 5. Preferences vs. Mandatory Constraints
8. **Weekly-Off Day Preferences:**
   - **Assumption:** An employee's preferred weekly-off weekday is a **soft preference**; mandatory process coverage and rest safety outrank preferences.
   - **Configuration:** `Employee.preferredOffWeekdays` (int array 0=Sun..6=Sat); solver weight `W_preferredOffViolation` configurable per solver profile.
9. **Hard Availability Restrictions:**
   - **Assumption:** Blocked weekdays (e.g. part-time workers or specific academic/personal contracts) are **hard constraints** (`UNAVAILABLE_WEEKDAY`) and cannot be assigned work (`W`).
   - **Configuration:** `Employee.unavailableWeekdays` (int array).

---

## 6. Brand Priority & Sizing
10. **Brand Priority Weighting:**
    - **Assumption:** Gaps on high-priority brands incur higher penalties in solver optimization and resilience score calculations.
    - **Configuration:** `Brand.priority` (1 = standard, 2 = elevated, 3 = critical).

---

## 7. Skills & Substitutions
11. **Qualification for Temporary Borrows / Float:**
    - **Assumption:** An employee may only cover a process as a `BACKUP` or temporary borrow if they possess the required process skill (`Employee.skills` contains `Process.type`) or hold an explicit `Assignment`.
    - **Configuration:** Evaluated during quick-fix ranking and CP-SAT backup variable filtering.

---

## 8. Versioning & Governance
12. **Roster Immutability:**
    - **Assumption:** A published roster (`PUBLISHED`) is immutable. Any post-publication changes, approvals, or repairs create an incremented roster version (`version = N + 1`, `parentId = N`) preserving full audit history.
    - **Configuration:** Enforced by `rosterService` and PostgreSQL uniqueness constraints `[month, version]`.
