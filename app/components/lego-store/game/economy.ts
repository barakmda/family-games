import type { GameState, ProductCategory, DaySummary } from './types';
import { PRODUCTS, BALANCE, STAFF_ROLES } from './constants';

/** Calculate total daily salary costs */
export function calcDailySalaries(state: GameState): number {
  return state.staff.reduce((sum, s) => {
    const role = STAFF_ROLES[s.role];
    return sum + (role?.salary ?? 0);
  }, 0);
}

/** Calculate daily rent (increases with expansions) */
export function calcDailyRent(state: GameState): number {
  const expansions = state.upgrades.filter(u => u === 'expansion').length;
  return BALANCE.RENT_PER_DAY + expansions * BALANCE.RENT_INCREASE_PER_EXPANSION;
}

/** Calculate weekly recurring costs (ads etc) */
export function calcWeeklyRecurring(state: GameState): number {
  let cost = 0;
  if (state.upgrades.includes('mallAd')) cost += 3000;
  return cost;
}

/** Get effective sell price considering events */
export function getEffectiveSellPrice(state: GameState, category: ProductCategory): number {
  let price = PRODUCTS[category].sellPrice;

  // Check for price multiplier events
  for (const ae of state.activeEvents) {
    if (ae.event.effect.priceMultiplier) {
      price *= ae.event.effect.priceMultiplier;
    }
  }
  if (state.activeMarketing?.effect.priceMultiplier) {
    price *= state.activeMarketing.effect.priceMultiplier;
  }

  return Math.round(price);
}

/** Process a sale */
export function processSale(state: GameState, category: ProductCategory): number {
  const price = getEffectiveSellPrice(state, category);
  state.cash += price;
  state.totalRevenue += price;
  state.inventory[category].stock--;
  state.inventory[category].totalSold++;
  return price;
}

/** Pay daily expenses */
export function payDailyExpenses(state: GameState): number {
  const salaries = calcDailySalaries(state);
  const rent = calcDailyRent(state);
  const weekly = state.day % 7 === 0 ? calcWeeklyRecurring(state) : 0;
  const total = salaries + rent + weekly;

  state.cash -= total;
  state.totalExpenses += total;
  return total;
}

/** Place an inventory order */
export function placeOrder(state: GameState, category: ProductCategory, quantity: number): boolean {
  const cost = PRODUCTS[category].buyPrice * quantity;
  if (state.cash < cost) return false;

  state.cash -= cost;
  state.totalExpenses += cost;

  // Calculate delivery day
  let delay = BALANCE.DELIVERY_DELAY;
  for (const ae of state.activeEvents) {
    if (ae.event.effect.deliveryDelay) delay += ae.event.effect.deliveryDelay;
  }

  const inv = state.inventory[category];
  inv.onOrder += quantity;
  inv.onOrderDay = state.day + delay;
  return true;
}

/** Deliver pending orders */
export function processDeliveries(state: GameState): void {
  for (const cat of Object.keys(state.inventory) as ProductCategory[]) {
    const inv = state.inventory[cat];
    if (inv.onOrder > 0 && state.day >= inv.onOrderDay) {
      inv.stock += inv.onOrder;
      inv.onOrder = 0;
    }
  }
}

/** Check for debt gameover */
export function checkDebt(state: GameState): boolean {
  if (state.cash < BALANCE.DEBT_THRESHOLD) {
    state.daysInDebt++;
  } else {
    state.daysInDebt = 0;
  }
  return state.daysInDebt >= BALANCE.DEBT_DAYS_GAMEOVER;
}

/** Generate end-of-day summary */
export function generateDaySummary(
  state: GameState,
  dayRevenue: number,
  dayExpenses: number,
  customersServed: number,
  customersLost: number,
  itemsSold: number,
  reputationChange: number,
  eventNames: string[],
): DaySummary {
  return {
    day: state.day,
    revenue: dayRevenue,
    expenses: dayExpenses,
    profit: dayRevenue - dayExpenses,
    customersServed,
    customersLost,
    itemsSold,
    reputationChange,
    events: eventNames,
  };
}

/** Check and award milestones */
export function checkMilestones(state: GameState): string | null {
  const profit = state.totalProfit;
  const stars = Math.ceil(state.reputation / 20);

  if (!state.milestones.gold && profit >= BALANCE.MILESTONE_GOLD && stars >= 5 && state.upgrades.length >= 8) {
    state.milestones.gold = true;
    return '\u{1F947} \u05D4\u05D2\u05E2\u05EA \u05DC\u05D9\u05E2\u05D3 \u05D4\u05D6\u05D4\u05D1! \u05D7\u05E0\u05D5\u05EA \u05D4\u05DC\u05D2\u05D5 \u05D4\u05D0\u05D2\u05D3\u05D9\u05EA!';
  }
  if (!state.milestones.silver && profit >= BALANCE.MILESTONE_SILVER && stars >= 4) {
    state.milestones.silver = true;
    return '\u{1F948} \u05D4\u05D2\u05E2\u05EA \u05DC\u05D9\u05E2\u05D3 \u05D4\u05DB\u05E1\u05E3! \u05DE\u05E0\u05D4\u05DC \u05DE\u05E6\u05D8\u05D9\u05D9\u05DF!';
  }
  if (!state.milestones.bronze && profit >= BALANCE.MILESTONE_BRONZE) {
    state.milestones.bronze = true;
    return '\u{1F949} \u05D4\u05D2\u05E2\u05EA \u05DC\u05D9\u05E2\u05D3 \u05D4\u05D0\u05E8\u05D3! \u05D4\u05D7\u05E0\u05D5\u05EA \u05DE\u05E8\u05D5\u05D5\u05D9\u05D7\u05D4!';
  }
  return null;
}
