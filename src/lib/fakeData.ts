import {
  AppState,
  BudgetLine,
  ClientApproval,
  CulturalChecklistItem,
  DestinationProfile,
  GuestGroup,
  ReadinessItem,
  Task,
  Vendor,
  Venue
} from "./types";

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

const vendors: Vendor[] = [
  {
    id: "vendor-kyoto-caterer",
    weddingId: "wed_kyoto_001",
    name: "Kyo Table Collective",
    category: "CATERING",
    owner: "Operations",
    status: "QUOTED",
    estimate: 98000,
    currency: "JPY",
    linkedTaskIds: ["task-001"],
    notes: "Needs final vegetarian/seafood split before contract lock."
  },
  {
    id: "vendor-kyoto-decor",
    weddingId: "wed_kyoto_001",
    name: "Golden Moss Floral",
    category: "DECOR",
    owner: "Production",
    status: "CONTRACTED",
    estimate: 52000,
    currency: "JPY",
    linkedTaskIds: [],
    notes: "Install schedule depends on venue access window."
  },
  {
    id: "vendor-marrakech-transfer",
    weddingId: "wed_marrakech_001",
    name: "Atlas Arrival Logistics",
    category: "LOGISTICS",
    owner: "Guest Ops",
    status: "AT_RISK",
    estimate: 38000,
    currency: "MAD",
    linkedTaskIds: ["task-003"],
    notes: "Awaiting passport and ID list."
  }
];

const venues: Venue[] = [
  {
    id: "venue-kyoto-shrine",
    weddingId: "wed_kyoto_001",
    name: "Higashiyama Garden Shrine",
    city: "Kyoto",
    country: "Japan",
    status: "PERMIT_PENDING",
    capacity: 240,
    curfew: "21:30",
    linkedTaskIds: ["task-002"],
    notes: "Ceremony protocol approval required before final run sheet."
  },
  {
    id: "venue-marrakech-riad",
    weddingId: "wed_marrakech_001",
    name: "Riad El Noor",
    city: "Marrakech",
    country: "Morocco",
    status: "HOLD",
    capacity: 190,
    curfew: "23:00",
    linkedTaskIds: [],
    notes: "Sound permit and buyout contract are the next gates."
  }
];

const destinations: DestinationProfile[] = [
  {
    id: "destination-kyoto",
    weddingId: "wed_kyoto_001",
    name: "Kyoto destination profile",
    region: "East Asia",
    travelRisk: "LOW",
    visaNotes: "Check nationality-specific visa rules 90 days before arrival.",
    weatherNotes: "Autumn evenings can be cool; shawl note recommended.",
    culturalNotes: "Brief guests on shrine etiquette, shoes, and photography limits.",
    linkedTaskIds: ["task-002"]
  },
  {
    id: "destination-marrakech",
    weddingId: "wed_marrakech_001",
    name: "Marrakech destination profile",
    region: "North Africa",
    travelRisk: "MEDIUM",
    visaNotes: "Collect passport details for transfer manifest and hotel pre-check.",
    weatherNotes: "Dry daytime heat with cooler evenings; hydration plan needed.",
    culturalNotes: "Add dress, local host etiquette, and tea-service guidance.",
    linkedTaskIds: ["task-003"]
  }
];

const clientApprovals: ClientApproval[] = [
  {
    id: "approval-kyoto-shrine",
    weddingId: "wed_kyoto_001",
    title: "Shrine protocol and procession sign-off",
    owner: "Aster Bellamy",
    state: "CLIENT_REVIEW",
    dueAt: "2026-09-22",
    linkedTaskIds: ["task-002"]
  },
  {
    id: "approval-kyoto-menu",
    weddingId: "wed_kyoto_001",
    title: "Final vegetarian and seafood count",
    owner: "Operations",
    state: "DRAFT",
    dueAt: "2026-09-28",
    linkedTaskIds: ["task-001"]
  },
  {
    id: "approval-marrakech-transfer",
    weddingId: "wed_marrakech_001",
    title: "Airport transfer guest ID pack",
    owner: "Guest Ops",
    state: "ESCALATION",
    dueAt: "2026-12-04",
    linkedTaskIds: ["task-003"]
  }
];

const kyotoReadiness: ReadinessItem[] = [
  {
    id: "ready-kyoto-catering",
    area: "VENDOR",
    label: "Caterer menu, tastings, and service load",
    owner: "Operations",
    status: "WATCH",
    score: 72,
    linkedTaskIds: ["task-001"],
    notes: "Meal diversity and portion planning depend on final RSVP movement."
  },
  {
    id: "ready-kyoto-decor",
    area: "VENDOR",
    label: "Decorator and floral contractor scope",
    owner: "Production",
    status: "READY",
    score: 86,
    linkedTaskIds: [],
    notes: "Concept lock is ready; install run sheet needs final site timing."
  },
  {
    id: "ready-kyoto-venue",
    area: "VENUE",
    label: "Ceremony approvals and venue protocol",
    owner: "Planner",
    status: "BLOCKED",
    score: 58,
    linkedTaskIds: ["task-002"],
    notes: "Shinto ceremony protocol is blocking final day plan approval."
  },
  {
    id: "ready-kyoto-destination",
    area: "DESTINATION",
    label: "Travel, rooming, and arrival logistics",
    owner: "Guest Ops",
    status: "WATCH",
    score: 69,
    linkedTaskIds: [],
    notes: "Rooming estimate changes with guest target and international group counts."
  }
];

const kyotoCulture: CulturalChecklistItem[] = [
  {
    id: "culture-kyoto-shinto",
    label: "Confirm shrine etiquette and family procession sequence",
    culture: "Japanese Shinto",
    owner: "Planner",
    status: "BLOCKED",
    linkedTaskIds: ["task-002"]
  },
  {
    id: "culture-kyoto-meals",
    label: "Validate vegetarian and seafood menu split",
    culture: "Japanese and Indian families",
    owner: "Operations",
    status: "IN_PROGRESS",
    linkedTaskIds: ["task-001"]
  },
  {
    id: "culture-kyoto-welcome",
    label: "Prepare bilingual welcome notes and guest briefing",
    culture: "Global guests",
    owner: "Client Experience",
    status: "TODO",
    linkedTaskIds: []
  }
];

const marrakechReadiness: ReadinessItem[] = [
  {
    id: "ready-marrakech-catering",
    area: "VENDOR",
    label: "Catering deposit and halal/vegetarian split",
    owner: "Operations",
    status: "WATCH",
    score: 64,
    linkedTaskIds: [],
    notes: "Menu lock is pending vendor confirmation."
  },
  {
    id: "ready-marrakech-venue",
    area: "VENUE",
    label: "Riad buyout, permits, and sound timing",
    owner: "Planner",
    status: "WATCH",
    score: 67,
    linkedTaskIds: [],
    notes: "Permit and curfew notes should move into the day-before run sheet."
  },
  {
    id: "ready-marrakech-destination",
    area: "DESTINATION",
    label: "Airport transfers and guest ID pack",
    owner: "Guest Ops",
    status: "BLOCKED",
    score: 52,
    linkedTaskIds: ["task-003"],
    notes: "Passport and ID collection gates transfer planning."
  }
];

const marrakechCulture: CulturalChecklistItem[] = [
  {
    id: "culture-marrakech-welcome",
    label: "Confirm welcome dinner flow and local host etiquette",
    culture: "Moroccan destination wedding",
    owner: "Client Experience",
    status: "TODO",
    linkedTaskIds: []
  },
  {
    id: "culture-marrakech-menu",
    label: "Review halal, vegetarian, and late-night tea service",
    culture: "Moroccan and European families",
    owner: "Operations",
    status: "IN_PROGRESS",
    linkedTaskIds: []
  },
  {
    id: "culture-marrakech-travel",
    label: "Share cultural dress, weather, and arrival guidance",
    culture: "Global guests",
    owner: "Guest Ops",
    status: "TODO",
    linkedTaskIds: ["task-003"]
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
      readinessItems: kyotoReadiness,
      culturalChecklist: kyotoCulture,
      clientStatus: {
        relationshipOwner: "Aster Bellamy",
        approvalState: "CLIENT_REVIEW",
        nextClientUpdateAt: "2026-09-22",
        experienceScore: 82,
        sentiment: "ENGAGED",
        pendingDecisions: ["Shrine protocol sign-off", "Final vegetarian count", "Welcome dinner copy"]
      },
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
      readinessItems: marrakechReadiness,
      culturalChecklist: marrakechCulture,
      clientStatus: {
        relationshipOwner: "Aster Bellamy",
        approvalState: "ESCALATION",
        nextClientUpdateAt: "2026-12-04",
        experienceScore: 68,
        sentiment: "CONCERNED",
        pendingDecisions: ["Airport transfer ID pack", "Riad sound permit", "Welcome dinner host notes"]
      },
      notes: "Destination logistics are the highest-risk area."
    }
  ],
  tasks,
  vendors,
  venues,
  destinations,
  clientApprovals,
  activeWeddingId: "wed_kyoto_001",
  onboarded: false
};
