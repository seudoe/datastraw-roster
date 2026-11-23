/**
 * Deterministic Seed Data Specification for RosterIQ
 * 32 employees, 25 brands (80% single-resource), 4 pods, floaters, and intentional structural gaps.
 */

export interface RawEmployee {
  code: string;
  name: string;
  email: string;
  podCode: string;
  skills: ('CS' | 'ACC' | 'NDR' | 'RETENTION' | 'OTHER')[];
  weeklyOffsPerWeek: number;
  preferredOffWeekdays: number[]; // 0=Sun..6=Sat
  unavailableWeekdays: number[];
  maxConsecutiveWorkDays?: number;
  maxBackupBrandsPerDay?: number;
}

export interface RawPod {
  code: string;
  name: string;
  leadEmployeeCode: string;
}

export interface RawCalendar {
  code: string;
  name: string;
  rule: 'ALL_365' | 'DAILY_EXCEPT_HOLIDAYS' | 'SUN_AND_HOLIDAYS_OFF' | 'CUSTOM';
  workingWeekdays: number[];
  observesHolidays: boolean;
}

export interface RawBrand {
  code: string;
  name: string;
  calendarCode: string;
  priority: number; // 1 to 3
}

export interface RawProcess {
  code: string;
  brandCode: string;
  type: 'CS' | 'ACC' | 'NDR' | 'RETENTION' | 'OTHER';
  name: string;
  calendarCode?: string; // override
  defaultMinStaff: number;
}

export interface RawCoverageRule {
  processCode: string;
  weekday?: number;
  date?: string;
  minStaff: number;
  note?: string;
}

export interface RawHoliday {
  date: string;
  name: string;
  brandCode?: string; // null = company-wide
}

export interface RawAssignment {
  employeeCode: string;
  processCode: string;
  role: 'PRIMARY' | 'BACKUP' | 'TEMPORARY';
  allocationPct: number;
}

export interface RawAbsence {
  employeeCode: string;
  type: 'PLANNED_LEAVE' | 'SICK' | 'COMP_OFF' | 'OTHER';
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
}

export const CALENDARS: RawCalendar[] = [
  {
    code: 'CAL_365',
    name: '365 Days Uninterrupted',
    rule: 'ALL_365',
    workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
    observesHolidays: false,
  },
  {
    code: 'CAL_DAILY_EXCEPT_HOLIDAYS',
    name: 'Daily (Closed on Holidays)',
    rule: 'DAILY_EXCEPT_HOLIDAYS',
    workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
    observesHolidays: true,
  },
  {
    code: 'CAL_SUN_HOLIDAYS_OFF',
    name: 'Sundays & Holidays Off',
    rule: 'SUN_AND_HOLIDAYS_OFF',
    workingWeekdays: [1, 2, 3, 4, 5, 6],
    observesHolidays: true,
  },
  {
    code: 'CAL_CUSTOM_MON_FRI',
    name: 'Custom (Mon to Fri Only)',
    rule: 'CUSTOM',
    workingWeekdays: [1, 2, 3, 4, 5],
    observesHolidays: true,
  },
];

export const PODS: RawPod[] = [
  { code: 'POD_FALCON', name: 'Pod Falcon', leadEmployeeCode: 'EMP001' },
  { code: 'POD_TITAN', name: 'Pod Titan', leadEmployeeCode: 'EMP009' },
  { code: 'POD_PHOENIX', name: 'Pod Phoenix', leadEmployeeCode: 'EMP017' },
  { code: 'POD_APEX', name: 'Pod Apex', leadEmployeeCode: 'EMP025' },
];

export const EMPLOYEES: RawEmployee[] = [
  // Pod Falcon (EMP001 to EMP008)
  { code: 'EMP001', name: 'Aarav Sharma', email: 'aarav.sharma@example.com', podCode: 'POD_FALCON', skills: ['CS', 'ACC'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP002', name: 'Ishita Sen', email: 'ishita.sen@example.com', podCode: 'POD_FALCON', skills: ['CS', 'NDR'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP003', name: 'Kabir Mehta', email: 'kabir.mehta@example.com', podCode: 'POD_FALCON', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [6], unavailableWeekdays: [] },
  { code: 'EMP004', name: 'Ananya Roy', email: 'ananya.roy@example.com', podCode: 'POD_FALCON', skills: ['ACC', 'CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP005', name: 'Vihaan Joshi', email: 'vihaan.joshi@example.com', podCode: 'POD_FALCON', skills: ['CS', 'RETENTION'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [1], unavailableWeekdays: [] },
  { code: 'EMP006', name: 'Tanvi Nair', email: 'tanvi.nair@example.com', podCode: 'POD_FALCON', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP007', name: 'Aditya Rao', email: 'aditya.rao@example.com', podCode: 'POD_FALCON', skills: ['NDR'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [2], unavailableWeekdays: [2] }, // Part-time Tue
  { code: 'EMP008', name: 'Mira Patel', email: 'mira.patel@example.com', podCode: 'POD_FALCON', skills: ['CS', 'ACC', 'NDR', 'RETENTION'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] }, // Floater 1

  // Pod Titan (EMP009 to EMP016)
  { code: 'EMP009', name: 'Priya Nair', email: 'priya.nair@example.com', podCode: 'POD_TITAN', skills: ['CS', 'RETENTION'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP010', name: 'Rohan Deshmukh', email: 'rohan.deshmukh@example.com', podCode: 'POD_TITAN', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [6], unavailableWeekdays: [] },
  { code: 'EMP011', name: 'Sneha Kulkarni', email: 'sneha.kulkarni@example.com', podCode: 'POD_TITAN', skills: ['ACC', 'CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP012', name: 'Arjun Das', email: 'arjun.das@example.com', podCode: 'POD_TITAN', skills: ['CS', 'NDR'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [5], unavailableWeekdays: [] },
  { code: 'EMP013', name: 'Kavya Menon', email: 'kavya.menon@example.com', podCode: 'POD_TITAN', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP014', name: 'Siddharth Bose', email: 'siddharth.bose@example.com', podCode: 'POD_TITAN', skills: ['ACC'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP015', name: 'Pooja Hegde', email: 'pooja.hegde@example.com', podCode: 'POD_TITAN', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [3], unavailableWeekdays: [3] }, // Part-time Wed
  { code: 'EMP016', name: 'Devendra Singhania', email: 'dev.singhania@example.com', podCode: 'POD_TITAN', skills: ['CS', 'ACC', 'NDR', 'RETENTION'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] }, // Floater 2

  // Pod Phoenix (EMP017 to EMP024)
  { code: 'EMP017', name: 'Rohan Verma', email: 'rohan.verma@example.com', podCode: 'POD_PHOENIX', skills: ['CS', 'ACC'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP018', name: 'Meera Kapoor', email: 'meera.kapoor@example.com', podCode: 'POD_PHOENIX', skills: ['CS', 'RETENTION'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP019', name: 'Nikhil Saxena', email: 'nikhil.saxena@example.com', podCode: 'POD_PHOENIX', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [6], unavailableWeekdays: [] },
  { code: 'EMP020', name: 'Rhea Pillai', email: 'rhea.pillai@example.com', podCode: 'POD_PHOENIX', skills: ['ACC'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP021', name: 'Varun Reddy', email: 'varun.reddy@example.com', podCode: 'POD_PHOENIX', skills: ['NDR'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP022', name: 'Divya Nambiar', email: 'divya.nambiar@example.com', podCode: 'POD_PHOENIX', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [1], unavailableWeekdays: [] },
  { code: 'EMP023', name: 'Kunal Ghosh', email: 'kunal.ghosh@example.com', podCode: 'POD_PHOENIX', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [4], unavailableWeekdays: [4] }, // Part-time Thu
  { code: 'EMP024', name: 'Shreya Sundaram', email: 'shreya.sundaram@example.com', podCode: 'POD_PHOENIX', skills: ['CS', 'ACC', 'NDR', 'RETENTION'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] }, // Floater 3

  // Pod Apex (EMP025 to EMP032)
  { code: 'EMP025', name: 'Ananya Iyer', email: 'ananya.iyer@example.com', podCode: 'POD_APEX', skills: ['CS', 'ACC'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP026', name: 'Gaurav Chopra', email: 'gaurav.chopra@example.com', podCode: 'POD_APEX', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [6], unavailableWeekdays: [] },
  { code: 'EMP027', name: 'Pallavi Chawla', email: 'pallavi.chawla@example.com', podCode: 'POD_APEX', skills: ['ACC', 'CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP028', name: 'Tarun Varma', email: 'tarun.varma@example.com', podCode: 'POD_APEX', skills: ['RETENTION'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP029', name: 'Neha Bansal', email: 'neha.bansal@example.com', podCode: 'POD_APEX', skills: ['CS'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP030', name: 'Rajesh Khanna', email: 'rajesh.khanna@example.com', podCode: 'POD_APEX', skills: ['CS', 'NDR'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] },
  { code: 'EMP031', name: 'Swati Sen', email: 'swati.sen@example.com', podCode: 'POD_APEX', skills: ['CS', 'ACC', 'NDR', 'RETENTION'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] }, // Floater 4
  { code: 'EMP032', name: 'Vikramaditya Rao', email: 'vikram.rao@example.com', podCode: 'POD_APEX', skills: ['CS', 'ACC', 'NDR', 'RETENTION'], weeklyOffsPerWeek: 1, preferredOffWeekdays: [0], unavailableWeekdays: [] }, // Floater 5
];

export const BRANDS: RawBrand[] = [
  // 20 Single-Resource Brands (80%)
  { code: 'BR_01', name: 'PureGlow Botanicals', calendarCode: 'CAL_365', priority: 3 },
  { code: 'BR_02', name: 'UrbanKicks Footwear', calendarCode: 'CAL_365', priority: 3 },
  { code: 'BR_03', name: 'ChaiCraft Organics', calendarCode: 'CAL_365', priority: 3 }, // STRUCTURALLY UNCOVERABLE (365, no backup)
  { code: 'BR_04', name: 'SilkRoute Apparel', calendarCode: 'CAL_365', priority: 2 }, // MIXED CALENDAR (CS 365, ACC Sun-off)
  { code: 'BR_05', name: 'NutriBites Snacks', calendarCode: 'CAL_DAILY_EXCEPT_HOLIDAYS', priority: 2 },
  { code: 'BR_06', name: 'LuxeAura Fragrances', calendarCode: 'CAL_DAILY_EXCEPT_HOLIDAYS', priority: 2 },
  { code: 'BR_07', name: 'ZenLiving Home', calendarCode: 'CAL_DAILY_EXCEPT_HOLIDAYS', priority: 2 },
  { code: 'BR_08', name: 'TrueRoots Ayurveda', calendarCode: 'CAL_DAILY_EXCEPT_HOLIDAYS', priority: 2 },
  { code: 'BR_09', name: 'FitFuel Nutrition', calendarCode: 'CAL_DAILY_EXCEPT_HOLIDAYS', priority: 2 },
  { code: 'BR_10', name: 'BloomBaby Care', calendarCode: 'CAL_DAILY_EXCEPT_HOLIDAYS', priority: 2 },
  { code: 'BR_11', name: 'EcoDen Sustainable', calendarCode: 'CAL_DAILY_EXCEPT_HOLIDAYS', priority: 2 },
  { code: 'BR_12', name: 'VoltAudio Gear', calendarCode: 'CAL_DAILY_EXCEPT_HOLIDAYS', priority: 2 },
  { code: 'BR_13', name: 'VelvetHues Cosmetics', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 2 },
  { code: 'BR_14', name: 'BrewMaster Coffee', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 2 },
  { code: 'BR_15', name: 'ApexGears Athletic', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 2 },
  { code: 'BR_16', name: 'RoastCo Roasters', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 2 },
  { code: 'BR_17', name: 'SnackRite Foods', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 2 },
  { code: 'BR_18', name: 'SkinElixir D2C', calendarCode: 'CAL_365', priority: 3 }, // STRUCTURALLY UNCOVERABLE (365, no backup)
  { code: 'BR_19', name: 'AromaBliss Candles', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 1 },
  { code: 'BR_20', name: 'SleepHaven Beds', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 1 },

  // 5 Multi-Employee Brands (20%)
  { code: 'BR_21', name: 'IndiSpices Gourmet', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 3 }, // 3 Employees: CS, ACC, NDR
  { code: 'BR_22', name: 'NovaTech Wearables', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 3 }, // 3 Employees: CS, ACC, NDR
  { code: 'BR_23', name: 'GlowVeda Wellness', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', priority: 2 }, // 2 Employees: CS, ACC
  { code: 'BR_24', name: 'DailyDrop Hydration', calendarCode: 'CAL_CUSTOM_MON_FRI', priority: 2 }, // 2 Employees: CS, RETENTION (CUSTOM M-F)
  { code: 'BR_25', name: 'OmniTrend Fashion', calendarCode: 'CAL_365', priority: 3 }, // 2 Employees sharing CS process with minStaff=2 on weekends!
];

export const PROCESSES: RawProcess[] = [
  // Single-resource brands
  { code: 'PR_01_CS', brandCode: 'BR_01', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_02_CS', brandCode: 'BR_02', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_03_CS', brandCode: 'BR_03', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  // Mixed Brand BR_04
  { code: 'PR_04_CS', brandCode: 'BR_04', type: 'CS', name: '24/7 CS Support', defaultMinStaff: 1 }, // Inherits CAL_365
  { code: 'PR_04_ACC', brandCode: 'BR_04', type: 'ACC', name: 'Accounts Escalation', calendarCode: 'CAL_SUN_HOLIDAYS_OFF', defaultMinStaff: 1 }, // Process override!
  // Single-resource brands continued
  { code: 'PR_05_CS', brandCode: 'BR_05', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_06_CS', brandCode: 'BR_06', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_07_CS', brandCode: 'BR_07', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_08_CS', brandCode: 'BR_08', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_09_CS', brandCode: 'BR_09', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_10_CS', brandCode: 'BR_10', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_11_CS', brandCode: 'BR_11', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_12_CS', brandCode: 'BR_12', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_13_CS', brandCode: 'BR_13', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_14_CS', brandCode: 'BR_14', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_15_CS', brandCode: 'BR_15', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_16_CS', brandCode: 'BR_16', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_17_CS', brandCode: 'BR_17', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_18_CS', brandCode: 'BR_18', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_19_CS', brandCode: 'BR_19', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },
  { code: 'PR_20_CS', brandCode: 'BR_20', type: 'CS', name: 'Customer Support', defaultMinStaff: 1 },

  // Multi-employee brand BR_21 (3 processes split across 3 people)
  { code: 'PR_21_CS', brandCode: 'BR_21', type: 'CS', name: 'Gourmet Inquiries', defaultMinStaff: 1 },
  { code: 'PR_21_ACC', brandCode: 'BR_21', type: 'ACC', name: 'Billing & B2B', defaultMinStaff: 1 },
  { code: 'PR_21_NDR', brandCode: 'BR_21', type: 'NDR', name: 'Delivery Exceptions', defaultMinStaff: 1 },

  // Multi-employee brand BR_22 (3 processes split across 3 people)
  { code: 'PR_22_CS', brandCode: 'BR_22', type: 'CS', name: 'Tech Support', defaultMinStaff: 1 },
  { code: 'PR_22_ACC', brandCode: 'BR_22', type: 'ACC', name: 'Warranty Claims', defaultMinStaff: 1 },
  { code: 'PR_22_NDR', brandCode: 'BR_22', type: 'NDR', name: 'Logistics Desk', defaultMinStaff: 1 },

  // Multi-employee brand BR_23 (2 processes across 2 people)
  { code: 'PR_23_CS', brandCode: 'BR_23', type: 'CS', name: 'Customer Desk', defaultMinStaff: 1 },
  { code: 'PR_23_ACC', brandCode: 'BR_23', type: 'ACC', name: 'Accounts Desk', defaultMinStaff: 1 },

  // Multi-employee brand BR_24 (2 processes across 2 people, CUSTOM calendar)
  { code: 'PR_24_CS', brandCode: 'BR_24', type: 'CS', name: 'Customer Care', defaultMinStaff: 1 },
  { code: 'PR_24_RET', brandCode: 'BR_24', type: 'RETENTION', name: 'Subscriber Retention', defaultMinStaff: 1 },

  // Multi-employee brand BR_25: Shared Process with 2 employees and Weekend minStaff=2 rule!
  { code: 'PR_25_CS', brandCode: 'BR_25', type: 'CS', name: 'Omni Omnichannel Support', defaultMinStaff: 1 },
];

export const COVERAGE_RULES: RawCoverageRule[] = [
  // Weekend minStaff = 2 on PR_25_CS (Saturday = 6, Sunday = 0)
  { processCode: 'PR_25_CS', weekday: 6, minStaff: 2, note: 'High weekend traffic requirement' },
  { processCode: 'PR_25_CS', weekday: 0, minStaff: 2, note: 'High Sunday traffic requirement' },
  // Christmas Eve spike on PR_01_CS
  { processCode: 'PR_01_CS', date: '2026-12-24', minStaff: 2, note: 'Christmas Eve holiday rush' },
];

export const HOLIDAYS: RawHoliday[] = [
  { date: '2026-12-18', name: 'Company Foundation Day' }, // Company-wide
  { date: '2026-12-25', name: 'Christmas Day' }, // Company-wide
  { date: '2027-01-01', name: "New Year's Day" }, // Company-wide
  { date: '2027-01-26', name: 'Republic Day' }, // Company-wide
  { date: '2026-12-12', name: 'IndiSpices Annual Brand Anniversary', brandCode: 'BR_21' }, // Brand-specific
];

export const ASSIGNMENTS: RawAssignment[] = [
  // Primary Assignments for Single-Resource Brands (80%)
  { employeeCode: 'EMP001', processCode: 'PR_01_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP002', processCode: 'PR_02_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP003', processCode: 'PR_03_CS', role: 'PRIMARY', allocationPct: 100 }, // STRUCTURALLY UNCOVERABLE (No backup)
  { employeeCode: 'EMP004', processCode: 'PR_04_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP004', processCode: 'PR_04_ACC', role: 'PRIMARY', allocationPct: 100 }, // Owns both processes
  { employeeCode: 'EMP005', processCode: 'PR_05_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP006', processCode: 'PR_06_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP007', processCode: 'PR_07_CS', role: 'PRIMARY', allocationPct: 100 },
  // 6 Employees on 2 brands (for cascade leave demonstration)
  { employeeCode: 'EMP001', processCode: 'PR_08_CS', role: 'PRIMARY', allocationPct: 100 }, // EMP001 owns BR_01 & BR_08
  { employeeCode: 'EMP009', processCode: 'PR_09_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP010', processCode: 'PR_10_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP011', processCode: 'PR_11_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP012', processCode: 'PR_12_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP013', processCode: 'PR_13_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP014', processCode: 'PR_14_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP015', processCode: 'PR_15_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP017', processCode: 'PR_16_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP018', processCode: 'PR_17_CS', role: 'PRIMARY', allocationPct: 100 }, // EMP018 owns BR_17 & BR_18
  { employeeCode: 'EMP018', processCode: 'PR_18_CS', role: 'PRIMARY', allocationPct: 100 }, // STRUCTURALLY UNCOVERABLE (No backup)
  { employeeCode: 'EMP019', processCode: 'PR_19_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP020', processCode: 'PR_20_CS', role: 'PRIMARY', allocationPct: 100 },

  // Multi-Employee Brands
  // BR_21: 3 People split by process
  { employeeCode: 'EMP019', processCode: 'PR_21_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP020', processCode: 'PR_21_ACC', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP021', processCode: 'PR_21_NDR', role: 'PRIMARY', allocationPct: 100 }, // Demo Scenario 2

  // BR_22: 3 People split by process
  { employeeCode: 'EMP025', processCode: 'PR_22_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP026', processCode: 'PR_22_ACC', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP027', processCode: 'PR_22_NDR', role: 'PRIMARY', allocationPct: 100 },

  // BR_23: 2 People split by process
  { employeeCode: 'EMP027', processCode: 'PR_23_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP028', processCode: 'PR_23_ACC', role: 'PRIMARY', allocationPct: 100 },

  // BR_24: 2 People (CUSTOM Mon-Fri)
  { employeeCode: 'EMP029', processCode: 'PR_24_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP030', processCode: 'PR_24_RET', role: 'PRIMARY', allocationPct: 100 },

  // BR_25: 2 People sharing the same process (PR_25_CS) to satisfy weekend minStaff=2
  { employeeCode: 'EMP005', processCode: 'PR_25_CS', role: 'PRIMARY', allocationPct: 100 },
  { employeeCode: 'EMP006', processCode: 'PR_25_CS', role: 'PRIMARY', allocationPct: 100 },

  // 5 Cross-Trained Floaters (BACKUP on 4-6 brands each)
  // Floater 1: EMP008 (Pod Falcon) -> Backs up Falcon brands
  { employeeCode: 'EMP008', processCode: 'PR_01_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP008', processCode: 'PR_02_CS', role: 'BACKUP', allocationPct: 100 }, // Covers Demo Scenario 1!
  { employeeCode: 'EMP008', processCode: 'PR_04_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP008', processCode: 'PR_05_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP008', processCode: 'PR_06_CS', role: 'BACKUP', allocationPct: 100 },

  // Floater 2: EMP016 (Pod Titan) -> Backs up Titan brands
  { employeeCode: 'EMP016', processCode: 'PR_09_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP016', processCode: 'PR_10_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP016', processCode: 'PR_11_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP016', processCode: 'PR_12_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP016', processCode: 'PR_13_CS', role: 'BACKUP', allocationPct: 100 },

  // Floater 3: EMP024 (Pod Phoenix) -> Backs up Phoenix brands
  { employeeCode: 'EMP024', processCode: 'PR_16_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP024', processCode: 'PR_17_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP024', processCode: 'PR_19_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP024', processCode: 'PR_20_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP024', processCode: 'PR_21_CS', role: 'BACKUP', allocationPct: 100 },

  // Floater 4: EMP031 (Pod Apex) -> Backs up Apex brands
  { employeeCode: 'EMP031', processCode: 'PR_22_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP031', processCode: 'PR_23_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP031', processCode: 'PR_24_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP031', processCode: 'PR_25_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP031', processCode: 'PR_07_CS', role: 'BACKUP', allocationPct: 100 },

  // Floater 5: EMP032 (Pod Apex) -> Cross-pod floater
  { employeeCode: 'EMP032', processCode: 'PR_14_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP032', processCode: 'PR_15_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP032', processCode: 'PR_02_CS', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP032', processCode: 'PR_04_ACC', role: 'BACKUP', allocationPct: 100 },
  { employeeCode: 'EMP032', processCode: 'PR_21_NDR', role: 'BACKUP', allocationPct: 100 },
];

export const ABSENCES: RawAbsence[] = [
  // Approved leaves
  {
    employeeCode: 'EMP002',
    type: 'PLANNED_LEAVE',
    startDate: '2026-12-08',
    endDate: '2026-12-10',
    status: 'APPROVED',
    reason: 'Personal vacation (Demo Scenario 1: Sole-resource 365 brand leave)',
  },
  {
    employeeCode: 'EMP018',
    type: 'PLANNED_LEAVE',
    startDate: '2026-12-21',
    endDate: '2026-12-23',
    status: 'APPROVED',
    reason: 'Family wedding (Demo Scenario 3: Cascade across BR_17 and BR_18)',
  },
  {
    employeeCode: 'EMP026',
    type: 'PLANNED_LEAVE',
    startDate: '2026-12-14',
    endDate: '2026-12-15',
    status: 'APPROVED',
    reason: 'Medical rest',
  },
  // Approved comp-offs
  {
    employeeCode: 'EMP005',
    type: 'COMP_OFF',
    startDate: '2026-12-04',
    endDate: '2026-12-04',
    status: 'APPROVED',
    reason: 'Redemption of earned holiday overtime',
  },
  {
    employeeCode: 'EMP012',
    type: 'COMP_OFF',
    startDate: '2026-12-11',
    endDate: '2026-12-11',
    status: 'APPROVED',
    reason: 'Redemption of weekend shift comp-off',
  },
  // Pending requests (for live Safe-to-Approve Calendar demonstration)
  {
    employeeCode: 'EMP001',
    type: 'PLANNED_LEAVE',
    startDate: '2026-12-16',
    endDate: '2026-12-17',
    status: 'PENDING',
    reason: 'Ops Lead Aarav leave request (Test Safe-to-Approve Calendar)',
  },
  {
    employeeCode: 'EMP021',
    type: 'PLANNED_LEAVE',
    startDate: '2026-12-28',
    endDate: '2026-12-29',
    status: 'PENDING',
    reason: 'NDR owner absence on BR_21 (Demo Scenario 2: Qualified peer borrow)',
  },
];

export const DEMO_SCENARIOS = [
  {
    name: 'Scenario 1: Sole-Resource Leave on 365-Day Brand',
    changeSet: {
      type: 'ADD_ABSENCE',
      employeeCode: 'EMP002',
      absenceType: 'PLANNED_LEAVE',
      startDate: '2026-12-08',
      endDate: '2026-12-10',
      reason: 'Sole owner of 365-day brand BR_02 absent; backup EMP008 available',
    },
    result: {
      expectedGapsWithoutBackup: 3,
      rankedQuickFix: 'Activate floater EMP008 on PR_02_CS',
    },
  },
  {
    name: 'Scenario 2: One of Three Unavailable (Qualification Constraint)',
    changeSet: {
      type: 'ADD_ABSENCE',
      employeeCode: 'EMP021',
      absenceType: 'PLANNED_LEAVE',
      startDate: '2026-12-28',
      endDate: '2026-12-29',
      reason: 'NDR lead absent; remaining CS/ACC peers not qualified for NDR',
    },
    result: {
      expectedGaps: 2,
      remedy: 'Borrow cross-trained floater EMP032 with NDR skill',
    },
  },
  {
    name: 'Scenario 3: Multi-Brand Cascade Leave',
    changeSet: {
      type: 'ADD_ABSENCE',
      employeeCode: 'EMP018',
      absenceType: 'PLANNED_LEAVE',
      startDate: '2026-12-21',
      endDate: '2026-12-23',
      reason: 'Leave for owner of both BR_17 and BR_18 triggers CASCADE_GAP',
    },
    result: {
      affectedBrands: ['BR_17', 'BR_18'],
      conflictType: 'CASCADE_GAP',
    },
  },
  {
    name: 'Scenario 4: Brand Calendar Switch (Sun-Off to 365)',
    changeSet: {
      type: 'CHANGE_CALENDAR',
      brandCode: 'BR_13',
      newCalendarCode: 'CAL_365',
      reason: 'Brand switches from Sunday-off to 365 days, introducing Sunday demand',
    },
    result: {
      newSundayGaps: 4,
      remedy: 'Assign floater or secondary coverage',
    },
  },
];

export const GLOBAL_SETTINGS = {
  maxConsecutiveWorkDays: 6,
  maxBackupBrandsPerDay: 2,
  fiscalWeekStart: 1, // Monday
  compOffValidityDays: 30,
  solverTimeLimitSec: 20,
  weightProfiles: {
    BALANCED: { gapWeight: 100000, offMissingWeight: 500, stabilityWeight: 200, prefWeight: 20 },
    COVERAGE_FIRST: { gapWeight: 500000, offMissingWeight: 200, stabilityWeight: 50, prefWeight: 5 },
    FAIRNESS_FIRST: { gapWeight: 100000, offMissingWeight: 800, fairnessWeight: 400, prefWeight: 10 },
    PREFERENCE_FIRST: { gapWeight: 80000, offMissingWeight: 300, prefWeight: 250 },
  },
};
