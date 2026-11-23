# RosterIQ Entity-Relationship Diagram

This document illustrates the complete relational database model powering RosterIQ, designed to enforce relational integrity, prevent double-bookings, support multi-brand and single-resource staffing, and maintain full immutable versioning.

---

```mermaid
erDiagram
    POD ||--o{ EMPLOYEE : "members"
    POD ||--o| EMPLOYEE : "lead"
    
    OPERATING_CALENDAR ||--o{ BRAND : "governs"
    OPERATING_CALENDAR ||--o{ PROCESS : "overrides"
    
    BRAND ||--o{ PROCESS : "has"
    BRAND ||--o{ HOLIDAY : "brand_holidays"
    
    PROCESS ||--o{ COVERAGE_RULE : "rules"
    PROCESS ||--o{ ASSIGNMENT : "assigned_to"
    PROCESS ||--o{ BACKUP_DUTY : "covered_by_backup"
    
    EMPLOYEE ||--o{ ASSIGNMENT : "assigned"
    EMPLOYEE ||--o{ ABSENCE : "requests"
    EMPLOYEE ||--o{ COMP_OFF_CREDIT : "earns"
    EMPLOYEE ||--o{ ROSTER_ENTRY : "scheduled"
    EMPLOYEE ||--o{ BACKUP_DUTY : "acts_as_backup"
    
    ABSENCE ||--o{ COMP_OFF_CREDIT : "redeems"
    
    ROSTER ||--o{ ROSTER_ENTRY : "entries"
    ROSTER ||--o{ BACKUP_DUTY : "backup_duties"
    ROSTER ||--o{ CONFLICT_ACK : "acknowledged_exceptions"
    ROSTER ||--o{ NOTIFICATION : "triggers"
    
    POD {
        string id PK
        string name UK
        string leadId FK
    }

    EMPLOYEE {
        string id PK
        string code UK
        string name
        string email
        string podId FK
        enum skills
        int weeklyOffsPerWeek
        int_array preferredOffWeekdays
        int_array unavailableWeekdays
        int maxConsecutiveWorkDays
        int maxBackupBrandsPerDay
        boolean active
    }

    OPERATING_CALENDAR {
        string id PK
        string name UK
        enum rule "ALL_365 | DAILY_EXCEPT_HOLIDAYS | SUN_AND_HOLIDAYS_OFF | CUSTOM"
        int_array workingWeekdays
        boolean observesHolidays
    }

    BRAND {
        string id PK
        string code UK
        string name
        string calendarId FK
        int priority "1 (low) to 3 (critical)"
        boolean active
    }

    PROCESS {
        string id PK
        string brandId FK
        enum type "CS | ACC | NDR | RETENTION | OTHER"
        string name
        string calendarId FK "nullable override"
        int defaultMinStaff
    }

    COVERAGE_RULE {
        string id PK
        string processId FK
        int weekday "0=Sun..6=Sat"
        date date "YYYY-MM-DD"
        int minStaff
        string note
    }

    HOLIDAY {
        string id PK
        date date "YYYY-MM-DD"
        string name
        string brandId FK "null = company-wide"
    }

    ASSIGNMENT {
        string id PK
        string employeeId FK
        string processId FK
        enum role "PRIMARY | BACKUP | TEMPORARY"
        int allocationPct
        date validFrom
        date validTo
    }

    ABSENCE {
        string id PK
        string employeeId FK
        enum type "PLANNED_LEAVE | SICK | COMP_OFF | OTHER"
        date startDate
        date endDate
        enum status "PENDING | APPROVED | REJECTED"
        string reason
        datetime createdAt
    }

    COMP_OFF_CREDIT {
        string id PK
        string employeeId FK
        date earnedOn
        date expiresOn
        string redeemedByAbsenceId FK
    }

    ROSTER {
        string id PK
        string month "YYYY-MM"
        int version
        enum status "DRAFT | IN_REVIEW | PUBLISHED | SUPERSEDED"
        string profile "BALANCED | COVERAGE_FIRST | etc."
        string parentId
        json solverMeta
        string createdBy
        datetime createdAt
    }

    ROSTER_ENTRY {
        string id PK
        string rosterId FK
        string employeeId FK
        date date "YYYY-MM-DD"
        enum status "WORK (W) | WEEKLY_OFF (O) | HOLIDAY (H) | LEAVE (L) | COMP_OFF (C)"
        boolean locked
        enum source "SOLVER | MANUAL | REPAIR"
        string note
    }

    BACKUP_DUTY {
        string id PK
        string rosterId FK
        string employeeId FK
        string processId FK
        date date "YYYY-MM-DD"
    }

    CONFLICT_ACK {
        string id PK
        string rosterId FK
        string fingerprint
        string reason
        string ackBy
        datetime at
    }

    AUDIT_EVENT {
        string id PK
        datetime at
        string actor
        string action
        string entityType
        string entityId
        json payload
    }

    NOTIFICATION {
        string id PK
        string rosterId FK
        string audience
        string message
        datetime readAt
        datetime createdAt
    }

    SETTING {
        string key PK
        json value
    }

    SCENARIO {
        string id PK
        string name
        json changeSet
        json result
        datetime createdAt
    }
```

---

## Key Relational Design Defenses

1. **Demand vs. Supply Separation:**
   - Operating demand flows down: `OperatingCalendar` $\rightarrow$ `Brand` $\rightarrow$ `Process` $\rightarrow$ `CoverageRule`.
   - Employee supply flows through `Pod` $\rightarrow$ `Employee` $\rightarrow$ `Absence` / `CompOffCredit`.
   - The two worlds connect through `Assignment` (static capability & ownership) and `RosterEntry` / `BackupDuty` (temporal monthly realization).

2. **No Special Cases for Single-Resource Brands:**
   - A single-resource brand has processes where exactly one employee holds a `PRIMARY` `Assignment`.
   - Multi-employee brands have multiple assignees across or within processes.
   - The schema and solver treat both identically without conditionals.

3. **Backup Coverage Activation via `BackupDuty`:**
   - `PRIMARY` employees automatically cover their assigned process when their `RosterEntry` is `WORK`.
   - `BACKUP` and `TEMPORARY` employees only cover on specific days when explicitly activated via `BackupDuty`, preventing phantom double-counting.

4. **Temporal Date Safety:**
   - All calendar dates (`CoverageRule.date`, `Holiday.date`, `Absence.startDate`, `RosterEntry.date`, etc.) are modeled as `@db.Date` in PostgreSQL and plain `YYYY-MM-DD` strings in TypeScript, preventing timezone distortion across client browsers.

5. **Versioned Roster Immutability:**
   - `@@unique([month, version])` ensures that any revision (e.g. from a leave approval or manual fix) creates an incremented version, preserving complete auditability and differential rollback capability.
