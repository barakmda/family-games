import type {
  ProductDef, ProductCategory, CustomerTypeDef, StaffRoleDef,
  UpgradeDef, GameEvent, InfluencerDef, LaunchDef, StoreLayout,
  InventoryItem,
} from './types';

// ===== Products =====

export const PRODUCTS: Record<ProductCategory, ProductDef> = {
  technic:     { id: 'technic',     name: 'Technic',     emoji: '\u{1F3CE}\u{FE0F}', buyPrice: 280, sellPrice: 400, baseDemand: 3,  color: 0xE53935 },
  city:        { id: 'city',        name: 'City',        emoji: '\u{1F3D9}\u{FE0F}', buyPrice: 120, sellPrice: 180, baseDemand: 6,  color: 0x1E88E5 },
  starwars:    { id: 'starwars',    name: 'Star Wars',   emoji: '\u2B50',             buyPrice: 350, sellPrice: 500, baseDemand: 4,  color: 0xFDD835 },
  friends:     { id: 'friends',     name: 'Friends',     emoji: '\u{1F338}',          buyPrice: 100, sellPrice: 150, baseDemand: 5,  color: 0xEC407A },
  creator:     { id: 'creator',     name: 'Creator',     emoji: '\u{1F3A8}',          buyPrice: 200, sellPrice: 300, baseDemand: 2,  color: 0x8E24AA },
  duplo:       { id: 'duplo',       name: 'Duplo',       emoji: '\u{1F9F8}',          buyPrice: 80,  sellPrice: 130, baseDemand: 4,  color: 0x43A047 },
  minifigures: { id: 'minifigures', name: 'Minifigures', emoji: '\u{1F3AD}',          buyPrice: 15,  sellPrice: 30,  baseDemand: 15, color: 0xFF8F00 },
};

export const PRODUCT_LIST: ProductCategory[] = ['technic', 'city', 'starwars', 'friends', 'creator', 'duplo', 'minifigures'];

// ===== Customers =====

export const CUSTOMER_TYPES: Record<string, CustomerTypeDef> = {
  family:     { id: 'family',     name: '\u05D4\u05D5\u05E8\u05D9\u05DD + \u05D9\u05DC\u05D3\u05D9\u05DD',     emoji: '\u{1F468}\u200D\u{1F467}', frequency: 0.40, patience: 30, preferences: ['city', 'friends', 'duplo'],      needsHelp: false, spendMultiplier: 1.0 },
  collector:  { id: 'collector',  name: '\u05D0\u05E1\u05E4\u05E0\u05D9\u05DD',           emoji: '\u{1F9D0}',                frequency: 0.15, patience: 45, preferences: ['technic', 'starwars'],          needsHelp: false, spendMultiplier: 1.5 },
  giftBuyer:  { id: 'giftBuyer',  name: '\u05E7\u05D5\u05E0\u05D9 \u05DE\u05EA\u05E0\u05D5\u05EA',       emoji: '\u{1F381}',                frequency: 0.20, patience: 20, preferences: ['city', 'friends', 'technic'],   needsHelp: true,  spendMultiplier: 1.2 },
  tourist:    { id: 'tourist',    name: '\u05EA\u05D9\u05D9\u05E8\u05D9\u05DD',             emoji: '\u{1F4F8}',                frequency: 0.15, patience: 15, preferences: ['minifigures'],                  needsHelp: false, spendMultiplier: 1.0 },
  enthusiast: { id: 'enthusiast', name: '\u05D7\u05D5\u05D1\u05D1\u05D9 \u05DC\u05D2\u05D5',         emoji: '\u{1F9F1}',                frequency: 0.10, patience: 40, preferences: ['creator', 'technic'],          needsHelp: false, spendMultiplier: 1.3 },
};

// ===== Staff =====

export const STAFF_ROLES: Record<string, StaffRoleDef> = {
  salesperson:  { id: 'salesperson',  name: '\u05DE\u05D5\u05DB\u05E8/\u05EA',   emoji: '\u{1F9D1}\u200D\u{1F4BC}', salary: 300, hireCost: 500 },
  cashier:      { id: 'cashier',      name: '\u05E7\u05D5\u05E4\u05D0\u05D9/\u05EA',  emoji: '\u{1F4B0}',                salary: 250, hireCost: 500 },
  stockWorker:  { id: 'stockWorker',  name: '\u05DE\u05D7\u05E1\u05E0\u05D0\u05D9/\u05EA', emoji: '\u{1F4E6}',                salary: 200, hireCost: 500 },
  shiftManager: { id: 'shiftManager', name: '\u05DE\u05E0\u05D4\u05DC/\u05EA \u05DE\u05E9\u05DE\u05E8\u05EA', emoji: '\u{1F454}',     salary: 500, hireCost: 500 },
};

export const STAFF_NAMES = [
  '\u05D3\u05E0\u05D9\u05D0\u05DC', '\u05E0\u05D5\u05E2\u05D4', '\u05D9\u05D5\u05E1\u05D9', '\u05DE\u05D9\u05DB\u05DC', '\u05E9\u05D9\u05E8\u05D4', '\u05D0\u05D5\u05E8', '\u05EA\u05DE\u05E8', '\u05E2\u05D9\u05D3\u05D5',
  '\u05DC\u05D9\u05D0\u05D5\u05E8', '\u05D9\u05E2\u05DC', '\u05E0\u05D5\u05D9\u05D4', '\u05D0\u05D9\u05EA\u05D9', '\u05E8\u05D5\u05E0\u05D9', '\u05D0\u05D1\u05D9\u05D1', '\u05D4\u05D3\u05E1', '\u05DE\u05D0\u05D9\u05D4',
];

// ===== Upgrades =====

export const UPGRADES: UpgradeDef[] = [
  { id: 'lighting',      name: '\u05EA\u05D0\u05D5\u05E8\u05D4 \u05DE\u05E9\u05D5\u05E4\u05E8\u05EA',     emoji: '\u{1F4A1}', cost: 2000,  recurringCost: 0,    effect: '+10% \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA', minDay: 3  },
  { id: 'displays',      name: '\u05DE\u05D3\u05E4\u05D9 \u05EA\u05E6\u05D5\u05D2\u05D4',       emoji: '\u{1F5BC}\u{FE0F}', cost: 3000,  recurringCost: 0,    effect: '+15% \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA impulse', minDay: 5  },
  { id: 'playArea',      name: '\u05E4\u05D9\u05E0\u05EA \u05DE\u05E9\u05D7\u05E7',        emoji: '\u{1F3A8}', cost: 5000,  recurringCost: 0,    effect: '+20% \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05D4\u05D5\u05E8\u05D9\u05DD', minDay: 7  },
  { id: 'expansion',     name: '\u05D4\u05E8\u05D7\u05D1\u05EA \u05D7\u05E0\u05D5\u05EA',       emoji: '\u{1F3D7}\u{FE0F}', cost: 10000, recurringCost: 0,    effect: '+50% \u05E7\u05D9\u05D1\u05D5\u05DC\u05EA \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA', minDay: 10 },
  { id: 'vipRoom',       name: '\u05D7\u05E0\u05D5\u05EA VIP',           emoji: '\u{1F451}', cost: 8000,  recurringCost: 0,    effect: '\u05D0\u05E1\u05E4\u05E0\u05D9\u05DD +30%', minDay: 15 },
  { id: 'extraCheckout',  name: '\u05E7\u05D5\u05E4\u05D4 \u05E0\u05D5\u05E1\u05E4\u05EA',       emoji: '\u{1F4B3}', cost: 4000,  recurringCost: 0,    effect: '-50% \u05D6\u05DE\u05DF \u05D4\u05DE\u05EA\u05E0\u05D4', minDay: 8  },
  { id: 'smartInventory', name: '\u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05DC\u05D0\u05D9 \u05D7\u05DB\u05DE\u05D4', emoji: '\u{1F916}', cost: 6000,  recurringCost: 0,    effect: 'AI \u05DE\u05DE\u05DC\u05D9\u05E5 \u05E2\u05DC \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA', minDay: 12 },
  { id: 'mallAd',        name: '\u05E4\u05E8\u05E1\u05D5\u05DD \u05D1\u05E7\u05E0\u05D9\u05D5\u05DF',      emoji: '\u{1F4E2}', cost: 3000,  recurringCost: 3000, effect: '+25% \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA', minDay: 5  },
];

// ===== Events =====

export const RANDOM_EVENTS: GameEvent[] = [
  {
    id: 'newSetLaunch', name: '\u{1F389} \u05D4\u05E9\u05E7\u05EA \u05E1\u05D8 \u05D7\u05D3\u05E9', emoji: '\u{1F389}',
    description: '\u05E1\u05D8 \u05D7\u05D3\u05E9 \u05D4\u05D5\u05E9\u05E7 \u05D5\u05D4\u05D1\u05D9\u05E7\u05D5\u05E9 \u05D2\u05D3\u05D5\u05DC!', duration: 3,
    effect: { demandMultiplier: { technic: 3 } }, // will be randomized
  },
  {
    id: 'summerVacation', name: '\u{1F3D6}\u{FE0F} \u05D7\u05D5\u05E4\u05E9\u05EA \u05E7\u05D9\u05E5', emoji: '\u{1F3D6}\u{FE0F}',
    description: '\u05D7\u05D5\u05E4\u05E9\u05EA \u05D4\u05E7\u05D9\u05E5! \u05DE\u05E9\u05E4\u05D7\u05D5\u05EA \u05DE\u05E6\u05D9\u05E4\u05D5\u05EA \u05D0\u05EA \u05D4\u05E7\u05E0\u05D9\u05D5\u05DF.', duration: 5,
    effect: { customerMultiplier: { family: 1.5 } },
  },
  {
    id: 'deliveryDelay', name: '\u{1F4E6} \u05E2\u05D9\u05DB\u05D5\u05D1 \u05D1\u05DE\u05E9\u05DC\u05D5\u05D7', emoji: '\u{1F4E6}',
    description: '\u05E2\u05D9\u05DB\u05D5\u05D1\u05D9\u05DD \u05D1\u05E9\u05E8\u05E9\u05E8\u05EA \u05D4\u05D0\u05E1\u05E4\u05E7\u05D4. \u05D4\u05D6\u05DE\u05E0\u05D5\u05EA \u05DE\u05EA\u05E2\u05DB\u05D1\u05D5\u05EA.', duration: 3,
    effect: { deliveryDelay: 1 },
  },
  {
    id: 'competitorSale', name: '\u{1F4B8} \u05DE\u05D1\u05E6\u05E2 \u05E9\u05DC \u05D4\u05DE\u05EA\u05D7\u05E8\u05D4', emoji: '\u{1F4B8}',
    description: '\u05D4\u05DE\u05EA\u05D7\u05E8\u05D4 \u05E2\u05D5\u05E9\u05D4 \u05DE\u05D1\u05E6\u05E2 \u05D2\u05D3\u05D5\u05DC! \u05E4\u05D7\u05D5\u05EA \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA.', duration: 2,
    effect: { globalCustomerMultiplier: 0.7 },
  },
  {
    id: 'celebrityVisit', name: '\u2B50 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05E1\u05DC\u05D1\u05E8\u05D9\u05D8\u05D9', emoji: '\u2B50',
    description: '\u05E1\u05DC\u05D1\u05E8\u05D9\u05D8\u05D9 \u05DE\u05D1\u05E7\u05E8 \u05D1\u05D7\u05E0\u05D5\u05EA! \u05E2\u05D5\u05DE\u05E1 \u05E9\u05DC \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA.', duration: 1,
    effect: { globalCustomerMultiplier: 2.0, reputationChange: 5 },
  },
  {
    id: 'acBreakdown', name: '\u{1F527} \u05EA\u05E7\u05DC\u05EA \u05DE\u05D6\u05D2\u05DF', emoji: '\u{1F527}',
    description: '\u05D4\u05DE\u05D6\u05D2\u05DF \u05D4\u05EA\u05E7\u05DC\u05E7\u05DC! \u05D4\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05D7\u05E1\u05E8\u05D9 \u05E1\u05D1\u05DC\u05E0\u05D5\u05EA.', duration: 1,
    effect: { patienceMultiplier: 0.5, fixCost: 1000 },
  },
  {
    id: 'holidaySeason', name: '\u{1F384} \u05E2\u05D5\u05E0\u05EA \u05D7\u05D2\u05D9\u05DD', emoji: '\u{1F384}',
    description: '\u05E2\u05D5\u05E0\u05EA \u05D4\u05D7\u05D2\u05D9\u05DD! \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05D5\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05E2\u05D5\u05DC\u05D9\u05DD.', duration: 7,
    effect: { globalCustomerMultiplier: 1.8, priceMultiplier: 1.2 },
  },
  {
    id: 'tiktokViral', name: '\u{1F4F1} \u05D5\u05D9\u05E8\u05D0\u05DC\u05D9 \u05D1\u05D8\u05D9\u05E7\u05D8\u05D5\u05E7', emoji: '\u{1F4F1}',
    description: '\u05E1\u05E8\u05D8\u05D5\u05DF \u05D5\u05D9\u05E8\u05D0\u05DC\u05D9 \u05E2\u05DC Minifigures! \u05D1\u05D9\u05E7\u05D5\u05E9 \u05DE\u05D8\u05D5\u05E8\u05E3.', duration: 2,
    effect: { demandMultiplier: { minifigures: 5 } },
  },
];

// ===== Marketing =====

export const INFLUENCERS: InfluencerDef[] = [
  {
    id: 'blogger', name: '\u05D1\u05DC\u05D5\u05D2\u05E8 \u05DC\u05D2\u05D5 \u05DE\u05E7\u05D5\u05DE\u05D9', emoji: '\u{1F4F1}',
    cost: 1000, duration: 3, minReputation: 40,
    effect: { customerMultiplier: { enthusiast: 1.2 } },
  },
  {
    id: 'youtuber', name: '\u05D9\u05D5\u05D8\u05D9\u05D5\u05D1\u05E8 \u05D9\u05DC\u05D3\u05D9\u05DD', emoji: '\u{1F3AC}',
    cost: 2500, duration: 5, minReputation: 60,
    effect: { customerMultiplier: { family: 1.4 } },
  },
  {
    id: 'instagram', name: '\u05E1\u05DC\u05D1\u05E8\u05D9\u05D8\u05D9 \u05D0\u05D9\u05E0\u05E1\u05D8\u05D2\u05E8\u05DD', emoji: '\u{1F4F8}',
    cost: 5000, duration: 3, minReputation: 75,
    effect: { globalCustomerMultiplier: 1.3, reputationChange: 10 },
  },
  {
    id: 'tiktoker', name: '\u05D8\u05D9\u05E7\u05D8\u05D5\u05E7\u05E8 \u05D5\u05D9\u05E8\u05D0\u05DC\u05D9', emoji: '\u{1F3B5}',
    cost: 3000, duration: 4, minReputation: 50,
    effect: { demandMultiplier: { minifigures: 3 } },
  },
];

export const LAUNCHES: LaunchDef[] = [
  {
    id: 'newSet', name: '\u05D4\u05E9\u05E7\u05EA \u05E1\u05D8 \u05D7\u05D3\u05E9', emoji: '\u{1F381}',
    cost: 2000, requirement: 'inventory10', duration: 2,
    effect: { demandMultiplier: { city: 3 } }, // category will be chosen by player
  },
  {
    id: 'vipNight', name: '\u05E2\u05E8\u05D1 VIP \u05DC\u05D0\u05E1\u05E4\u05E0\u05D9\u05DD', emoji: '\u{1F451}',
    cost: 4000, requirement: 'vipRoom', duration: 1,
    effect: { customerMultiplier: { collector: 4 }, reputationChange: 15 },
  },
  {
    id: 'familyDay', name: '\u05D9\u05D5\u05DD \u05D1\u05E0\u05D9\u05D9\u05D4 \u05DE\u05E9\u05E4\u05D7\u05EA\u05D9', emoji: '\u{1F46A}',
    cost: 1500, requirement: 'playArea', duration: 1,
    effect: { customerMultiplier: { family: 3 }, reputationChange: 10 },
  },
  {
    id: 'buildContest', name: '\u05EA\u05D7\u05E8\u05D5\u05EA \u05D1\u05E0\u05D9\u05D9\u05D4', emoji: '\u{1F3C6}',
    cost: 3000, requirement: 'day20', duration: 1,
    effect: { globalCustomerMultiplier: 2, reputationChange: 20 },
  },
];

// ===== Balance Constants =====

export const BALANCE = {
  STARTING_CASH: 10000,
  STARTING_REPUTATION: 50,
  STARTING_STOCK_PER_CATEGORY: 7, // ~50 total

  DAY_DURATION: 60, // seconds at 1x speed
  RENT_PER_DAY: 500,
  RENT_INCREASE_PER_EXPANSION: 200,

  MAX_REPUTATION: 100,
  MIN_REPUTATION: 0,
  REP_GAIN_HAPPY: 1,
  REP_LOSS_SAD: 2,

  MORALE_MAX: 100,
  MORALE_DECAY_PER_DAY: 5,
  MORALE_BOOST_MANAGER: 10,
  MORALE_QUIT_THRESHOLD: 30,

  BASE_MAX_CUSTOMERS: 8,
  EXPANSION_CUSTOMER_BONUS: 4,
  CROWDED_THRESHOLD: 5,
  CROWDED_PATIENCE_PENALTY: 0.7,

  CUSTOMER_SPAWN_INTERVAL: 4, // seconds at 1x speed between spawns

  MAX_STAFF: (storeLevel: number) => 2 + storeLevel * 2,

  CHECKOUT_TIME: 5, // seconds
  EXTRA_CHECKOUT_MULTIPLIER: 0.5,

  DELIVERY_DELAY: 1, // days (default)

  DEBT_THRESHOLD: -5000,
  DEBT_DAYS_GAMEOVER: 3,

  EVENT_CHANCE_PER_DAY: 0.15,

  MARKETING_COOLDOWN: 3, // days between influencer collabs
  LAUNCH_COOLDOWN: 7, // days between launches

  MILESTONE_BRONZE: 50000,
  MILESTONE_SILVER: 200000,
  MILESTONE_GOLD: 500000,

  ADVISOR_INTERVAL: 2, // days between tips
};

// ===== Default Store Layout =====

export function createDefaultLayout(): StoreLayout {
  return {
    gridWidth: 10,
    gridHeight: 8,
    shelves: [
      { gridX: 1, gridY: 1, category: 'technic' },
      { gridX: 3, gridY: 1, category: 'city' },
      { gridX: 5, gridY: 1, category: 'starwars' },
      { gridX: 7, gridY: 1, category: 'friends' },
      { gridX: 1, gridY: 3, category: 'creator' },
      { gridX: 3, gridY: 3, category: 'duplo' },
      { gridX: 5, gridY: 3, category: 'minifigures' },
    ],
    checkouts: [
      { gridX: 3, gridY: 6, staffId: null, queue: [] },
    ],
    entrance: { gridX: 5, gridY: 7 },
    playArea: null,
    vipArea: null,
  };
}

// ===== Default Inventory =====

export function createDefaultInventory(): Record<ProductCategory, InventoryItem> {
  const inv = {} as Record<ProductCategory, InventoryItem>;
  for (const cat of PRODUCT_LIST) {
    inv[cat] = {
      categoryId: cat,
      stock: BALANCE.STARTING_STOCK_PER_CATEGORY,
      onOrder: 0,
      onOrderDay: 0,
      totalSold: 0,
    };
  }
  return inv;
}

// ===== Hebrew Day Names =====

export const TIME_OF_DAY_NAMES = {
  morning: '\u05D1\u05D5\u05E7\u05E8 \u2600\uFE0F',
  noon: '\u05E6\u05D4\u05E8\u05D9\u05D9\u05DD \u{1F31E}',
  evening: '\u05E2\u05E8\u05D1 \u{1F31C}',
};

// ===== Store Colors (for isometric rendering) =====

export const STORE_COLORS = {
  floor: 0xF5F0E8,
  floorAlt: 0xEDE8D8,
  wall: 0x4A4A4A,
  wallSide: 0x3A3A3A,
  entrance: 0x8BC34A,
  checkout: 0x795548,
  shelfEmpty: 0x9E9E9E,
  shelfLow: 0xFFEB3B,
  shelfFull: 0x4CAF50,
  highlight: 0xFFD700,
  shadow: 0x000000,
};
