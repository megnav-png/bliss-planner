import { AppState, BudgetLine, GuestGroup, Task } from "./types";

const budgetLines: BudgetLine[] = [
  { id: "line-venue", category: "Venue", planned: 160000, actual: 96000 },
  { id: "line-catering", category: "Catering", planned: 98000, actual: 32000 },
  { id: "line-decor", category: "Decor", planned: 52000, actual: 18000 },
  { id: "line-travel", category: "Travel", planned: 70000, actual: 7000 }
];

const guestGroups: GuestGroup[] = [
  { id: "gg-kyoto-japan", name: "Family (Japan)", total: 61, vegetarian: 8, standard: 40, seafood: 13, roomNeed: 45 },
  { id: "gg-kyoto-india", name: "Family (India)", total: 44, vegetarian: 20, standard: 24, seafood: 0, roomNeed: 30 }
];

const tasks: Task[] = [
  {
    id: "task-001",
    weddingId: "wed_kyoto_001",
    title: "Finalize caterer menu with meal diversity",
    owner: "Operations",
    priority: "HIGH",
    status: "IN_PROGRESS",
    dueAt: "2026-10-01",
    dependsOn: [],
    impacts: ["GUESTS", "BUDGET", "VENDORS"]
  },
  {
    id: "task-002",
    weddingId: "wed_kyoto_001",
    title: "Confirm Shinto ceremony protocol",
    owner: "Planner",
    priority: "CRITICAL",
    status: "BLOCKED",
    dueAt: "2026-10-10",
    dependsOn: ["task-001"],
    impacts: ["TIMELINE", "RISK"]
  },
  {
    id: "task-003",
    weddingId: "wed_marrakech_001",
    title: "Collect passport and ID list for airport transfer vendor",
    owner: "Planner",
    priority: "MEDIUM",
    status: "TODO",
    dueAt: "2026-12-10",
    dependsOn: [],
    impacts: ["LOGISTICS", "CLIENT"]
  }
];

export const seedState: AppState = {
  profile: {
    name: "Aster Bellamy",
    email: "planner@blissplanner.example",
    businessName: "Aster Knot Studio"
  },
  settings: {
    baseCurrency: "USD",
    bookingCurrency: "USD",
    displayCurrency: "USD",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    distanceUnit: "km",
    weightUnit: "kg",
    taxMode: "INCLUSIVE",
    taxRatePercent: 0,
    defaultLeadTimeDays: 14,
    rsvpReminderOffset: 7,
    syncMode: "LOCAL_ONLY"
  },
  weddings: [
    {
      id: "wed_kyoto_001",
      title: "Maya & Kenji",
      date: "2026-11-14",
      timezone: "Asia/Tokyo",
      destination: "Kyoto, Japan",
      type: "DESTINATION_CULTURAL",
      status: "PLANNING",
      currency: "JPY",
      guestTarget: 220,
      rsvpYes: 142,
      rsvpPending: 43,
      budget: { lines: budgetLines },
      riskLevel: "MEDIUM",
      guestGroups,
      notes: "Shinto sequence requires ceremonial approvals."
    },
    {
      id: "wed_marrakech_001",
      title: "Amina & Lucas",
      date: "2027-03-03",
      timezone: "Africa/Casablanca",
      destination: "Marrakech, Morocco",
      type: "DESTINATION_CULTURAL",
      status: "IN_PROGRESS",
      currency: "MAD",
      guestTarget: 180,
      rsvpYes: 101,
      rsvpPending: 28,
      budget: {
        lines: [
          { id: "line2-venue", category: "Venue", planned: 92000, actual: 22000 },
          { id: "line2-travel", category: "Transport", planned: 38000, actual: 11000 },
          { id: "line2-catering", category: "Catering", planned: 78000, actual: 0 }
        ]
      },
      riskLevel: "HIGH",
      guestGroups: [
        { id: "gg-marr-001", name: "Family and close friends", total: 92, vegetarian: 22, standard: 65, seafood: 5, roomNeed: 40 }
      ],
      notes: "Destination logistics are the highest-risk area."
    }
  ],
  tasks,
  activeWeddingId: "wed_kyoto_001",
  onboarded: false
};
