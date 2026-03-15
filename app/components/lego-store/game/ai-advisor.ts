import type { GameState, AdvisorTip, ProductCategory } from './types';
import { PRODUCTS, PRODUCT_LIST } from './constants';

/** Generate a contextual AI advisor tip based on current game state */
export function generateAdvisorTip(state: GameState): AdvisorTip | null {
  const tips: AdvisorTip[] = [];

  // === Critical Issues (priority 1) ===

  // Low cash
  if (state.cash < 2000) {
    tips.push({
      message: '\u05D4\u05DE\u05D6\u05D5\u05DE\u05DF \u05E0\u05DE\u05D5\u05DA! \u05E9\u05E7\u05D5\u05DC \u05DC\u05E6\u05DE\u05E6\u05DD \u05D4\u05D5\u05E6\u05D0\u05D5\u05EA \u05D0\u05D5 \u05DC\u05D4\u05D2\u05D3\u05D9\u05DC \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA.',
      priority: 1,
      category: 'finance',
    });
  }

  // No cashier
  if (!state.staff.some(s => s.role === 'cashier')) {
    tips.push({
      message: '\u05D0\u05D9\u05DF \u05E7\u05D5\u05E4\u05D0\u05D9/\u05EA! \u05D0\u05D9 \u05D0\u05E4\u05E9\u05E8 \u05DC\u05E2\u05E9\u05D5\u05EA \u05DE\u05DB\u05D9\u05E8\u05D5\u05EA \u05D1\u05DC\u05D9 \u05E7\u05D5\u05E4\u05D0\u05D9/\u05EA. \u05D2\u05D9\u05D9\u05E1 \u05D0\u05D7\u05D3/\u05EA \u05DE\u05D9\u05D3!',
      priority: 1,
      category: 'staff',
    });
  }

  // Very low morale
  const lowMoraleStaff = state.staff.filter(s => s.morale < 40);
  if (lowMoraleStaff.length > 0) {
    tips.push({
      message: `\u05D4\u05DE\u05D5\u05E8\u05DC \u05E9\u05DC ${lowMoraleStaff[0].name} \u05E0\u05DE\u05D5\u05DA (${lowMoraleStaff[0].morale}). \u05E9\u05E7\u05D5\u05DC \u05DC\u05E9\u05DB\u05D5\u05E8 \u05DE\u05E0\u05D4\u05DC \u05DE\u05E9\u05DE\u05E8\u05EA.`,
      priority: 1,
      category: 'staff',
    });
  }

  // === Important Issues (priority 2) ===

  // Empty shelves
  const emptyCategories = PRODUCT_LIST.filter(cat => state.inventory[cat].stock === 0);
  if (emptyCategories.length > 0) {
    const catName = PRODUCTS[emptyCategories[0]].name;
    tips.push({
      message: `\u05D4\u05DE\u05D3\u05E3 \u05E9\u05DC ${catName} \u05E8\u05D9\u05E7! \u05D4\u05D6\u05DE\u05DF \u05DE\u05DC\u05D0\u05D9 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05EA\u05E4\u05E1\u05D9\u05D3 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA.`,
      priority: 2,
      category: 'inventory',
    });
  }

  // Low stock on popular items
  const lowStockPopular = PRODUCT_LIST.filter(cat => {
    const inv = state.inventory[cat];
    return inv.stock > 0 && inv.stock <= 3 && PRODUCTS[cat].baseDemand >= 4;
  });
  if (lowStockPopular.length > 0) {
    const catName = PRODUCTS[lowStockPopular[0]].name;
    tips.push({
      message: `\u05DE\u05DC\u05D0\u05D9 ${catName} \u05E0\u05DE\u05D5\u05DA (${state.inventory[lowStockPopular[0]].stock}). \u05DB\u05D3\u05D0\u05D9 \u05DC\u05D4\u05D6\u05DE\u05D9\u05DF \u05E2\u05D5\u05D3!`,
      priority: 2,
      category: 'inventory',
    });
  }

  // Low reputation
  if (state.reputation < 35) {
    tips.push({
      message: '\u05D4\u05DE\u05D5\u05E0\u05D9\u05D8\u05D9\u05DF \u05E0\u05DE\u05D5\u05DA. \u05D5\u05D3\u05D0 \u05E9\u05D9\u05E9 \u05DE\u05E1\u05E4\u05D9\u05E7 \u05DE\u05D5\u05DB\u05E8\u05D9\u05DD \u05D5\u05DE\u05DC\u05D0\u05D9 \u05DE\u05DC\u05D0.',
      priority: 2,
      category: 'marketing',
    });
  }

  // === Suggestions (priority 3) ===

  // Excess inventory
  const excessStock = PRODUCT_LIST.filter(cat => state.inventory[cat].stock > 20);
  if (excessStock.length > 0) {
    const catName = PRODUCTS[excessStock[0]].name;
    tips.push({
      message: `\u05D9\u05E9 \u05DC\u05DA \u05E2\u05D5\u05D3\u05E3 \u05DE\u05DC\u05D0\u05D9 \u05E9\u05DC ${catName} (${state.inventory[excessStock[0]].stock}). \u05D0\u05D5\u05DC\u05D9 \u05DC\u05E2\u05E9\u05D5\u05EA \u05D0\u05D9\u05E8\u05D5\u05E2 \u05D4\u05E9\u05E7\u05D4?`,
      priority: 3,
      category: 'marketing',
    });
  }

  // Suggest upgrades
  if (state.day >= 5 && !state.upgrades.includes('lighting') && state.cash >= 2000) {
    tips.push({
      message: '\u05EA\u05D0\u05D5\u05E8\u05D4 \u05DE\u05E9\u05D5\u05E4\u05E8\u05EA \u05EA\u05DE\u05E9\u05D5\u05DA \u05E2\u05D5\u05D3 10% \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA. \u05E9\u05D5\u05D5\u05D4 \u05DC\u05E9\u05D3\u05E8\u05D2!',
      priority: 3,
      category: 'upgrade',
    });
  }

  if (state.day >= 7 && !state.upgrades.includes('playArea') && state.cash >= 5000) {
    tips.push({
      message: '\u05E4\u05D9\u05E0\u05EA \u05DE\u05E9\u05D7\u05E7 \u05EA\u05DE\u05E9\u05D5\u05DA 20% \u05D9\u05D5\u05EA\u05E8 \u05D4\u05D5\u05E8\u05D9\u05DD. \u05D4\u05E9\u05E7\u05E2\u05D4 \u05D8\u05D5\u05D1\u05D4!',
      priority: 3,
      category: 'upgrade',
    });
  }

  // Suggest marketing
  if (state.day >= 5 && !state.activeMarketing && state.marketingCooldown <= 0 && state.reputation >= 40) {
    tips.push({
      message: '\u05E9\u05E7\u05D5\u05DC \u05E9\u05EA"\u05E4 \u05E2\u05DD \u05DE\u05E9\u05E4\u05D9\u05E2\u05DF \u05DC\u05D4\u05D2\u05D3\u05DC\u05EA \u05D4\u05EA\u05E0\u05D5\u05E2\u05D4!',
      priority: 3,
      category: 'marketing',
    });
  }

  // Best selling analysis
  if (state.dailySummaries.length >= 3) {
    const bestCat = findBestSellingCategory(state);
    if (bestCat) {
      tips.push({
        message: `${PRODUCTS[bestCat].name} \u05D4\u05D5\u05D0 \u05D4\u05DE\u05D5\u05E6\u05E8 \u05D4\u05E4\u05D5\u05E4\u05D5\u05DC\u05E8\u05D9 \u05D1\u05D9\u05D5\u05EA\u05E8. \u05D5\u05D3\u05D0 \u05E9\u05D9\u05E9 \u05DE\u05E1\u05E4\u05D9\u05E7 \u05DE\u05DC\u05D0\u05D9!`,
        priority: 3,
        category: 'inventory',
      });
    }
  }

  if (tips.length === 0) return null;

  // Return highest priority tip
  tips.sort((a, b) => a.priority - b.priority);
  return tips[0];
}

function findBestSellingCategory(state: GameState): ProductCategory | null {
  let best: ProductCategory | null = null;
  let bestSold = 0;
  for (const cat of PRODUCT_LIST) {
    const sold = state.inventory[cat].totalSold;
    if (sold > bestSold) {
      bestSold = sold;
      best = cat;
    }
  }
  return best;
}
