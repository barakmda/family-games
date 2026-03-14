// ─── Types ───────────────────────────────────────────────────────────────────

export type ItemCategory = 'technic' | 'logical' | 'trap' | 'powerup';

export interface GameItem {
  id: number;
  emoji: string;
  name: string;
  category: ItemCategory;
  powerupType?: PowerupType;
}

export interface FallingItem extends GameItem {
  uid: number;
  x: number;        // pixel position
  y: number;        // pixel position
  speed: number;     // pixels per frame
  baseSpeed: number; // original speed (before modifiers)
  rotation: number;  // current rotation
  rotSpeed: number;  // rotation speed
  scale: number;     // current scale
  grabbed: boolean;
  rejected: boolean;
  fadeTimer: number;  // frames left in grab/reject animation
  wobble: number;     // wobble phase
}

export type PowerupType = 'magnet' | 'clock' | 'shield' | 'double';

export type Phase = 'intro' | 'playing' | 'gameover';

export type StageLevel = 1 | 2 | 3;

export interface StageConfig {
  level: StageLevel;
  name: string;
  duration: number;
  spawnIntervalStart: number;
  spawnIntervalMin: number;
  baseSpeed: number;
  maxSpeed: number;
  trapChance: number;     // 0-1
  powerupChance: number;  // 0-1
  zigzag: boolean;
  description: string;
}

export interface GameState {
  phase: Phase;
  stage: StageLevel;
  score: number;
  timeLeft: number;
  mamaMeter: number;
  combo: number;
  technicSaved: number;
  items: FallingItem[];
  quote: string;
  quoteTimer: number;
  playerX: number;        // 0-1 normalized
  activePowerups: ActivePowerup[];
  shakeTimer: number;
  flashColor: string | null;
  flashTimer: number;
  specialEvent: SpecialEvent | null;
  specialEventTimer: number;
}

export interface ActivePowerup {
  type: PowerupType;
  remaining: number; // seconds
}

export type SpecialEvent = 'grandma_calls' | 'dad_enters' | 'cat_jumps';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  emoji?: string;
}

export interface LeaderboardEntry {
  score: number;
  technicSaved: number;
  stage: StageLevel;
  date: number;
}
