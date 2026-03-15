// ===== Product Types =====

export type ProductCategory = 'technic' | 'city' | 'starwars' | 'friends' | 'creator' | 'duplo' | 'minifigures';

export interface ProductDef {
  id: ProductCategory;
  name: string;
  emoji: string;
  buyPrice: number;
  sellPrice: number;
  baseDemand: number; // per day
  color: number; // hex color for shelf display
}

export interface InventoryItem {
  categoryId: ProductCategory;
  stock: number;
  onOrder: number; // arriving next day
  onOrderDay: number; // day the order arrives
  totalSold: number;
}

// ===== Customer Types =====

export type CustomerType = 'family' | 'collector' | 'giftBuyer' | 'tourist' | 'enthusiast';

export interface CustomerTypeDef {
  id: CustomerType;
  name: string;
  emoji: string;
  frequency: number; // 0-1 spawn weight
  patience: number; // seconds in game-time
  preferences: ProductCategory[];
  needsHelp: boolean; // requires salesperson
  spendMultiplier: number; // willingness to pay more
}

export type CustomerState = 'entering' | 'browsing' | 'waitingForHelp' | 'atCheckout' | 'buying' | 'leaving' | 'leavingHappy' | 'leavingSad';

export interface Customer {
  id: number;
  type: CustomerType;
  state: CustomerState;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  moveProgress: number; // 0-1 lerp
  patience: number; // remaining seconds
  maxPatience: number;
  desiredCategory: ProductCategory;
  assignedStaff: number | null; // staff id
  checkoutTime: number; // remaining checkout seconds
  spentAmount: number;
}

// ===== Staff Types =====

export type StaffRole = 'salesperson' | 'cashier' | 'stockWorker' | 'shiftManager';

export interface StaffRoleDef {
  id: StaffRole;
  name: string;
  emoji: string;
  salary: number; // per day
  hireCost: number;
}

export interface StaffMember {
  id: number;
  role: StaffRole;
  name: string;
  morale: number; // 0-100
  isTraining: boolean; // first day
  assignedCustomer: number | null;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  moveProgress: number;
}

// ===== Upgrade Types =====

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  recurringCost: number; // per week, 0 if one-time
  effect: string;
  minDay: number;
}

// ===== Event Types =====

export interface GameEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  duration: number; // days
  effect: EventEffect;
}

export interface EventEffect {
  customerMultiplier?: Partial<Record<CustomerType, number>>;
  globalCustomerMultiplier?: number;
  demandMultiplier?: Partial<Record<ProductCategory, number>>;
  patienceMultiplier?: number;
  priceMultiplier?: number;
  deliveryDelay?: number; // extra days
  reputationChange?: number;
  fixCost?: number; // optional fix cost
}

export interface ActiveEvent {
  event: GameEvent;
  daysRemaining: number;
  fixed?: boolean;
}

// ===== Marketing Types =====

export type InfluencerType = 'blogger' | 'youtuber' | 'instagram' | 'tiktoker';

export interface InfluencerDef {
  id: InfluencerType;
  name: string;
  emoji: string;
  cost: number;
  duration: number; // days
  minReputation: number;
  effect: EventEffect;
}

export type LaunchType = 'newSet' | 'vipNight' | 'familyDay' | 'buildContest';

export interface LaunchDef {
  id: LaunchType;
  name: string;
  emoji: string;
  cost: number;
  requirement: string;
  duration: number;
  effect: EventEffect;
}

export interface ActiveMarketing {
  type: 'influencer' | 'launch';
  id: string;
  daysRemaining: number;
  effect: EventEffect;
}

// ===== Economy Types =====

export interface DaySummary {
  day: number;
  revenue: number;
  expenses: number;
  profit: number;
  customersServed: number;
  customersLost: number;
  itemsSold: number;
  reputationChange: number;
  events: string[];
}

// ===== AI Advisor =====

export interface AdvisorTip {
  message: string;
  priority: number; // 1=critical, 2=important, 3=suggestion
  category: 'inventory' | 'staff' | 'finance' | 'marketing' | 'upgrade';
}

// ===== Game State =====

export type GamePhase = 'menu' | 'playing' | 'paused' | 'daySummary' | 'gameover';
export type GameSpeed = 0 | 1 | 2 | 3; // 0=paused
export type TimeOfDay = 'morning' | 'noon' | 'evening';

export interface StoreLayout {
  gridWidth: number;
  gridHeight: number;
  shelves: ShelfPosition[];
  checkouts: CheckoutPosition[];
  entrance: { gridX: number; gridY: number };
  playArea: { gridX: number; gridY: number } | null;
  vipArea: { gridX: number; gridY: number } | null;
}

export interface ShelfPosition {
  gridX: number;
  gridY: number;
  category: ProductCategory;
}

export interface CheckoutPosition {
  gridX: number;
  gridY: number;
  staffId: number | null;
  queue: number[]; // customer ids
}

export interface GameState {
  // Core
  phase: GamePhase;
  speed: GameSpeed;
  day: number;
  dayProgress: number; // 0-60 (seconds in game-time)
  timeOfDay: TimeOfDay;

  // Economy
  cash: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  daysInDebt: number; // consecutive days with cash < -5000

  // Store
  reputation: number; // 0-100
  storeLevel: number; // starts at 1
  upgrades: string[]; // purchased upgrade ids
  layout: StoreLayout;

  // Inventory
  inventory: Record<ProductCategory, InventoryItem>;

  // People
  staff: StaffMember[];
  customers: Customer[];
  nextCustomerId: number;
  nextStaffId: number;

  // Events & Marketing
  activeEvents: ActiveEvent[];
  activeMarketing: ActiveMarketing | null;
  marketingCooldown: number; // days until can start new collab
  lastLaunchDay: number; // day of last launch event

  // History
  dailySummaries: DaySummary[];

  // Advisor
  lastAdvisorDay: number;
  currentTip: AdvisorTip | null;

  // Milestones
  milestones: { bronze: boolean; silver: boolean; gold: boolean };

  // Visual state (for canvas)
  particles: Particle[];
  toasts: Toast[];
}

export interface Particle {
  x: number;
  y: number;
  text: string;
  color: number;
  alpha: number;
  vy: number; // velocity y
  life: number; // 0-1
}

export interface Toast {
  message: string;
  emoji: string;
  timeLeft: number;
  type: 'info' | 'warning' | 'success' | 'danger';
}

// ===== Panel state (React) =====

export type ActivePanel = 'none' | 'inventory' | 'staff' | 'marketing' | 'upgrades';
