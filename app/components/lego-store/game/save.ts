import type { GameState } from './types';

const SAVE_KEY = 'lego-store-save';
const LEADERBOARD_KEY = 'lego-store-leaderboard';

export interface LeaderboardEntry {
  day: number;
  totalProfit: number;
  reputation: number;
  date: number;
}

/** Save game state to localStorage */
export function saveGame(state: GameState): void {
  try {
    // Don't save particles/toasts (transient visual state)
    const toSave = {
      ...state,
      particles: [],
      toasts: [],
      customers: [], // customers are transient per-day
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage full or unavailable
  }
}

/** Load game state from localStorage */
export function loadGame(): Partial<GameState> | null {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** Delete saved game */
export function deleteSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

/** Check if a save exists */
export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Load leaderboard */
export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/** Save to leaderboard */
export function saveToLeaderboard(entry: LeaderboardEntry): void {
  try {
    const board = loadLeaderboard();
    board.push(entry);
    board.sort((a, b) => b.totalProfit - a.totalProfit);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board.slice(0, 5)));
  } catch {
    // ignore
  }
}
