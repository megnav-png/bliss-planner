export type SyncMode = "LOCAL_ONLY" | "LOCAL_FIRST" | "OPT_IN_SYNC";
export type TaxMode = "INCLUSIVE" | "EXCLUSIVE";
export type WeddingType = "DESTINATION" | "TRADITIONAL" | "CULTURAL" | "DESTINATION_CULTURAL" | "MULTI_DAY";
export type WeddingStatus = "PLANNING" | "IN_PROGRESS" | "READY" | "CLIENT_REVIEW" | "IN_EXECUTION" | "COMPLETED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type ImpactArea = "GUESTS" | "BUDGET" | "VENDORS" | "TIMELINE" | "LOGISTICS" | "RISK" | "CLIENT";

export interface PlannerSettings {
  baseCurrency: string;
  bookingCurrency: string;
  displayCurrency: string;
  timezone: string;
  locale: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  distanceUnit: "km" | "mi";
  weightUnit: "kg" | "lb";
  taxMode: TaxMode;
  taxRatePercent: number;
  defaultLeadTimeDays: number;
  rsvpReminderOffset: number;
  syncMode: SyncMode;
}

export interface PlannerProfile {
  name: string;
  email: string;
  businessName: string;
}

export interface BudgetLine {
  id: string;
  category: string;
  planned: number;
  actual: number;
}

export interface Budget {
  lines: BudgetLine[];
}

export interface GuestGroup {
  id: string;
  name: string;
  total: number;
  vegetarian: number;
  standard: number;
  seafood: number;
  roomNeed: number;
}

export interface Task {
  id: string;
  weddingId: string;
  title: string;
  owner: string;
  priority: Priority;
  status: TaskStatus;
  dueAt: string;
  dependsOn: string[];
  impacts: ImpactArea[];
}

export interface Wedding {
  id: string;
  title: string;
  date: string;
  timezone: string;
  destination: string;
  type: WeddingType;
  status: WeddingStatus;
  currency: string;
  guestTarget: number;
  rsvpYes: number;
  rsvpPending: number;
  budget: Budget;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  guestGroups: GuestGroup[];
  notes: string;
}

export interface AppState {
  profile: PlannerProfile;
  settings: PlannerSettings;
  weddings: Wedding[];
  tasks: Task[];
  activeWeddingId: string;
  onboarded: boolean;
}

export interface ImpactRow {
  area: string;
  title: string;
  change: string;
}
