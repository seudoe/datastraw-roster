-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('CS', 'ACC', 'NDR', 'RETENTION', 'OTHER');

-- CreateEnum
CREATE TYPE "OperatingRule" AS ENUM ('ALL_365', 'DAILY_EXCEPT_HOLIDAYS', 'SUN_AND_HOLIDAYS_OFF', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AssignmentRole" AS ENUM ('PRIMARY', 'BACKUP', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('PLANNED_LEAVE', 'SICK', 'COMP_OFF', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('WORK', 'WEEKLY_OFF', 'HOLIDAY', 'LEAVE', 'COMP_OFF');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('SOLVER', 'MANUAL', 'REPAIR');

-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "Pod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leadId" TEXT,

    CONSTRAINT "Pod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "podId" TEXT NOT NULL,
    "skills" "ProcessType"[],
    "weeklyOffsPerWeek" INTEGER NOT NULL DEFAULT 1,
    "preferredOffWeekdays" INTEGER[],
    "unavailableWeekdays" INTEGER[],
    "maxConsecutiveWorkDays" INTEGER,
    "maxBackupBrandsPerDay" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingCalendar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rule" "OperatingRule" NOT NULL,
    "workingWeekdays" INTEGER[],
    "observesHolidays" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OperatingCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "type" "ProcessType" NOT NULL,
    "name" TEXT NOT NULL,
    "calendarId" TEXT,
    "defaultMinStaff" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageRule" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "weekday" INTEGER,
    "date" DATE,
    "minStaff" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "CoverageRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "role" "AssignmentRole" NOT NULL DEFAULT 'PRIMARY',
    "allocationPct" INTEGER NOT NULL DEFAULT 100,
    "validFrom" DATE,
    "validTo" DATE,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompOffCredit" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "earnedOn" DATE NOT NULL,
    "expiresOn" DATE,
    "redeemedByAbsenceId" TEXT,

    CONSTRAINT "CompOffCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roster" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "RosterStatus" NOT NULL DEFAULT 'DRAFT',
    "profile" TEXT NOT NULL,
    "parentId" TEXT,
    "solverMeta" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterEntry" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "DayStatus" NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "source" "EntrySource" NOT NULL DEFAULT 'SOLVER',
    "note" TEXT,

    CONSTRAINT "RosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupDuty" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "BackupDuty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictAck" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "ackBy" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictAck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "changeSet" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT,
    "audience" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pod_name_key" ON "Pod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pod_leadId_key" ON "Pod"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE INDEX "Employee_podId_idx" ON "Employee"("podId");

-- CreateIndex
CREATE UNIQUE INDEX "OperatingCalendar_name_key" ON "OperatingCalendar"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_code_key" ON "Brand"("code");

-- CreateIndex
CREATE INDEX "Brand_calendarId_idx" ON "Brand"("calendarId");

-- CreateIndex
CREATE INDEX "Process_brandId_idx" ON "Process"("brandId");

-- CreateIndex
CREATE INDEX "Process_calendarId_idx" ON "Process"("calendarId");

-- CreateIndex
CREATE INDEX "CoverageRule_processId_weekday_idx" ON "CoverageRule"("processId", "weekday");

-- CreateIndex
CREATE INDEX "CoverageRule_processId_date_idx" ON "CoverageRule"("processId", "date");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_brandId_key" ON "Holiday"("date", "brandId");

-- CreateIndex
CREATE INDEX "Assignment_employeeId_idx" ON "Assignment"("employeeId");

-- CreateIndex
CREATE INDEX "Assignment_processId_idx" ON "Assignment"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_employeeId_processId_key" ON "Assignment"("employeeId", "processId");

-- CreateIndex
CREATE INDEX "Absence_employeeId_status_idx" ON "Absence"("employeeId", "status");

-- CreateIndex
CREATE INDEX "Absence_startDate_endDate_idx" ON "Absence"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "CompOffCredit_employeeId_idx" ON "CompOffCredit"("employeeId");

-- CreateIndex
CREATE INDEX "Roster_month_status_idx" ON "Roster"("month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_month_version_key" ON "Roster"("month", "version");

-- CreateIndex
CREATE INDEX "RosterEntry_rosterId_date_idx" ON "RosterEntry"("rosterId", "date");

-- CreateIndex
CREATE INDEX "RosterEntry_employeeId_date_idx" ON "RosterEntry"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RosterEntry_rosterId_employeeId_date_key" ON "RosterEntry"("rosterId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "BackupDuty_rosterId_date_idx" ON "BackupDuty"("rosterId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BackupDuty_rosterId_employeeId_processId_date_key" ON "BackupDuty"("rosterId", "employeeId", "processId", "date");

-- CreateIndex
CREATE INDEX "ConflictAck_rosterId_idx" ON "ConflictAck"("rosterId");

-- CreateIndex
CREATE INDEX "ConflictAck_fingerprint_idx" ON "ConflictAck"("fingerprint");

-- CreateIndex
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent"("at");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Notification_audience_readAt_idx" ON "Notification"("audience", "readAt");

-- CreateIndex
CREATE INDEX "Notification_rosterId_idx" ON "Notification"("rosterId");

-- AddForeignKey
ALTER TABLE "Pod" ADD CONSTRAINT "Pod_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_podId_fkey" FOREIGN KEY ("podId") REFERENCES "Pod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "OperatingCalendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "OperatingCalendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverageRule" ADD CONSTRAINT "CoverageRule_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompOffCredit" ADD CONSTRAINT "CompOffCredit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompOffCredit" ADD CONSTRAINT "CompOffCredit_redeemedByAbsenceId_fkey" FOREIGN KEY ("redeemedByAbsenceId") REFERENCES "Absence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupDuty" ADD CONSTRAINT "BackupDuty_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupDuty" ADD CONSTRAINT "BackupDuty_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupDuty" ADD CONSTRAINT "BackupDuty_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictAck" ADD CONSTRAINT "ConflictAck_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
