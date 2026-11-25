// Shared business rules for ROADRESCUE.

export const APP_NAME = "ROADRESCUE";

// Areas we cover in the pilot (Phase 1 of our strategy).
export const AREAS = [
  "Kampala Central",
  "Ntinda",
  "Nakawa",
  "Kansanga",
  "Makindye",
  "Rubaga",
  "Kawempe",
  "Entebbe Road",
  "Mukono",
  "Wakiso",
];

// Approximate centre of each area, used only to draw the map and estimate distances.
// These are public place locations, not anyone's personal position.
export const AREA_COORDS = {
  "Kampala Central": [0.3136, 32.5811],
  Ntinda: [0.354, 32.614],
  Nakawa: [0.3326, 32.6145],
  Kansanga: [0.2936, 32.6105],
  Makindye: [0.283, 32.596],
  Rubaga: [0.303, 32.553],
  Kawempe: [0.378, 32.558],
  "Entebbe Road": [0.265, 32.564],
  Mukono: [0.3533, 32.7553],
  Wakiso: [0.4044, 32.4594],
};

// The two kinds of helper. Each service in the catalogue is done by one kind.
export const PROVIDER_ROLES = ["mechanic", "driver"];
export const PROVIDER_LABEL = { mechanic: "Mechanic", driver: "Driver" };

// Step 1 of a request: what kind of help does the customer need?
// Each "need" maps to service categories in the catalogue.
export const NEEDS = [
  {
    key: "repair",
    title: "Fix a mechanical problem",
    blurb: "Battery, tyres, brakes, overheating - a mechanic comes to you.",
    categories: ["Battery & electrics", "Tyres", "Engine", "Brakes", "General"],
    provider: "mechanic",
  },
  {
    key: "tow",
    title: "Tow my vehicle",
    blurb: "Car or truck won't move? We tow it to a garage you choose.",
    categories: ["Towing"],
    provider: "mechanic",
  },
  {
    key: "driver",
    title: "Get a driver",
    blurb: "Too tired, unwell or had a drink? A vetted driver drives you in your car.",
    categories: ["Driver"],
    provider: "driver",
  },
  {
    key: "fuel",
    title: "Fuel delivery",
    blurb: "Ran dry? We bring fuel to wherever you stopped.",
    categories: ["Fuel"],
    provider: "mechanic",
  },
  {
    key: "unsure",
    title: "Not sure what's wrong",
    blurb: "A mechanic comes, finds the problem and tells you the price first.",
    categories: ["General"],
    provider: "mechanic",
  },
];

export function needByKey(key) {
  return NEEDS.find((n) => n.key === key) || null;
}

// Step 2 of a request: what does the customer drive?
// Popular models are only suggestions - customers can type any model.
export const CAR_MAKES = {
  Toyota: ["Premio", "Allion", "Corolla", "Harrier", "RAV4", "Land Cruiser Prado", "Noah", "Wish", "Vitz", "Mark X", "Hilux", "Hiace"],
  Nissan: ["X-Trail", "Note", "March", "Navara", "Caravan", "Dualis"],
  Subaru: ["Forester", "Impreza", "Legacy", "Outback", "XV"],
  Honda: ["Fit", "CR-V", "Civic", "Vezel"],
  Mitsubishi: ["Pajero", "Outlander", "L200", "RVR", "Fuso Canter"],
  Mazda: ["Demio", "Axela", "Atenza", "CX-5"],
  Isuzu: ["D-Max", "Elf", "Forward", "NPR"],
  Suzuki: ["Swift", "Escudo", "Every", "Jimny"],
  "Mercedes-Benz": ["C-Class", "E-Class", "ML", "Actros"],
  BMW: ["3 Series", "5 Series", "X3", "X5"],
  Volkswagen: ["Golf", "Polo", "Tiguan", "Touareg"],
  Hyundai: ["Tucson", "Santa Fe", "Elantra", "H-1"],
  Ford: ["Ranger", "Everest", "Escape", "Transit"],
  "Land Rover": ["Range Rover", "Discovery", "Defender", "Freelander"],
  Lexus: ["RX", "LX", "IS", "NX"],
  Chevrolet: ["Cruze", "Captiva", "Trailblazer", "Silverado"],
  Porsche: ["Cayenne", "Macan", "Panamera", "911"],
  Other: [],
};
export const MAKES = Object.keys(CAR_MAKES);
export const BODY_TYPES = ["Saloon", "Hatchback", "SUV", "Pickup", "Van / Minibus", "Truck"];
export const CAR_COLOURS = ["White", "Silver", "Black", "Grey", "Blue", "Red", "Green", "Other"];

// Commission ROADRESCUE keeps (from the business model).
export const COMMISSION = {
  SERVICE: 0.15, // 15% of labour
  PART: 0.05, // 5% of spare parts
};

// Customers can open a warranty claim within this many days of completion.
export const WARRANTY_DAYS = 7;

// Login protection: lock an account after this many failed attempts in the window.
export const MAX_FAILED_LOGINS = 5;
export const LOGIN_WINDOW_MINUTES = 15;

// Order statuses, in the order a normal job moves through them.
export const STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  SEARCHING: "SEARCHING",
  ACCEPTED: "ACCEPTED",
  EN_ROUTE: "EN_ROUTE",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_CONFIRMATION: "AWAITING_CONFIRMATION",
  COMPLETED: "COMPLETED",
  DISPUTED: "DISPUTED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
};

export const STATUS_LABEL = {
  PENDING_PAYMENT: "Waiting for payment",
  SEARCHING: "Finding a mechanic",
  ACCEPTED: "Mechanic assigned",
  EN_ROUTE: "Mechanic on the way",
  IN_PROGRESS: "Fixing your car",
  AWAITING_CONFIRMATION: "Done - please confirm",
  COMPLETED: "Completed",
  DISPUTED: "Problem reported",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

// Wording for jobs done by a driver instead of a mechanic.
const DRIVER_STATUS_LABEL = {
  SEARCHING: "Finding a driver",
  ACCEPTED: "Driver assigned",
  EN_ROUTE: "Driver on the way",
  IN_PROGRESS: "Driving you",
  AWAITING_CONFIRMATION: "Arrived - please confirm",
};

export function statusLabel(status, kind = "mechanic") {
  return (kind === "driver" && DRIVER_STATUS_LABEL[status]) || STATUS_LABEL[status] || status;
}

// The happy path shown on the tracking timeline.
export const TIMELINE = [
  "PENDING_PAYMENT",
  "SEARCHING",
  "ACCEPTED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "AWAITING_CONFIRMATION",
  "COMPLETED",
];

// Which status changes are allowed, and who may make them.
// This state machine is the heart of transaction integrity.
// "mechanic" and "driver" are both helpers: each only moves jobs of their own kind
// (checked in orders.js), but the steps are the same.
export const TRANSITIONS = {
  PENDING_PAYMENT: { SEARCHING: ["system"], CANCELLED: ["customer", "admin"] },
  SEARCHING: { ACCEPTED: ["mechanic", "driver"], CANCELLED: ["customer", "admin"] },
  ACCEPTED: { EN_ROUTE: ["mechanic", "driver"], CANCELLED: ["customer", "admin"] },
  EN_ROUTE: { IN_PROGRESS: ["mechanic", "driver"] },
  IN_PROGRESS: { AWAITING_CONFIRMATION: ["mechanic", "driver"] },
  AWAITING_CONFIRMATION: { COMPLETED: ["customer", "admin"], DISPUTED: ["customer"] },
  DISPUTED: { COMPLETED: ["admin"], REFUNDED: ["admin"] },
  COMPLETED: { REFUNDED: ["admin"] }, // only via an approved warranty claim
  CANCELLED: {},
  REFUNDED: {},
};

export function canTransition(from, to, role) {
  const allowed = TRANSITIONS[from]?.[to];
  return Array.isArray(allowed) && allowed.includes(role);
}

// Orders that are still "live" (the tracking page refreshes itself).
export const ACTIVE_STATUSES = ["PENDING_PAYMENT", "SEARCHING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "AWAITING_CONFIRMATION", "DISPUTED"];

// Which roles can open which parts of the site.
export const ROUTE_ROLES = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/mechanic", roles: ["mechanic"] },
  { prefix: "/driver", roles: ["driver"] },
  { prefix: "/request", roles: ["customer"] },
  { prefix: "/cart", roles: ["customer"] },
  { prefix: "/checkout", roles: ["customer"] },
  { prefix: "/orders", roles: ["customer"] },
  { prefix: "/notifications", roles: ["customer", "mechanic", "driver", "admin"] },
];

export function canAccess(pathname, role) {
  const rule = ROUTE_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (!rule) return true; // public page
  return Boolean(role) && rule.roles.includes(role);
}

export function homeForRole(role) {
  if (role === "admin") return "/admin";
  if (role === "mechanic") return "/mechanic";
  if (role === "driver") return "/driver";
  return "/request"; // customers start a new request every time they log in
}
