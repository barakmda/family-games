'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Cell {
  walls: [boolean, boolean, boolean, boolean]; // top, right, bottom, left
  visited: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface GridPos {
  row: number;
  col: number;
}

interface Enemy {
  pos: Point;
  target: GridPos;
  speed: number;
  path: GridPos[];
  pathIndex: number;
  emoji: string;
  stunned: number; // stun timer in ms
}

interface Collectible {
  pos: GridPos;
  type: 'time' | 'shield' | 'speed' | 'stun';
  emoji: string;
  collected: boolean;
  bobPhase: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

type Phase = 'intro' | 'playing' | 'won' | 'lost' | 'levelSelect';

interface LevelConfig {
  id: number;
  name: string;
  rows: number;
  cols: number;
  timeLimit: number;
  enemyCount: number;
  collectibleCount: number;
  lightRadius: number;
  enemySpeed: number;
  story: string;
}

// ─── Level Configs ───────────────────────────────────────────────────────────

const LEVELS: LevelConfig[] = [
  {
    id: 1, name: 'מנהרת הבריחה', rows: 10, cols: 10,
    timeLimit: 60, enemyCount: 1, collectibleCount: 3,
    lightRadius: 4, enemySpeed: 1.2,
    story: 'מיכל שומעת את הצפירה! היא צריכה לרוץ דרך המנהרה החשוכה למקלט.',
  },
  {
    id: 2, name: 'המרתף האפל', rows: 12, cols: 12,
    timeLimit: 55, enemyCount: 2, collectibleCount: 4,
    lightRadius: 3.5, enemySpeed: 1.5,
    story: 'המנהרה הובילה למרתף ישן. חתולי רחוב מסתובבים פה!',
  },
  {
    id: 3, name: 'רחובות החושך', rows: 14, cols: 14,
    timeLimit: 50, enemyCount: 3, collectibleCount: 5,
    lightRadius: 3, enemySpeed: 1.8,
    story: 'מיכל יוצאת לרחוב. החשיכה מפחידה אבל המקלט קרוב!',
  },
  {
    id: 4, name: 'הבניין הנטוש', rows: 16, cols: 14,
    timeLimit: 45, enemyCount: 4, collectibleCount: 5,
    lightRadius: 2.5, enemySpeed: 2,
    story: 'בניין ישן חוסם את הדרך. מיכל חייבת לעבור דרכו!',
  },
  {
    id: 5, name: 'הדרך למקלט', rows: 18, cols: 16,
    timeLimit: 45, enemyCount: 5, collectibleCount: 6,
    lightRadius: 2.5, enemySpeed: 2.2,
    story: 'המקלט ממש פה! רק עוד קצת... אבל האויבים בכל מקום!',
  },
];

// ─── Sound Effects ───────────────────────────────────────────────────────────

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { _mazeProAudioCtx?: AudioContext };
  if (!w._mazeProAudioCtx) {
    w._mazeProAudioCtx = new AudioContext();
  }
  return w._mazeProAudioCtx;
}

function playStep() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 200 + Math.random() * 100;
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

function playCollect() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [0, 0.06, 0.12].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = [660, 880, 1100][i];
    gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.1);
  });
}

function playHit() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

function playWin() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.3);
  });
}

function playLose() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes = [392, 330, 262, 196];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.2);
    osc.stop(ctx.currentTime + i * 0.2 + 0.3);
  });
}

function playSiren() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
  osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.0);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.8);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 1.0);
}

function playStun() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

// ─── Maze Generation (Recursive Backtracker) ────────────────────────────────

function generateMaze(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      walls: [true, true, true, true] as [boolean, boolean, boolean, boolean],
      visited: false,
    }))
  );

  const stack: GridPos[] = [];
  const start: GridPos = { row: 0, col: 0 };
  grid[start.row][start.col].visited = true;
  stack.push(start);

  const directions: [number, number, number, number][] = [
    [-1, 0, 0, 2], // top: remove top of current, bottom of neighbor
    [0, 1, 1, 3],  // right: remove right of current, left of neighbor
    [1, 0, 2, 0],  // bottom
    [0, -1, 3, 1], // left
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { pos: GridPos; dirIdx: number }[] = [];

    for (let d = 0; d < 4; d++) {
      const nr = current.row + directions[d][0];
      const nc = current.col + directions[d][1];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
        neighbors.push({ pos: { row: nr, col: nc }, dirIdx: d });
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
      const dir = directions[chosen.dirIdx];
      // Remove walls between current and chosen
      grid[current.row][current.col].walls[dir[2]] = false;
      grid[chosen.pos.row][chosen.pos.col].walls[dir[3]] = false;
      grid[chosen.pos.row][chosen.pos.col].visited = true;
      stack.push(chosen.pos);
    }
  }

  // Remove a few extra walls to create loops (makes it more interesting)
  const extraRemovals = Math.floor(rows * cols * 0.08);
  for (let i = 0; i < extraRemovals; i++) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const d = Math.floor(Math.random() * 4);
    const nr = r + directions[d][0];
    const nc = c + directions[d][1];
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      grid[r][c].walls[directions[d][2]] = false;
      grid[nr][nc].walls[directions[d][3]] = false;
    }
  }

  return grid;
}

// ─── Pathfinding (BFS) ──────────────────────────────────────────────────────

function canMove(grid: Cell[][], from: GridPos, dir: number): boolean {
  return !grid[from.row][from.col].walls[dir];
}

function bfsPath(grid: Cell[][], start: GridPos, end: GridPos): GridPos[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = new Set<string>();
  const queue: { pos: GridPos; path: GridPos[] }[] = [{ pos: start, path: [start] }];
  visited.add(`${start.row},${start.col}`);

  const dirs: [number, number, number][] = [
    [-1, 0, 0], // top
    [0, 1, 1],  // right
    [1, 0, 2],  // bottom
    [0, -1, 3], // left
  ];

  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    if (pos.row === end.row && pos.col === end.col) return path;

    for (const [dr, dc, wallIdx] of dirs) {
      if (!canMove(grid, pos, wallIdx)) continue;
      const nr = pos.row + dr;
      const nc = pos.col + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key)) {
        visited.add(key);
        queue.push({ pos: { row: nr, col: nc }, path: [...path, { row: nr, col: nc }] });
      }
    }
  }

  return [start]; // fallback
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function gridToPixel(pos: GridPos, cellSize: number): Point {
  return { x: pos.col * cellSize + cellSize / 2, y: pos.row * cellSize + cellSize / 2 };
}

function pixelToGrid(pos: Point, cellSize: number): GridPos {
  return { row: Math.floor(pos.y / cellSize), col: Math.floor(pos.x / cellSize) };
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MamadMazePro() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [speedBoost, setSpeedBoost] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState<Record<number, { stars: number; bestTime: number }>>({});
  const [highScore, setHighScore] = useState(0);

  // Canvas & game refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const stepSoundRef = useRef(0);

  // Game state refs (for animation frame access)
  const gridRef = useRef<Cell[][]>([]);
  const playerRef = useRef<Point>({ x: 0, y: 0 });
  const playerGridRef = useRef<GridPos>({ row: 0, col: 0 });
  const goalRef = useRef<GridPos>({ row: 0, col: 0 });
  const enemiesRef = useRef<Enemy[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cellSizeRef = useRef(0);
  const phaseRef = useRef<Phase>('intro');
  const timeLeftRef = useRef(0);
  const scoreRef = useRef(0);
  const shieldRef = useRef(false);
  const speedRef = useRef(false);
  const shieldTimerRef = useRef(0);
  const speedTimerRef = useRef(0);
  const levelRef = useRef<LevelConfig>(LEVELS[0]);
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<Point | null>(null);
  const joystickBaseRef = useRef<Point | null>(null);
  const trailRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const revealedRef = useRef<Set<string>>(new Set());

  // Sync refs
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { shieldRef.current = shieldActive; }, [shieldActive]);
  useEffect(() => { speedRef.current = speedBoost; }, [speedBoost]);

  // Load progress
  useEffect(() => {
    const saved = localStorage.getItem('mamad-maze-pro-progress');
    if (saved) {
      try { setProgress(JSON.parse(saved)); } catch { /* ignore */ }
    }
    const hs = localStorage.getItem('mamad-maze-pro-highscore');
    if (hs) setHighScore(parseInt(hs, 10));
  }, []);

  // ── Show message ──
  const showMessage = useCallback((text: string, duration = 2000) => {
    setMessage(text);
    setTimeout(() => setMessage(''), duration);
  }, []);

  // ── Spawn particles ──
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      newParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        color,
        size: 2 + Math.random() * 4,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  // ── Place collectibles ──
  const placeCollectibles = useCallback((grid: Cell[][], level: LevelConfig, start: GridPos, end: GridPos): Collectible[] => {
    const items: Collectible[] = [];
    const used = new Set<string>();
    used.add(`${start.row},${start.col}`);
    used.add(`${end.row},${end.col}`);

    const types: Array<{ type: Collectible['type']; emoji: string }> = [
      { type: 'time', emoji: '⏰' },
      { type: 'shield', emoji: '🛡️' },
      { type: 'speed', emoji: '⚡' },
      { type: 'stun', emoji: '💫' },
    ];

    for (let i = 0; i < level.collectibleCount; i++) {
      let attempts = 0;
      while (attempts < 100) {
        const row = Math.floor(Math.random() * level.rows);
        const col = Math.floor(Math.random() * level.cols);
        const key = `${row},${col}`;
        // Place away from start
        const distFromStart = Math.abs(row - start.row) + Math.abs(col - start.col);
        if (!used.has(key) && distFromStart > 3) {
          used.add(key);
          const t = types[i % types.length];
          items.push({
            pos: { row, col },
            type: t.type,
            emoji: t.emoji,
            collected: false,
            bobPhase: Math.random() * Math.PI * 2,
          });
          break;
        }
        attempts++;
      }
    }
    return items;
  }, []);

  // ── Place enemies ──
  const placeEnemies = useCallback((grid: Cell[][], level: LevelConfig, start: GridPos): Enemy[] => {
    const enemies: Enemy[] = [];
    const emojis = ['🐱', '🐀', '🦇', '👻', '🕷️'];
    const used = new Set<string>();
    used.add(`${start.row},${start.col}`);

    for (let i = 0; i < level.enemyCount; i++) {
      let attempts = 0;
      while (attempts < 100) {
        const row = Math.floor(Math.random() * level.rows);
        const col = Math.floor(Math.random() * level.cols);
        const key = `${row},${col}`;
        const distFromStart = Math.abs(row - start.row) + Math.abs(col - start.col);
        if (!used.has(key) && distFromStart > 4) {
          used.add(key);
          // Give enemy a patrol path using BFS to a random point
          const targetRow = Math.floor(Math.random() * level.rows);
          const targetCol = Math.floor(Math.random() * level.cols);
          const path = bfsPath(grid, { row, col }, { row: targetRow, col: targetCol });
          const cellSize = cellSizeRef.current;
          enemies.push({
            pos: gridToPixel({ row, col }, cellSize),
            target: { row, col },
            speed: level.enemySpeed,
            path,
            pathIndex: 0,
            emoji: emojis[i % emojis.length],
            stunned: 0,
          });
          break;
        }
        attempts++;
      }
    }
    return enemies;
  }, []);

  // ── Initialize level ──
  const initLevel = useCallback((levelIdx: number) => {
    const level = LEVELS[levelIdx];
    levelRef.current = level;

    // Calculate cell size based on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maxW = Math.min(window.innerWidth - 16, 500);
    const maxH = Math.min(window.innerHeight - 200, 500);
    const cellW = Math.floor(maxW / level.cols);
    const cellH = Math.floor(maxH / level.rows);
    const cellSize = Math.min(cellW, cellH, 36);
    cellSizeRef.current = cellSize;

    canvas.width = level.cols * cellSize;
    canvas.height = level.rows * cellSize;

    // Minimap
    const minimap = minimapRef.current;
    if (minimap) {
      const miniCellSize = 4;
      minimap.width = level.cols * miniCellSize;
      minimap.height = level.rows * miniCellSize;
    }

    // Generate maze
    const grid = generateMaze(level.rows, level.cols);
    gridRef.current = grid;

    // Start & goal
    const start: GridPos = { row: 0, col: 0 };
    const goal: GridPos = { row: level.rows - 1, col: level.cols - 1 };
    goalRef.current = goal;

    // Player position
    const playerPixel = gridToPixel(start, cellSize);
    playerRef.current = playerPixel;
    playerGridRef.current = start;

    // Collectibles & enemies
    collectiblesRef.current = placeCollectibles(grid, level, start, goal);
    enemiesRef.current = placeEnemies(grid, level, start);
    particlesRef.current = [];
    trailRef.current = [];
    revealedRef.current = new Set();

    // Reset state
    setTimeLeft(level.timeLimit);
    timeLeftRef.current = level.timeLimit;
    setScore(0);
    scoreRef.current = 0;
    setShieldActive(false);
    shieldRef.current = false;
    setSpeedBoost(false);
    speedRef.current = false;
    shieldTimerRef.current = 0;
    speedTimerRef.current = 0;
    lastTimeRef.current = 0;
  }, [placeCollectibles, placeEnemies]);

  // ── Render ──
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grid = gridRef.current;
    const cellSize = cellSizeRef.current;
    const level = levelRef.current;
    const player = playerRef.current;
    const playerGrid = playerGridRef.current;

    // Update revealed cells (permanent fog of war)
    const lightR = level.lightRadius;
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const cellCenter = gridToPixel({ row: r, col: c }, cellSize);
        const d = dist(player, cellCenter) / cellSize;
        if (d <= lightR) {
          revealedRef.current.add(`${r},${c}`);
        }
      }
    }

    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw maze cells
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        const cellCenter = gridToPixel({ row: r, col: c }, cellSize);
        const d = dist(player, cellCenter) / cellSize;
        const isRevealed = revealedRef.current.has(`${r},${c}`);

        if (!isRevealed && d > lightR) {
          // Completely dark
          ctx.fillStyle = '#0a0a0f';
          ctx.fillRect(x, y, cellSize, cellSize);
          continue;
        }

        // Calculate brightness
        let brightness: number;
        if (d <= lightR) {
          brightness = Math.max(0.15, 1 - (d / lightR) * 0.85);
        } else {
          brightness = 0.08; // dimly revealed
        }

        // Floor
        const floorR = Math.floor(30 * brightness);
        const floorG = Math.floor(35 * brightness);
        const floorB = Math.floor(50 * brightness);
        ctx.fillStyle = `rgb(${floorR},${floorG},${floorB})`;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Walls
        const wallColor = `rgba(100,130,200,${brightness * 0.8})`;
        ctx.strokeStyle = wallColor;
        ctx.lineWidth = 2;
        const cell = grid[r][c];

        if (cell.walls[0]) { // top
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellSize, y);
          ctx.stroke();
        }
        if (cell.walls[1]) { // right
          ctx.beginPath();
          ctx.moveTo(x + cellSize, y);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.stroke();
        }
        if (cell.walls[2]) { // bottom
          ctx.beginPath();
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.stroke();
        }
        if (cell.walls[3]) { // left
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cellSize);
          ctx.stroke();
        }
      }
    }

    // Draw goal
    const goal = goalRef.current;
    const goalPixel = gridToPixel(goal, cellSize);
    const goalDist = dist(player, goalPixel) / cellSize;
    if (goalDist <= lightR || revealedRef.current.has(`${goal.row},${goal.col}`)) {
      const goalBright = goalDist <= lightR ? Math.max(0.3, 1 - goalDist / lightR) : 0.15;
      ctx.globalAlpha = goalBright;
      // Pulsing glow
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
      const glowRadius = cellSize * 0.6 + pulse * cellSize * 0.2;
      const glow = ctx.createRadialGradient(goalPixel.x, goalPixel.y, 0, goalPixel.x, goalPixel.y, glowRadius);
      glow.addColorStop(0, 'rgba(34,197,94,0.4)');
      glow.addColorStop(1, 'rgba(34,197,94,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(goalPixel.x - glowRadius, goalPixel.y - glowRadius, glowRadius * 2, glowRadius * 2);

      ctx.font = `${cellSize * 0.7}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText('🛡️', goalPixel.x, goalPixel.y);
      ctx.globalAlpha = 1;
    }

    // Draw collectibles
    collectiblesRef.current.forEach(col => {
      if (col.collected) return;
      const colPixel = gridToPixel(col.pos, cellSize);
      const colDist = dist(player, colPixel) / cellSize;
      if (colDist > lightR && !revealedRef.current.has(`${col.pos.row},${col.pos.col}`)) return;

      const brightness = colDist <= lightR ? Math.max(0.3, 1 - colDist / lightR) : 0.15;
      ctx.globalAlpha = brightness;

      // Bob animation
      const bob = Math.sin(Date.now() / 400 + col.bobPhase) * 3;
      ctx.font = `${cellSize * 0.55}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(col.emoji, colPixel.x, colPixel.y + bob);
      ctx.globalAlpha = 1;
    });

    // Draw enemies
    enemiesRef.current.forEach(enemy => {
      const eDist = dist(player, enemy.pos) / cellSize;
      if (eDist > lightR + 1) return; // slightly more visible range

      const brightness = Math.max(0.2, 1 - eDist / (lightR + 1));
      ctx.globalAlpha = brightness;

      if (enemy.stunned > 0) {
        // Stunned effect
        ctx.globalAlpha = brightness * (0.3 + 0.7 * Math.sin(Date.now() / 100));
      }

      ctx.font = `${cellSize * 0.65}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(enemy.emoji, enemy.pos.x, enemy.pos.y);

      // Red glow around enemy
      const enemyGlow = ctx.createRadialGradient(enemy.pos.x, enemy.pos.y, 0, enemy.pos.x, enemy.pos.y, cellSize * 0.5);
      enemyGlow.addColorStop(0, `rgba(239,68,68,${0.15 * brightness})`);
      enemyGlow.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = enemyGlow;
      ctx.fillRect(enemy.pos.x - cellSize, enemy.pos.y - cellSize, cellSize * 2, cellSize * 2);

      ctx.globalAlpha = 1;
    });

    // Draw player trail
    trailRef.current.forEach(t => {
      ctx.globalAlpha = t.alpha * 0.3;
      ctx.fillStyle = shieldRef.current ? '#60a5fa' : speedRef.current ? '#fbbf24' : '#c084fc';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw player
    // Glow
    const playerGlow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, cellSize * lightR);
    playerGlow.addColorStop(0, 'rgba(251,191,36,0.12)');
    playerGlow.addColorStop(0.5, 'rgba(251,191,36,0.03)');
    playerGlow.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = playerGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Shield visual
    if (shieldRef.current) {
      ctx.strokeStyle = 'rgba(96,165,250,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, cellSize * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = `${cellSize * 0.7}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText('👧', player.x, player.y);

    // Draw particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // ── Minimap ──
    const minimap = minimapRef.current;
    if (minimap) {
      const mctx = minimap.getContext('2d');
      if (mctx) {
        const mc = 4; // mini cell size
        mctx.fillStyle = '#1a1a2e';
        mctx.fillRect(0, 0, minimap.width, minimap.height);

        for (let r = 0; r < level.rows; r++) {
          for (let c = 0; c < level.cols; c++) {
            if (!revealedRef.current.has(`${r},${c}`)) {
              mctx.fillStyle = '#0a0a0f';
              mctx.fillRect(c * mc, r * mc, mc, mc);
              continue;
            }
            mctx.fillStyle = '#2a2a4e';
            mctx.fillRect(c * mc, r * mc, mc, mc);

            mctx.strokeStyle = 'rgba(100,130,200,0.5)';
            mctx.lineWidth = 0.5;
            const cell = grid[r][c];
            if (cell.walls[0]) { mctx.beginPath(); mctx.moveTo(c * mc, r * mc); mctx.lineTo(c * mc + mc, r * mc); mctx.stroke(); }
            if (cell.walls[1]) { mctx.beginPath(); mctx.moveTo(c * mc + mc, r * mc); mctx.lineTo(c * mc + mc, r * mc + mc); mctx.stroke(); }
            if (cell.walls[2]) { mctx.beginPath(); mctx.moveTo(c * mc, r * mc + mc); mctx.lineTo(c * mc + mc, r * mc + mc); mctx.stroke(); }
            if (cell.walls[3]) { mctx.beginPath(); mctx.moveTo(c * mc, r * mc); mctx.lineTo(c * mc, r * mc + mc); mctx.stroke(); }
          }
        }

        // Goal on minimap
        mctx.fillStyle = '#22c55e';
        mctx.fillRect(goal.col * mc + 1, goal.row * mc + 1, mc - 2, mc - 2);

        // Enemies on minimap
        enemiesRef.current.forEach(e => {
          const eg = pixelToGrid(e.pos, cellSize);
          if (revealedRef.current.has(`${eg.row},${eg.col}`)) {
            mctx.fillStyle = '#ef4444';
            mctx.fillRect(eg.col * mc + 1, eg.row * mc + 1, mc - 2, mc - 2);
          }
        });

        // Player on minimap
        mctx.fillStyle = '#fbbf24';
        mctx.fillRect(playerGrid.col * mc, playerGrid.row * mc, mc, mc);
      }
    }
  }, []);

  // ── Game loop ──
  const gameLoop = useCallback((timestamp: number) => {
    if (phaseRef.current !== 'playing') return;

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05); // delta in seconds, capped
    lastTimeRef.current = timestamp;

    const cellSize = cellSizeRef.current;
    const grid = gridRef.current;
    const level = levelRef.current;

    // ── Timer ──
    timeLeftRef.current -= dt;
    setTimeLeft(Math.max(0, Math.ceil(timeLeftRef.current)));
    if (timeLeftRef.current <= 0) {
      setPhase('lost');
      playLose();
      return;
    }

    // ── Player movement ──
    let dx = 0, dy = 0;
    const keys = keysRef.current;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy = -1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy = 1;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx = -1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx = 1;

    // Joystick
    if (joystickRef.current && joystickBaseRef.current) {
      const jd = {
        x: joystickRef.current.x - joystickBaseRef.current.x,
        y: joystickRef.current.y - joystickBaseRef.current.y,
      };
      const jDist = Math.sqrt(jd.x * jd.x + jd.y * jd.y);
      if (jDist > 10) {
        dx = jd.x / jDist;
        dy = jd.y / jDist;
      }
    }

    if (dx !== 0 || dy !== 0) {
      const baseSpeed = cellSize * 3.5; // pixels per second
      const speed = speedRef.current ? baseSpeed * 1.6 : baseSpeed;
      const moveX = dx * speed * dt;
      const moveY = dy * speed * dt;

      const player = playerRef.current;
      const newX = player.x + moveX;
      const newY = player.y + moveY;

      // Collision detection - check walls
      const margin = cellSize * 0.3;
      const currentGrid = pixelToGrid(player, cellSize);

      // Try X movement
      let canMoveX = true;
      const testGridX = pixelToGrid({ x: newX, y: player.y }, cellSize);
      if (testGridX.col !== currentGrid.col) {
        if (moveX > 0 && grid[currentGrid.row]?.[currentGrid.col]?.walls[1]) canMoveX = false;
        if (moveX < 0 && grid[currentGrid.row]?.[currentGrid.col]?.walls[3]) canMoveX = false;
      }
      // Check boundaries
      if (newX - margin < 0 || newX + margin > level.cols * cellSize) canMoveX = false;

      // Also prevent going into wall from neighbor side
      if (canMoveX && testGridX.col !== currentGrid.col) {
        if (testGridX.row >= 0 && testGridX.row < level.rows && testGridX.col >= 0 && testGridX.col < level.cols) {
          // valid
        } else {
          canMoveX = false;
        }
      }

      // Try Y movement
      let canMoveY = true;
      const testGridY = pixelToGrid({ x: player.x, y: newY }, cellSize);
      if (testGridY.row !== currentGrid.row) {
        if (moveY > 0 && grid[currentGrid.row]?.[currentGrid.col]?.walls[2]) canMoveY = false;
        if (moveY < 0 && grid[currentGrid.row]?.[currentGrid.col]?.walls[0]) canMoveY = false;
      }
      if (newY - margin < 0 || newY + margin > level.rows * cellSize) canMoveY = false;

      if (canMoveY && testGridY.row !== currentGrid.row) {
        if (testGridY.row >= 0 && testGridY.row < level.rows && testGridY.col >= 0 && testGridY.col < level.cols) {
          // valid
        } else {
          canMoveY = false;
        }
      }

      const finalX = canMoveX ? newX : player.x;
      const finalY = canMoveY ? newY : player.y;

      // Snap to cell center when crossing cell boundary to avoid wall clipping
      const finalGrid = pixelToGrid({ x: finalX, y: finalY }, cellSize);
      const cellCenter = gridToPixel(finalGrid, cellSize);

      // Gentle attraction toward cell center to prevent getting stuck
      const snapForce = 0.1;
      const snappedX = finalX + (cellCenter.x - finalX) * snapForce;
      const snappedY = finalY + (cellCenter.y - finalY) * snapForce;

      playerRef.current = { x: canMoveX ? snappedX : player.x, y: canMoveY ? snappedY : player.y };
      playerGridRef.current = pixelToGrid(playerRef.current, cellSize);

      // Trail
      trailRef.current.push({ x: playerRef.current.x, y: playerRef.current.y, alpha: 1 });
      if (trailRef.current.length > 30) trailRef.current.shift();

      // Step sound (throttled)
      stepSoundRef.current += dt;
      if (stepSoundRef.current > 0.2) {
        stepSoundRef.current = 0;
        playStep();
      }
    }

    // Fade trail
    trailRef.current = trailRef.current
      .map(t => ({ ...t, alpha: t.alpha - dt * 2 }))
      .filter(t => t.alpha > 0);

    // ── Powerup timers ──
    if (shieldTimerRef.current > 0) {
      shieldTimerRef.current -= dt;
      if (shieldTimerRef.current <= 0) {
        setShieldActive(false);
        shieldRef.current = false;
      }
    }
    if (speedTimerRef.current > 0) {
      speedTimerRef.current -= dt;
      if (speedTimerRef.current <= 0) {
        setSpeedBoost(false);
        speedRef.current = false;
      }
    }

    // ── Collectible pickup ──
    const playerPos = playerRef.current;
    collectiblesRef.current.forEach((col, idx) => {
      if (col.collected) return;
      const colPixel = gridToPixel(col.pos, cellSize);
      if (dist(playerPos, colPixel) < cellSize * 0.6) {
        collectiblesRef.current[idx] = { ...col, collected: true };
        playCollect();
        spawnParticles(colPixel.x, colPixel.y, '#fbbf24', 15);

        switch (col.type) {
          case 'time':
            timeLeftRef.current += 8;
            setTimeLeft(t => t + 8);
            showMessage('+8 שניות! ⏰');
            break;
          case 'shield':
            setShieldActive(true);
            shieldRef.current = true;
            shieldTimerRef.current = 5;
            showMessage('מגן! 🛡️ (5 שניות)');
            break;
          case 'speed':
            setSpeedBoost(true);
            speedRef.current = true;
            speedTimerRef.current = 5;
            showMessage('טורבו! ⚡ (5 שניות)');
            break;
          case 'stun':
            enemiesRef.current.forEach(e => { e.stunned = 3000; });
            playStun();
            showMessage('כל האויבים מוממים! 💫');
            break;
        }

        setScore(s => {
          const ns = s + 50;
          scoreRef.current = ns;
          return ns;
        });
      }
    });

    // ── Enemy movement ──
    enemiesRef.current.forEach(enemy => {
      if (enemy.stunned > 0) {
        enemy.stunned -= dt * 1000;
        return;
      }

      // Move along path
      if (enemy.pathIndex < enemy.path.length) {
        const target = gridToPixel(enemy.path[enemy.pathIndex], cellSize);
        const edx = target.x - enemy.pos.x;
        const edy = target.y - enemy.pos.y;
        const eDist = Math.sqrt(edx * edx + edy * edy);

        if (eDist < 2) {
          enemy.pathIndex++;
          if (enemy.pathIndex >= enemy.path.length) {
            // Pick new random target
            const newTarget: GridPos = {
              row: Math.floor(Math.random() * level.rows),
              col: Math.floor(Math.random() * level.cols),
            };
            const currentGrid = pixelToGrid(enemy.pos, cellSize);
            enemy.path = bfsPath(grid, currentGrid, newTarget);
            enemy.pathIndex = 0;
          }
        } else {
          const moveSpeed = enemy.speed * cellSize * dt;
          enemy.pos.x += (edx / eDist) * moveSpeed;
          enemy.pos.y += (edy / eDist) * moveSpeed;
        }
      }

      // Check collision with player
      if (dist(enemy.pos, playerPos) < cellSize * 0.5) {
        if (shieldRef.current) {
          // Shield absorbs hit
          setShieldActive(false);
          shieldRef.current = false;
          shieldTimerRef.current = 0;
          playHit();
          spawnParticles(playerPos.x, playerPos.y, '#60a5fa', 20);
          showMessage('המגן הגן עליך! 🛡️💥');
          // Push enemy away
          const pushAngle = Math.atan2(enemy.pos.y - playerPos.y, enemy.pos.x - playerPos.x);
          enemy.pos.x += Math.cos(pushAngle) * cellSize * 2;
          enemy.pos.y += Math.sin(pushAngle) * cellSize * 2;
          enemy.stunned = 2000;
        } else {
          // Hit! Lose time
          playHit();
          spawnParticles(playerPos.x, playerPos.y, '#ef4444', 25);
          showMessage('אאוץ׳! -5 שניות! 💥');
          timeLeftRef.current -= 5;
          setTimeLeft(t => Math.max(0, t - 5));
          // Push enemy back
          const pushAngle = Math.atan2(enemy.pos.y - playerPos.y, enemy.pos.x - playerPos.x);
          enemy.pos.x += Math.cos(pushAngle) * cellSize * 3;
          enemy.pos.y += Math.sin(pushAngle) * cellSize * 3;
          enemy.stunned = 1500;
        }
      }
    });

    // ── Check win ──
    const goalPixel = gridToPixel(goalRef.current, cellSize);
    if (dist(playerPos, goalPixel) < cellSize * 0.5) {
      setPhase('won');
      playWin();
      spawnParticles(goalPixel.x, goalPixel.y, '#22c55e', 40);
      spawnParticles(goalPixel.x, goalPixel.y, '#fbbf24', 30);

      // Calculate score
      const timeBonus = Math.floor(timeLeftRef.current * 10);
      const collected = collectiblesRef.current.filter(c => c.collected).length;
      const collectBonus = collected * 50;
      const finalScore = scoreRef.current + timeBonus + collectBonus;
      setScore(finalScore);

      // Stars
      const timeRatio = timeLeftRef.current / level.timeLimit;
      const collectRatio = collectiblesRef.current.length > 0 ? collected / collectiblesRef.current.length : 1;
      const rating = (timeRatio + collectRatio) / 2;
      const stars = rating >= 0.7 ? 3 : rating >= 0.4 ? 2 : 1;

      // Save progress
      const newProgress = { ...progress };
      const existing = newProgress[level.id];
      if (!existing || stars > existing.stars || (stars === existing.stars && timeLeftRef.current > level.timeLimit - existing.bestTime)) {
        newProgress[level.id] = { stars, bestTime: Math.floor(level.timeLimit - timeLeftRef.current) };
      }
      setProgress(newProgress);
      localStorage.setItem('mamad-maze-pro-progress', JSON.stringify(newProgress));

      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('mamad-maze-pro-highscore', finalScore.toString());
      }

      return;
    }

    // ── Update particles ──
    particlesRef.current = particlesRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        vy: p.vy + 100 * dt, // gravity
        life: p.life - dt,
      }))
      .filter(p => p.life > 0);

    // ── Render ──
    render();

    animRef.current = requestAnimationFrame(gameLoop);
  }, [render, spawnParticles, showMessage, progress, highScore]);

  // ── Start game ──
  const startGame = useCallback((levelIdx: number) => {
    setCurrentLevel(levelIdx);
    setPhase('playing');
    phaseRef.current = 'playing';
    lastTimeRef.current = 0;

    // Small delay to ensure canvas is mounted
    requestAnimationFrame(() => {
      initLevel(levelIdx);
      playSiren();
      animRef.current = requestAnimationFrame(gameLoop);
    });
  }, [initLevel, gameLoop]);

  // ── Keyboard input ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // ── Touch joystick ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    joystickBaseRef.current = { x, y };
    joystickRef.current = { x, y };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!joystickBaseRef.current) return;
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    joystickRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    joystickBaseRef.current = null;
    joystickRef.current = null;
  }, []);

  // ── D-Pad handlers ──
  const dpadDown = useCallback((key: string) => {
    keysRef.current.add(key);
  }, []);
  const dpadUp = useCallback((key: string) => {
    keysRef.current.delete(key);
  }, []);

  // ─── Render phase: lost ──
  useEffect(() => {
    // Do one final render when game ends to show particles
    if (phase === 'won' || phase === 'lost') {
      const renderFinal = () => {
        particlesRef.current = particlesRef.current
          .map(p => ({
            ...p,
            x: p.x + p.vx * 0.016,
            y: p.y + p.vy * 0.016,
            vy: p.vy + 100 * 0.016,
            life: p.life - 0.016,
          }))
          .filter(p => p.life > 0);
        render();
        if (particlesRef.current.length > 0) {
          requestAnimationFrame(renderFinal);
        }
      };
      render();
      requestAnimationFrame(renderFinal);
    }
  }, [phase, render]);

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          <div className="text-6xl mb-4 animate-pulse">🌑</div>
          <h1 className="text-4xl font-black text-white mb-2">מבוך החושך</h1>
          <p className="text-slate-300 text-lg mb-2">גרסת פרו</p>
          <p className="text-slate-400 mb-8">
            מיכל צריכה למצוא את דרכה דרך מבוכים חשוכים<br />
            עם לפיד קטן, אויבים, ופאוור-אפים!
          </p>

          <div className="bg-slate-800/50 rounded-2xl p-5 mb-8 text-right space-y-3 border border-slate-600/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔦</span>
              <span className="text-slate-300">תאורה דינמית - רק מה שקרוב אליך נראה</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐱</span>
              <span className="text-slate-300">אויבים מסתובבים במבוך - תימנע מהם!</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <span className="text-slate-300">פאוור-אפים: מגן, טורבו, זמן, מימום</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗺️</span>
              <span className="text-slate-300">מבוך נוצר מחדש בכל משחק!</span>
            </div>
          </div>

          <button
            onClick={() => setPhase('levelSelect')}
            className="bg-purple-600 hover:bg-purple-500 text-white font-black text-2xl px-10 py-4 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            🏃 בואו נתחיל!
          </button>

          {highScore > 0 && (
            <p className="text-slate-400 mt-4 text-sm">
              שיא: <span className="font-black text-purple-300">{highScore}</span>
            </p>
          )}

          <Link
            href="/"
            className="inline-block mt-6 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← חזרה לתפריט
          </Link>
        </div>
      </div>
    );
  }

  // ─── LEVEL SELECT ──────────────────────────────────────────────────────────

  if (phase === 'levelSelect') {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center p-6">
        <div className="max-w-md w-full">
          <h2 className="text-3xl font-black text-white mb-6 text-center">בחר שלב</h2>

          <div className="space-y-3">
            {LEVELS.map((level, idx) => {
              const isUnlocked = idx === 0 || progress[LEVELS[idx - 1].id]?.stars > 0;
              const levelProgress = progress[level.id];

              return (
                <button
                  key={level.id}
                  onClick={() => isUnlocked && startGame(idx)}
                  disabled={!isUnlocked}
                  className={`w-full p-4 rounded-2xl border text-right transition-all ${
                    isUnlocked
                      ? 'bg-slate-800/60 border-purple-500/30 hover:bg-slate-700/60 hover:border-purple-400/50 active:scale-[0.98]'
                      : 'bg-slate-900/40 border-slate-700/20 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold text-lg">
                        {isUnlocked ? `${idx + 1}. ${level.name}` : `🔒 ${level.name}`}
                      </span>
                      <p className="text-slate-400 text-sm mt-1">
                        {level.rows}x{level.cols} | ⏱️ {level.timeLimit}s | 👾 {level.enemyCount}
                      </p>
                    </div>
                    {levelProgress && (
                      <div className="text-right">
                        <div className="text-yellow-400 text-lg">
                          {'⭐'.repeat(levelProgress.stars)}{'☆'.repeat(3 - levelProgress.stars)}
                        </div>
                        <span className="text-slate-500 text-xs">{levelProgress.bestTime}s</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPhase('intro')}
            className="mt-6 w-full text-center text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← חזרה
          </button>
        </div>
      </div>
    );
  }

  // ─── WON ───────────────────────────────────────────────────────────────────

  if (phase === 'won') {
    const level = LEVELS[currentLevel];
    const timeUsed = level.timeLimit - Math.max(0, timeLeft);
    const collected = collectiblesRef.current.filter(c => c.collected).length;
    const totalCollectibles = collectiblesRef.current.length;
    const levelProg = progress[level.id];
    const stars = levelProg?.stars || 1;

    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-green-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          <div className="text-6xl mb-4">🎉🛡️</div>
          <h2 className="text-3xl font-black text-green-400 mb-2">הגעת למקלט!</h2>
          <p className="text-slate-300 mb-6">מיכל בטוחה!</p>

          <div className="text-4xl mb-4">
            {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-5 mb-6 space-y-3 border border-green-500/20">
            <div className="flex justify-between text-lg">
              <span className="text-slate-400">ניקוד</span>
              <span className="text-white font-black">{score}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-slate-400">זמן</span>
              <span className="text-green-400 font-black">{timeUsed}s</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-slate-400">נאספו</span>
              <span className="text-yellow-400 font-black">{collected}/{totalCollectibles}</span>
            </div>
          </div>

          <div className="flex gap-3">
            {currentLevel < LEVELS.length - 1 && (
              <button
                onClick={() => startGame(currentLevel + 1)}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black text-lg px-6 py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                ▶ שלב הבא
              </button>
            )}
            <button
              onClick={() => startGame(currentLevel)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg px-6 py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              🔄 שוב
            </button>
          </div>
          <button
            onClick={() => setPhase('levelSelect')}
            className="mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← בחירת שלב
          </button>

          {/* Keep canvas for final particles */}
          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={minimapRef} className="hidden" />
        </div>
      </div>
    );
  }

  // ─── LOST ──────────────────────────────────────────────────────────────────

  if (phase === 'lost') {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-red-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          <div className="text-6xl mb-4">⏰💀</div>
          <h2 className="text-3xl font-black text-red-400 mb-2">נגמר הזמן!</h2>
          <p className="text-slate-300 mb-6">מיכל לא הספיקה למקלט...</p>

          <div className="flex gap-3">
            <button
              onClick={() => startGame(currentLevel)}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black text-lg px-6 py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              🔄 נסה שוב
            </button>
            <button
              onClick={() => setPhase('levelSelect')}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg px-6 py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              ← שלבים
            </button>
          </div>

          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={minimapRef} className="hidden" />
        </div>
      </div>
    );
  }

  // ─── PLAYING ───────────────────────────────────────────────────────────────

  const level = LEVELS[currentLevel];
  const timerColor = timeLeft <= 10 ? 'text-red-400' : timeLeft <= 20 ? 'text-yellow-300' : 'text-white';
  const timerPercent = Math.max(0, (timeLeft / level.timeLimit) * 100);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 flex flex-col items-center select-none">
      {/* HUD */}
      <div className="w-full bg-slate-900/90 backdrop-blur-sm px-4 py-2 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <span className={`font-black text-xl ${timerColor}`}>⏱️ {timeLeft}</span>
          <span className="text-white font-bold">💰 {score}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">{level.name}</span>
          {shieldActive && <span className="text-blue-400 animate-pulse">🛡️</span>}
          {speedBoost && <span className="text-yellow-400 animate-pulse">⚡</span>}
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full bg-slate-900/60 px-4 py-1">
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${timerPercent}%`,
              backgroundColor: timerPercent > 60 ? '#22c55e' : timerPercent > 30 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white/90 text-slate-800 font-bold text-sm px-4 py-2 rounded-2xl shadow-lg z-50 whitespace-nowrap">
          {message}
        </div>
      )}

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-center relative w-full">
        {/* Minimap */}
        <div className="absolute top-2 left-2 z-30 border border-slate-600/50 rounded-lg overflow-hidden shadow-lg">
          <canvas ref={minimapRef} />
        </div>

        {/* Canvas */}
        <div
          className="relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          <canvas
            ref={canvasRef}
            className="rounded-xl border-2 border-slate-700/50 shadow-2xl"
          />
        </div>

        {/* D-Pad for mobile */}
        <div dir="ltr" className="mt-4 grid grid-cols-3 gap-1 w-40 h-40 md:hidden">
          <div />
          <button
            className="bg-slate-800/80 rounded-xl text-2xl active:bg-slate-600 flex items-center justify-center border border-slate-600/30"
            onPointerDown={() => dpadDown('ArrowUp')}
            onPointerUp={() => dpadUp('ArrowUp')}
            onPointerLeave={() => dpadUp('ArrowUp')}
          >
            ↑
          </button>
          <div />
          <button
            className="bg-slate-800/80 rounded-xl text-2xl active:bg-slate-600 flex items-center justify-center border border-slate-600/30"
            onPointerDown={() => dpadDown('ArrowLeft')}
            onPointerUp={() => dpadUp('ArrowLeft')}
            onPointerLeave={() => dpadUp('ArrowLeft')}
          >
            ←
          </button>
          <div className="bg-slate-800/40 rounded-xl flex items-center justify-center text-slate-600">
            ●
          </div>
          <button
            className="bg-slate-800/80 rounded-xl text-2xl active:bg-slate-600 flex items-center justify-center border border-slate-600/30"
            onPointerDown={() => dpadDown('ArrowRight')}
            onPointerUp={() => dpadUp('ArrowRight')}
            onPointerLeave={() => dpadUp('ArrowRight')}
          >
            →
          </button>
          <div />
          <button
            className="bg-slate-800/80 rounded-xl text-2xl active:bg-slate-600 flex items-center justify-center border border-slate-600/30"
            onPointerDown={() => dpadDown('ArrowDown')}
            onPointerUp={() => dpadUp('ArrowDown')}
            onPointerLeave={() => dpadUp('ArrowDown')}
          >
            ↓
          </button>
          <div />
        </div>
      </div>
    </div>
  );
}
