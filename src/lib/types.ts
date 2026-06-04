export type SyncMode = "LOCAL_ONLY" | "LOCAL_FIRST" | "OPT_IN_SYNC";
export type TaxMode = "INCLUSIVE" | "EXCLUSIVE";
export type WeddingType = "DESTINATION" | "TRADITIONAL" | "CULTURAL" | "DESTINATION_CULTURAL" | "MULTI_DAY";
export type WeddingStatus = "PLANNING" | "IN_PROGRESS" | "READY" | "CLIENT_REVIEW" | "IN_EXECUTION" | "COMPLETED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type ImpactArea = "GUESTS" | "BUDGET" | "VENDORS" | "TIMELINE" | "LOGISTICS" | "RISK" | "CLIENT";
export type ReadinessArea = "VENDOR" | "VENUE" | "DESTINATION";
export type ReadinessStatus = "READY" | "WATCH" | "BLOCKED";
export type ClientApprovalState = "DRAFT" | "CLIENT_REVIEW" | "APPROVED" | "ESCALATION";
export type VendorCategory = "CATERING" | "DECOR" | "PHOTO_VIDEO" | "MUSIC" | "LOGISTICS" | "BEAUTY" | "OTHER";
export type VendorStatus = "LEAD" | "QUOTED" | "CONTRACTED" | "PAID" | "AT_RISK";
export type VenueStatus = "SHORTLISTED" | "HOLD" | "CONTRACTED" | "PERMIT_PENDING" | "READY";
export type AccountRole = "OWNER" | "PLANNER" | "PRODUCTION" | "CLIENT" | "VENDOR" | "VIEWER";
export type AccountStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
export type PortalAccess = "NONE" | "CLIENT_PORTAL" | "VENDOR_PORTAL" | "FULL_WORKSPACE";
export type RsvpStatus = "INVITED" | "YES" | "NO" | "MAYBE" | "NO_RESPONSE";
export type MealPreference = "VEGETARIAN" | "STANDARD" | "SEAFOOD" | "VEGAN" | "JAIN" | "KOSHER" | "HALAL" | "OTHER";
export type LeadSource = "REFERRAL" | "SEARCH" | "SOCIAL" | "VENDOR" | "PARTNERSHIP" | "CAMPAIGN" | "OTHER";
export type LeadStatus = "NEW" | "QUALIFIED" | "QUOTING" | "WON" | "LOST" | "ARCHIVED";
export type QuoteStatus = "NOT_SENT" | "DRAFTING" | "SENT" | "NEGOTIATION" | "ACCEPTED" | "DECLINED";

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  note: string;
}

export interface FileReference {
  id: string;
  name: string;
  kind: "CONTRACT" | "QUOTE" | "MOODBOARD" | "PERMIT" | "INVOICE" | "CLIENT_NOTE" | "OTHER";
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  storageProvider?: "local-data-url" | "server-file" | "external-object";
  storageKey?: string;
  addedAt: string;
}

export interface ApprovalComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  state: ClientApprovalState;
  actor: string;
  createdAt: string;
  note: string;
}

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

export interface AccountUser {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  portalAccess: PortalAccess;
  lastActiveAt?: string;
}

export interface TeamInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: AccountRole;
  portalAccess: PortalAccess;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
}

export interface WorkspaceAccount {
  id: string;
  name: string;
  ownerUserId: string;
  region: string;
  dataResidency: string;
  authProvider: "LOCAL" | "GOOGLE" | "OIDC";
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  workspaceId: string;
  role: AccountRole;
  issuedAt: string;
  expiresAt: string;
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

export interface ReadinessItem {
  id: string;
  area: ReadinessArea;
  label: string;
  owner: string;
  status: ReadinessStatus;
  score: number;
  linkedTaskIds: string[];
  notes: string;
}

export interface CulturalChecklistItem {
  id: string;
  label: string;
  culture: string;
  owner: string;
  status: TaskStatus;
  linkedTaskIds: string[];
}

export interface Vendor {
  id: string;
  weddingId: string;
  name: string;
  category: VendorCategory;
  owner: string;
  status: VendorStatus;
  estimate: number;
  currency: string;
  linkedTaskIds: string[];
  notes: string;
  contactName?: string;
  contactEmail?: string;
  contractStatus?: "DRAFT" | "PENDING_SIGNATURE" | "ACTIVE" | "COMPLETED";
  paymentStatus?: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  logisticsNotes?: string;
  riskNotes?: string;
  files?: FileReference[];
}

export interface Venue {
  id: string;
  weddingId: string;
  name: string;
  city: string;
  country: string;
  status: VenueStatus;
  capacity: number;
  curfew: string;
  linkedTaskIds: string[];
  notes: string;
  contactName?: string;
  contactEmail?: string;
  permitStatus?: "NOT_REQUIRED" | "PENDING" | "SUBMITTED" | "APPROVED";
  accessWindow?: string;
  logisticsNotes?: string;
  riskNotes?: string;
  files?: FileReference[];
}

export interface DestinationProfile {
  id: string;
  weddingId: string;
  name: string;
  region: string;
  travelRisk: "LOW" | "MEDIUM" | "HIGH";
  visaNotes: string;
  weatherNotes: string;
  culturalNotes: string;
  linkedTaskIds: string[];
  permitNotes?: string;
  logisticsNotes?: string;
  riskNotes?: string;
  files?: FileReference[];
}

export interface ClientApproval {
  id: string;
  weddingId: string;
  title: string;
  owner: string;
  state: ClientApprovalState;
  dueAt: string;
  linkedTaskIds: string[];
  comments?: ApprovalComment[];
  history?: ApprovalHistoryEntry[];
  files?: FileReference[];
  decidedAt?: string;
  decisionNote?: string;
}

export interface Guest {
  id: string;
  weddingId: string;
  householdId: string;
  name: string;
  email?: string;
  groupName: string;
  rsvpStatus: RsvpStatus;
  mealPreference: MealPreference;
  seatPreference?: string;
  notes?: string;
}

export interface SeatingTable {
  id: string;
  weddingId: string;
  name: string;
  zone: string;
  capacity: number;
  guestIds: string[];
  notes?: string;
}

export interface PipelineLead {
  id: string;
  clientName: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  quoteStatus: QuoteStatus;
  projectedBudget: number;
  currency: string;
  preferredDate: string;
  destinationCity: string;
  nextAction: string;
  followUpAt: string;
  confidenceScore: number;
}

export interface AnalyticsMetric {
  id: string;
  label: string;
  value: string;
  trend: string;
  status: "GOOD" | "WATCH" | "RISK";
}

export interface ClientStatusSummary {
  relationshipOwner: string;
  approvalState: ClientApprovalState;
  nextClientUpdateAt: string;
  experienceScore: number;
  sentiment: "CALM" | "ENGAGED" | "CONCERNED";
  pendingDecisions: string[];
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
  readinessItems: ReadinessItem[];
  culturalChecklist: CulturalChecklistItem[];
  clientStatus: ClientStatusSummary;
  notes: string;
}

export interface AppState {
  workspace: WorkspaceAccount;
  users: AccountUser[];
  invites: TeamInvite[];
  session: AuthSession;
  profile: PlannerProfile;
  settings: PlannerSettings;
  weddings: Wedding[];
  tasks: Task[];
  vendors: Vendor[];
  venues: Venue[];
  destinations: DestinationProfile[];
  clientApprovals: ClientApproval[];
  guests: Guest[];
  seatingTables: SeatingTable[];
  pipelineLeads: PipelineLead[];
  auditLogs: AuditLogEntry[];
  analytics: AnalyticsMetric[];
  activeWeddingId: string;
  onboarded: boolean;
}

export interface ImpactRow {
  area: string;
  title: string;
  change: string;
}
