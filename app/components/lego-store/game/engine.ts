import type {
  GameState, GameSpeed, Customer, CustomerType, ProductCategory,
  StaffMember, Toast,
} from './types';
import {
  BALANCE, PRODUCT_LIST, CUSTOMER_TYPES,
  RANDOM_EVENTS, STAFF_ROLES, UPGRADES,
  createDefaultLayout, createDefaultInventory,
} from './constants';
import { payDailyExpenses, processSale, processDeliveries, checkDebt, checkMilestones } from './economy';

// ===== Create Initial State =====

export function createInitialState(): GameState {
  return {
    phase: 'menu',
    speed: 1,
    day: 1,
    dayProgress: 0,
    timeOfDay: 'morning',

    cash: BALANCE.STARTING_CASH,
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    daysInDebt: 0,

    reputation: BALANCE.STARTING_REPUTATION,
    storeLevel: 1,
    upgrades: [],
    layout: createDefaultLayout(),

    inventory: createDefaultInventory(),

    staff: [
      createStaffMember(1, 'salesperson', 3, 5),
      createStaffMember(2, 'cashier', 3, 6),
    ],
    customers: [],
    nextCustomerId: 1,
    nextStaffId: 3,

    activeEvents: [],
    activeMarketing: null,
    marketingCooldown: 0,
    lastLaunchDay: 0,

    dailySummaries: [],

    lastAdvisorDay: 0,
    currentTip: null,

    milestones: { bronze: false, silver: false, gold: false },

    particles: [],
    toasts: [],
  };
}

function createStaffMember(id: number, role: string, gx: number, gy: number): StaffMember {
  return {
    id,
    role: role as StaffMember['role'],
    name: randomStaffName(),
    morale: 80,
    isTraining: false,
    assignedCustomer: null,
    gridX: gx,
    gridY: gy,
    targetX: gx,
    targetY: gy,
    moveProgress: 1,
  };
}

function randomStaffName(): string {
  const names = [
    '\u05D3\u05E0\u05D9\u05D0\u05DC', '\u05E0\u05D5\u05E2\u05D4', '\u05D9\u05D5\u05E1\u05D9', '\u05DE\u05D9\u05DB\u05DC',
    '\u05E9\u05D9\u05E8\u05D4', '\u05D0\u05D5\u05E8', '\u05EA\u05DE\u05E8', '\u05E2\u05D9\u05D3\u05D5',
    '\u05DC\u05D9\u05D0\u05D5\u05E8', '\u05D9\u05E2\u05DC', '\u05E0\u05D5\u05D9\u05D4', '\u05D0\u05D9\u05EA\u05D9',
  ];
  return names[Math.floor(Math.random() * names.length)];
}

// ===== Day Tick (called every game-second) =====

export interface DayTickResult {
  dayEnded: boolean;
  gameOver: boolean;
  newEvents: string[];
  salesThisTick: number;
}

export function dayTick(state: GameState, deltaSeconds: number): DayTickResult {
  const result: DayTickResult = { dayEnded: false, gameOver: false, newEvents: [], salesThisTick: 0 };

  if (state.speed === 0 || state.phase !== 'playing') return result;

  const dt = deltaSeconds * state.speed;
  state.dayProgress += dt;

  // Update time of day
  if (state.dayProgress < 20) state.timeOfDay = 'morning';
  else if (state.dayProgress < 40) state.timeOfDay = 'noon';
  else state.timeOfDay = 'evening';

  // Spawn customers
  result.salesThisTick = spawnAndUpdateCustomers(state, dt);

  // Update staff movement
  updateStaffMovement(state, dt);

  // Update particles
  updateParticles(state, dt);

  // Update toasts
  state.toasts = state.toasts.filter(t => {
    t.timeLeft -= dt;
    return t.timeLeft > 0;
  });

  // Day end
  if (state.dayProgress >= BALANCE.DAY_DURATION) {
    endDay(state, result);
  }

  return result;
}

// ===== Customer Logic =====

let spawnTimer = 0;

function getCustomerMultiplier(state: GameState): number {
  let mult = state.reputation / 50; // base: reputation/50

  for (const ae of state.activeEvents) {
    if (ae.event.effect.globalCustomerMultiplier) {
      mult *= ae.event.effect.globalCustomerMultiplier;
    }
  }
  if (state.activeMarketing?.effect.globalCustomerMultiplier) {
    mult *= state.activeMarketing.effect.globalCustomerMultiplier;
  }

  // Upgrades
  if (state.upgrades.includes('lighting')) mult *= 1.1;
  if (state.upgrades.includes('mallAd')) mult *= 1.25;

  return mult;
}

function getMaxCustomers(state: GameState): number {
  let max = BALANCE.BASE_MAX_CUSTOMERS;
  if (state.upgrades.includes('expansion')) max += BALANCE.EXPANSION_CUSTOMER_BONUS;
  return max;
}

function getDemandMultiplier(state: GameState, category: ProductCategory): number {
  let mult = 1;
  for (const ae of state.activeEvents) {
    const dm = ae.event.effect.demandMultiplier;
    if (dm && dm[category]) mult *= dm[category]!;
  }
  if (state.activeMarketing?.effect.demandMultiplier?.[category]) {
    mult *= state.activeMarketing.effect.demandMultiplier[category]!;
  }
  return mult;
}

function getCustomerTypeMultiplier(state: GameState, customerType: CustomerType): number {
  let mult = 1;
  for (const ae of state.activeEvents) {
    const cm = ae.event.effect.customerMultiplier;
    if (cm && cm[customerType]) mult *= cm[customerType]!;
  }
  if (state.activeMarketing?.effect.customerMultiplier?.[customerType]) {
    mult *= state.activeMarketing.effect.customerMultiplier[customerType]!;
  }
  // Upgrades
  if (customerType === 'family' && state.upgrades.includes('playArea')) mult *= 1.2;
  if (customerType === 'collector' && state.upgrades.includes('vipRoom')) mult *= 1.3;
  return mult;
}

function spawnAndUpdateCustomers(state: GameState, dt: number): number {
  let sales = 0;
  spawnTimer += dt;

  const maxCust = getMaxCustomers(state);
  const spawnInterval = BALANCE.CUSTOMER_SPAWN_INTERVAL / getCustomerMultiplier(state);

  // Spawn new customers
  if (spawnTimer >= spawnInterval && state.customers.length < maxCust && state.dayProgress < 55) {
    spawnTimer = 0;
    const customer = spawnCustomer(state);
    if (customer) state.customers.push(customer);
  }

  // Update existing customers
  const toRemove: number[] = [];
  for (const c of state.customers) {
    sales += updateCustomer(state, c, dt);
    if (c.state === 'leavingHappy' || c.state === 'leavingSad') {
      if (c.moveProgress >= 1) toRemove.push(c.id);
    }
  }

  state.customers = state.customers.filter(c => !toRemove.includes(c.id));
  return sales;
}

function spawnCustomer(state: GameState): Customer | null {
  // Weighted random selection of customer type
  const types = Object.values(CUSTOMER_TYPES);
  const weights = types.map(t => t.frequency * getCustomerTypeMultiplier(state, t.id));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;

  let selectedType = types[0];
  for (let i = 0; i < types.length; i++) {
    r -= weights[i];
    if (r <= 0) { selectedType = types[i]; break; }
  }

  // Choose desired product from preferences
  const prefs = selectedType.preferences;
  const desiredCategory = prefs[Math.floor(Math.random() * prefs.length)];

  // Check demand multiplier — higher demand = more likely to want that product
  const demandMult = getDemandMultiplier(state, desiredCategory);
  if (Math.random() > demandMult / (demandMult + 1)) {
    // This customer might want something else from their preferences
    // (just pick randomly again, simple approach)
  }

  const entrance = state.layout.entrance;
  const patience = selectedType.patience * getPatienceMultiplier(state);

  return {
    id: state.nextCustomerId++,
    type: selectedType.id,
    state: 'entering',
    gridX: entrance.gridX,
    gridY: entrance.gridY,
    targetX: entrance.gridX,
    targetY: entrance.gridY,
    moveProgress: 1,
    patience,
    maxPatience: patience,
    desiredCategory,
    assignedStaff: null,
    checkoutTime: 0,
    spentAmount: 0,
  };
}

function getPatienceMultiplier(state: GameState): number {
  let mult = 1;
  // Crowded penalty
  if (state.customers.length > BALANCE.CROWDED_THRESHOLD) {
    mult *= BALANCE.CROWDED_PATIENCE_PENALTY;
  }
  // Event effects
  for (const ae of state.activeEvents) {
    if (ae.event.effect.patienceMultiplier) {
      mult *= ae.event.effect.patienceMultiplier;
    }
  }
  return mult;
}

function updateCustomer(state: GameState, c: Customer, dt: number): number {
  let sales = 0;

  // Update movement
  if (c.moveProgress < 1) {
    c.moveProgress = Math.min(1, c.moveProgress + dt * 0.5);
    if (c.moveProgress >= 1) {
      c.gridX = c.targetX;
      c.gridY = c.targetY;
    }
  }

  switch (c.state) {
    case 'entering': {
      // Move toward a shelf with desired category
      const shelf = state.layout.shelves.find(s => s.category === c.desiredCategory);
      if (shelf && c.moveProgress >= 1) {
        c.targetX = shelf.gridX;
        c.targetY = shelf.gridY + 1;
        c.moveProgress = 0;
        c.state = 'browsing';
      }
      break;
    }

    case 'browsing': {
      c.patience -= dt;
      if (c.patience <= 0) {
        customerLeavesSad(state, c);
        break;
      }

      if (c.moveProgress >= 1) {
        // Check if product in stock
        const inv = state.inventory[c.desiredCategory];
        if (inv.stock <= 0) {
          customerLeavesSad(state, c);
          break;
        }

        // Gift buyers need help from salesperson
        const typeDef = CUSTOMER_TYPES[c.type];
        if (typeDef.needsHelp && !c.assignedStaff) {
          c.state = 'waitingForHelp';
          // Try to assign a free salesperson
          assignSalesperson(state, c);
          break;
        }

        // Ready to checkout
        c.state = 'atCheckout';
        moveToCheckout(state, c);
      }
      break;
    }

    case 'waitingForHelp': {
      c.patience -= dt;
      if (c.patience <= 0) {
        customerLeavesSad(state, c);
        break;
      }
      // Keep trying to get help
      if (!c.assignedStaff) {
        assignSalesperson(state, c);
      }
      if (c.assignedStaff) {
        c.state = 'atCheckout';
        moveToCheckout(state, c);
      }
      break;
    }

    case 'atCheckout': {
      if (c.moveProgress >= 1) {
        // Check if there's a cashier at this checkout
        const checkout = state.layout.checkouts.find(
          ch => Math.abs(ch.gridX - c.gridX) <= 1 && Math.abs(ch.gridY - c.gridY) <= 1
        );
        const hasCashier = checkout?.staffId != null || state.staff.some(s => s.role === 'cashier');

        if (!hasCashier) {
          customerLeavesSad(state, c);
          break;
        }

        c.state = 'buying';
        let checkoutTime = BALANCE.CHECKOUT_TIME;
        if (state.upgrades.includes('extraCheckout')) checkoutTime *= BALANCE.EXTRA_CHECKOUT_MULTIPLIER;
        c.checkoutTime = checkoutTime;
      }
      break;
    }

    case 'buying': {
      c.checkoutTime -= dt;
      if (c.checkoutTime <= 0) {
        // Complete purchase!
        const price = processSale(state, c.desiredCategory);
        c.spentAmount = price;
        sales++;

        // Add particle effect
        const shelf = state.layout.shelves.find(s => s.category === c.desiredCategory);
        if (shelf) {
          addParticle(state, shelf.gridX, shelf.gridY, `+\u20AA${price}`, 0x4CAF50);
        }

        // Reputation boost
        state.reputation = Math.min(BALANCE.MAX_REPUTATION, state.reputation + BALANCE.REP_GAIN_HAPPY);

        // Impulse buy chance (minifigures)
        if (state.upgrades.includes('displays') && Math.random() < 0.15 && state.inventory.minifigures.stock > 0) {
          const bonusPrice = processSale(state, 'minifigures');
          c.spentAmount += bonusPrice;
          addParticle(state, 5, 3, `+\u20AA${bonusPrice}`, 0xFF8F00);
        }

        customerLeavesHappy(state, c);
      }
      break;
    }

    case 'leavingHappy':
    case 'leavingSad': {
      // Movement handled above
      break;
    }
  }

  return sales;
}

function assignSalesperson(state: GameState, c: Customer): void {
  const freeSeller = state.staff.find(
    s => s.role === 'salesperson' && !s.isTraining && s.assignedCustomer === null
  );
  if (freeSeller) {
    freeSeller.assignedCustomer = c.id;
    c.assignedStaff = freeSeller.id;
    // Move salesperson toward customer
    freeSeller.targetX = c.gridX;
    freeSeller.targetY = c.gridY;
    freeSeller.moveProgress = 0;
  }
}

function moveToCheckout(state: GameState, c: Customer): void {
  const checkout = state.layout.checkouts[0]; // simplify: go to first checkout
  if (checkout) {
    c.targetX = checkout.gridX + 1;
    c.targetY = checkout.gridY;
    c.moveProgress = 0;
  }
}

function customerLeavesHappy(state: GameState, c: Customer): void {
  c.state = 'leavingHappy';
  c.targetX = state.layout.entrance.gridX;
  c.targetY = state.layout.entrance.gridY;
  c.moveProgress = 0;

  // Free assigned staff
  if (c.assignedStaff) {
    const staff = state.staff.find(s => s.id === c.assignedStaff);
    if (staff) staff.assignedCustomer = null;
  }
}

function customerLeavesSad(state: GameState, c: Customer): void {
  c.state = 'leavingSad';
  c.targetX = state.layout.entrance.gridX;
  c.targetY = state.layout.entrance.gridY;
  c.moveProgress = 0;

  // Reputation penalty
  state.reputation = Math.max(BALANCE.MIN_REPUTATION, state.reputation - BALANCE.REP_LOSS_SAD);

  addParticle(state, c.gridX, c.gridY, '\u274C', 0xE53935);

  // Free assigned staff
  if (c.assignedStaff) {
    const staff = state.staff.find(s => s.id === c.assignedStaff);
    if (staff) staff.assignedCustomer = null;
  }
}

// ===== Staff Movement =====

function updateStaffMovement(state: GameState, dt: number): void {
  for (const s of state.staff) {
    if (s.moveProgress < 1) {
      s.moveProgress = Math.min(1, s.moveProgress + dt * 0.4);
      if (s.moveProgress >= 1) {
        s.gridX = s.targetX;
        s.gridY = s.targetY;
      }
    }
  }
}

// ===== End of Day =====

function endDay(state: GameState, result: DayTickResult): void {
  // Pay expenses
  payDailyExpenses(state);

  // Process deliveries for next day
  processDeliveries(state);

  // Decay morale
  for (const s of state.staff) {
    s.morale = Math.max(0, s.morale - BALANCE.MORALE_DECAY_PER_DAY);
    // Manager boost
    if (state.staff.some(m => m.role === 'shiftManager' && !m.isTraining)) {
      s.morale = Math.min(BALANCE.MORALE_MAX, s.morale + BALANCE.MORALE_BOOST_MANAGER);
    }
    // Training ends
    if (s.isTraining) s.isTraining = false;
  }

  // Check for staff quitting
  const quitters = state.staff.filter(s => s.morale < BALANCE.MORALE_QUIT_THRESHOLD && Math.random() < 0.3);
  for (const q of quitters) {
    state.staff = state.staff.filter(s => s.id !== q.id);
    addToast(state, `${q.name} \u05E2\u05D6\u05D1/\u05D4 \u05D0\u05EA \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4!`, '\u{1F6AA}', 'warning');
    result.newEvents.push(`${q.name} \u05E2\u05D6\u05D1/\u05D4`);
  }

  // Advance events
  state.activeEvents = state.activeEvents.filter(ae => {
    ae.daysRemaining--;
    return ae.daysRemaining > 0;
  });

  // Advance marketing
  if (state.activeMarketing) {
    state.activeMarketing.daysRemaining--;
    if (state.activeMarketing.daysRemaining <= 0) {
      state.activeMarketing = null;
    }
  }
  if (state.marketingCooldown > 0) state.marketingCooldown--;

  // Random event
  if (Math.random() < BALANCE.EVENT_CHANCE_PER_DAY) {
    triggerRandomEvent(state, result);
  }

  // Update total profit
  state.totalProfit = state.totalRevenue - state.totalExpenses;

  // Check milestones
  const milestone = checkMilestones(state);
  if (milestone) {
    addToast(state, milestone, '\u{1F3C6}', 'success');
    result.newEvents.push(milestone);
  }

  // Check debt gameover
  if (checkDebt(state)) {
    state.phase = 'gameover';
    result.gameOver = true;
    return;
  }

  // Clear customers for new day
  state.customers = [];
  spawnTimer = 0;

  // Advance day
  state.day++;
  state.dayProgress = 0;
  state.timeOfDay = 'morning';

  // Show day summary
  state.phase = 'daySummary';
  result.dayEnded = true;
}

function triggerRandomEvent(state: GameState, result: DayTickResult): void {
  // Pick a random event not already active
  const activeIds = state.activeEvents.map(ae => ae.event.id);
  const available = RANDOM_EVENTS.filter(e => !activeIds.includes(e.id));
  if (available.length === 0) return;

  const event = available[Math.floor(Math.random() * available.length)];

  // Randomize demand category for newSetLaunch
  if (event.id === 'newSetLaunch') {
    const randomCat = PRODUCT_LIST[Math.floor(Math.random() * PRODUCT_LIST.length)];
    event.effect.demandMultiplier = { [randomCat]: 3 };
  }

  state.activeEvents.push({
    event,
    daysRemaining: event.duration,
  });

  addToast(state, event.description, event.emoji, 'info');
  result.newEvents.push(event.name);
}

// ===== Particles & Toasts =====

function addParticle(state: GameState, gx: number, gy: number, text: string, color: number): void {
  state.particles.push({
    x: gx,
    y: gy,
    text,
    color,
    alpha: 1,
    vy: -0.5,
    life: 1,
  });
}

function updateParticles(state: GameState, dt: number): void {
  state.particles = state.particles.filter(p => {
    p.life -= dt * 0.5;
    p.alpha = p.life;
    p.y += p.vy * dt;
    return p.life > 0;
  });
}

export function addToast(state: GameState, message: string, emoji: string, type: Toast['type']): void {
  state.toasts.push({ message, emoji, timeLeft: 5, type });
  // Keep max 3 toasts
  if (state.toasts.length > 3) state.toasts.shift();
}

// ===== Public Actions =====

export function hireStaff(state: GameState, role: StaffMember['role']): boolean {
  const roleDef = STAFF_ROLES[role];
  if (!roleDef) return false;

  const maxStaff = BALANCE.MAX_STAFF(state.storeLevel);
  if (state.staff.length >= maxStaff) return false;
  if (state.cash < roleDef.hireCost) return false;

  state.cash -= roleDef.hireCost;
  state.totalExpenses += roleDef.hireCost;

  const newStaff: StaffMember = {
    id: state.nextStaffId++,
    role,
    name: randomStaffName(),
    morale: 70,
    isTraining: true,
    assignedCustomer: null,
    gridX: 5,
    gridY: 5,
    targetX: 5,
    targetY: 5,
    moveProgress: 1,
  };

  state.staff.push(newStaff);
  return true;
}

export function fireStaff(state: GameState, staffId: number): boolean {
  const idx = state.staff.findIndex(s => s.id === staffId);
  if (idx === -1) return false;
  state.staff.splice(idx, 1);
  return true;
}

export function purchaseUpgrade(state: GameState, upgradeId: string): boolean {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return false;
  if (state.upgrades.includes(upgradeId)) return false;
  if (state.day < upgrade.minDay) return false;
  if (state.cash < upgrade.cost) return false;

  state.cash -= upgrade.cost;
  state.totalExpenses += upgrade.cost;
  state.upgrades.push(upgradeId);

  // Apply layout changes
  if (upgradeId === 'playArea') {
    state.layout.playArea = { gridX: 7, gridY: 3 };
  }
  if (upgradeId === 'vipRoom') {
    state.layout.vipArea = { gridX: 7, gridY: 5 };
  }
  if (upgradeId === 'expansion') {
    state.storeLevel++;
    state.layout.gridWidth += 2;
  }
  if (upgradeId === 'extraCheckout') {
    state.layout.checkouts.push({ gridX: 5, gridY: 6, staffId: null, queue: [] });
  }

  return true;
}

export function setSpeed(state: GameState, speed: GameSpeed): void {
  state.speed = speed;
  if (speed === 0) {
    state.phase = 'paused';
  } else if (state.phase === 'paused') {
    state.phase = 'playing';
  }
}

export function resumeFromSummary(state: GameState): void {
  state.phase = 'playing';
}

export function fixEvent(state: GameState, eventId: string): boolean {
  const ae = state.activeEvents.find(e => e.event.id === eventId && e.event.effect.fixCost);
  if (!ae || ae.fixed) return false;
  const cost = ae.event.effect.fixCost!;
  if (state.cash < cost) return false;

  state.cash -= cost;
  state.totalExpenses += cost;
  ae.fixed = true;
  ae.daysRemaining = 0; // end immediately
  return true;
}
