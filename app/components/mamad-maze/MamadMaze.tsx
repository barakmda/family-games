'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────
type Phase = 'intro' | 'characterSelect' | 'story' | 'playing' | 'won' | 'lost' | 'levelSelect';
type CellValue = 0 | 1 | 2 | 3 | 4 | 5; // wall, floor, start, end, locked-door, key-door-opened

interface Collectible {
  row: number;
  col: number;
  type: 'phone' | 'toilet_paper' | 'key';
  collected: boolean;
}

interface LevelDef {
  id: number;
  name: string;
  story: string;
  maze: number[][];
  time: number;
  collectibles: Collectible[];
  decos: Record<string, string>;
  lockedDoors: { row: number; col: number }[];
}

interface Character {
  id: string;
  name: string;
  emoji: string;
  title: string;
  description: string;
  color: string;        // tailwind border/bg accent
  fogBonus: number;      // extra fog radius
  timeBonus: number;     // extra seconds at start
  phoneBonusSec: number; // seconds from phone (default 5)
  collectBonus: boolean; // double collectible score bonus
  revealItems: boolean;  // show collectibles through fog
}

interface RandomEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  duration: number; // seconds the effect lasts (0 = instant)
}

// ── Characters ────────────────────────────────────────────────────────────────

const CHARACTERS: Character[] = [
  {
    id: 'michal', name: 'מיכל', emoji: '👧', title: 'המקורית',
    description: 'מכירה כל פינה בדירה. אין בונוסים, אין חסרונות.',
    color: 'pink', fogBonus: 0, timeBonus: 0, phoneBonusSec: 5,
    collectBonus: false, revealItems: false,
  },
  {
    id: 'oriana', name: 'אוריאנה', emoji: '👩', title: 'העיניים החדות',
    description: 'רואה רחוק יותר בערפל. רדיוס ראייה +2.',
    color: 'purple', fogBonus: 2, timeBonus: 0, phoneBonusSec: 5,
    collectBonus: false, revealItems: false,
  },
  {
    id: 'chaim', name: 'חיים', emoji: '👦', title: 'הספרינטר',
    description: 'תמיד מוכן לרוץ. מתחיל עם +10 שניות בונוס.',
    color: 'blue', fogBonus: 0, timeBonus: 10, phoneBonusSec: 5,
    collectBonus: false, revealItems: false,
  },
  {
    id: 'barak', name: 'ברק', emoji: '🧑', title: 'המהנדס',
    description: 'יודע לתקן הכל. טלפונים נותנים +8 שניות במקום +5.',
    color: 'cyan', fogBonus: 0, timeBonus: 0, phoneBonusSec: 8,
    collectBonus: false, revealItems: false,
  },
  {
    id: 'inbar', name: 'ענבר', emoji: '👩‍🦰', title: 'האספנית',
    description: 'אוספת הכל. פריטים שווים כפול לניקוד.',
    color: 'amber', fogBonus: 0, timeBonus: 0, phoneBonusSec: 5,
    collectBonus: true, revealItems: false,
  },
  {
    id: 'zoe', name: 'זואי', emoji: '🐕', title: 'האף הטוב',
    description: 'מרחרחת פריטים. רואה אספנים גם דרך הערפל.',
    color: 'green', fogBonus: 0, timeBonus: 0, phoneBonusSec: 5,
    collectBonus: false, revealItems: true,
  },
];

// ── Random Events ─────────────────────────────────────────────────────────────

const RANDOM_EVENTS: RandomEvent[] = [
  { id: 'neighbor_door', name: 'השכן פתח דלת!', emoji: '🚪', description: 'קיר נעלם לכמה שניות...', duration: 8 },
  { id: 'cat_block', name: 'החתול נכנס!', emoji: '🐈', description: 'החתול חוסם את המעבר!', duration: 7 },
  { id: 'power_outage', name: 'הפסקת חשמל!', emoji: '💡', description: 'חושך! רואים פחות!', duration: 6 },
  { id: 'bisli', name: 'מצאת ביסלי!', emoji: '🍿', description: '+7 שניות בונוס!', duration: 0 },
  { id: 'earthquake', name: 'רעידת אדמה!', emoji: '🌍', description: 'הכל רועד!', duration: 3 },
  { id: 'wind', name: 'רוח חזקה!', emoji: '💨', description: 'קירות זזים!', duration: 6 },
];

// ── Level Definitions ──────────────────────────────────────────────────────────

const LEVELS: LevelDef[] = [
  // Level 1 — הדירה (Original maze, easy)
  {
    id: 1,
    name: 'הדירה',
    story: 'אזעקה! מיכל על האסלה כרגיל. צריך להגיע מהשירותים לממ"ד. הדירה קטנה, לא צריך להתבלבל... נכון?',
    time: 90,
    maze: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 3, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0],
      [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0],
      [0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0],
      [0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0],
      [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    collectibles: [
      { row: 2, col: 5, type: 'toilet_paper', collected: false },
      { row: 6, col: 9, type: 'phone', collected: false },
    ],
    decos: {
      '2,3': '🛋️', '4,1': '📺', '5,9': '🐕', '7,1': '🛏️',
      '8,5': '🍳', '3,8': '🪑', '1,9': '🪴',
    },
    lockedDoors: [],
  },
  // Level 2 — הבניין (Medium)
  {
    id: 2,
    name: 'הבניין',
    story: 'מיכל ברחה מהשירותים אבל היא בקומה הלא נכונה! צריך לרדת דרך חדר המדרגות. הממ"ד בקומת הקרקע.',
    time: 75,
    maze: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 3, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
      [0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0],
      [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 2, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    collectibles: [
      { row: 1, col: 10, type: 'phone', collected: false },
      { row: 6, col: 3, type: 'toilet_paper', collected: false },
      { row: 8, col: 1, type: 'toilet_paper', collected: false },
    ],
    decos: {
      '1,6': '🪜', '3,9': '🧹', '5,7': '📦', '7,9': '🚲',
      '10,5': '🧸', '9,3': '🗑️',
    },
    lockedDoors: [],
  },
  // Level 3 — עם מפתח (Medium-Hard, has locked door)
  {
    id: 3,
    name: 'הדלת הנעולה',
    story: 'מישהו נעל את דלת הממ"ד! צריך למצוא את המפתח בדירה לפני שמגיעים. הזמן אוזל.',
    time: 70,
    maze: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 3, 4, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0],
      [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0],
      [0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
      [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0],
      [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 2, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    collectibles: [
      { row: 6, col: 11, type: 'key', collected: false },
      { row: 3, col: 1, type: 'phone', collected: false },
      { row: 8, col: 7, type: 'toilet_paper', collected: false },
    ],
    decos: {
      '1,7': '🛋️', '3,3': '📺', '5,1': '🐕', '7,1': '🛏️',
      '10,7': '🍳', '4,10': '🪑',
    },
    lockedDoors: [{ row: 1, col: 2 }],
  },
  // Level 4 — השכנים (Hard)
  {
    id: 4,
    name: 'השכנים',
    story: 'הממ"ד של הדירה תפוס! צריך לרוץ לממ"ד של השכנים בצד השני של הקומה. המסדרון ארוך ומפותל.',
    time: 60,
    maze: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 3, 0],
      [0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0],
      [0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0],
      [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0],
      [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    collectibles: [
      { row: 1, col: 1, type: 'phone', collected: false },
      { row: 5, col: 13, type: 'toilet_paper', collected: false },
      { row: 7, col: 7, type: 'phone', collected: false },
      { row: 9, col: 5, type: 'toilet_paper', collected: false },
    ],
    decos: {
      '1,6': '🚪', '3,10': '🧹', '5,9': '📦', '7,5': '🪴',
      '9,12': '🧸',
    },
    lockedDoors: [],
  },
  // Level 5 — הבוס (Very Hard, locked door + tight time)
  {
    id: 5,
    name: 'המרחק הגדול',
    story: 'השלב האחרון. מיכל בקומה 4, הממ"ד בקומה -1. הדרך ארוכה, הזמן קצר, ויש דלת נעולה. בהצלחה.',
    time: 50,
    maze: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 2, 0],
      [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0],
      [0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0],
      [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
      [0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0],
      [0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
      [0, 3, 4, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    collectibles: [
      { row: 5, col: 13, type: 'key', collected: false },
      { row: 1, col: 1, type: 'phone', collected: false },
      { row: 9, col: 1, type: 'phone', collected: false },
      { row: 7, col: 3, type: 'toilet_paper', collected: false },
      { row: 12, col: 7, type: 'toilet_paper', collected: false },
    ],
    decos: {
      '1,5': '🪜', '3,8': '📦', '6,4': '🧹', '10,7': '🚲',
    },
    lockedDoors: [{ row: 12, col: 2 }],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function findCell(maze: number[][], val: number) {
  for (let r = 0; r < maze.length; r++)
    for (let c = 0; c < maze[0].length; c++)
      if (maze[r][c] === val) return { row: r, col: c };
  return { row: 0, col: 0 };
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const COLLECTIBLE_EMOJI: Record<string, string> = {
  phone: '📱',
  toilet_paper: '🧻',
  key: '🔑',
};

const WIN_MSGS = [
  'הגעת! הממ"ד מאושר. ועכשיו, כל אחד לאסלה שלו.',
  'מיכל בטוחה! (ובלי נייר, נס של ממש)',
  'שיא! מיכל הגיעה בזמן. ממש גיבורת.',
  'מהירה כמו טיל. הבית בטוח.',
  'ניצחת! סבתא גאה.',
];

const LOSE_MSGS = [
  'נשארת בשירותים... הקציצות ימתינו.',
  'הסירנה נגמרה. את הבאת פפיר.',
  'ממ"ד? פעם הבאה. השירותים יותר בטוחים בינתיים.',
  'הזמן נגמר. מיכל עדיין בדרך.',
  'כמעט! אבל כמעט זה לא מספיק.',
];

function getStars(timeLeft: number, totalTime: number, moves: number, totalCollectibles: number, collectedCount: number): number {
  const timeRatio = timeLeft / totalTime;
  const collectRatio = totalCollectibles > 0 ? collectedCount / totalCollectibles : 1;
  const score = timeRatio * 0.5 + collectRatio * 0.5;
  if (score >= 0.7) return 3;
  if (score >= 0.4) return 2;
  return 1;
}

function loadProgress(): Record<number, { stars: number; bestTime: number; bestMoves: number }> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('mamad-maze-progress') || '{}');
  } catch { return {}; }
}

function saveProgress(levelId: number, stars: number, time: number, moves: number) {
  const progress = loadProgress();
  const existing = progress[levelId];
  if (!existing || stars > existing.stars || (stars === existing.stars && time < existing.bestTime)) {
    progress[levelId] = { stars, bestTime: time, bestMoves: moves };
    localStorage.setItem('mamad-maze-progress', JSON.stringify(progress));
  }
}

// ── Fog of War Utility ─────────────────────────────────────────────────────────
function getVisibleCells(row: number, col: number, maze: number[][], radius: number): Set<string> {
  const visible = new Set<string>();
  // BFS with limited range, blocked by walls
  const queue: [number, number, number][] = [[row, col, 0]];
  const visited = new Set<string>();
  visited.add(`${row},${col}`);
  visible.add(`${row},${col}`);

  while (queue.length > 0) {
    const [r, c, dist] = queue.shift()!;
    if (dist >= radius) continue;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr < 0 || nr >= maze.length || nc < 0 || nc >= maze[0].length) continue;
      if (visited.has(key)) continue;
      visited.add(key);
      visible.add(key);
      if (maze[nr][nc] !== 0) {
        queue.push([nr, nc, dist + 1]);
      }
    }
  }
  return visible;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function MamadMaze() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 });
  const [timeLeft, setTimeLeft] = useState(90);
  const [moves, setMoves] = useState(0);
  const [cellSize, setCellSize] = useState(32);
  const [endMsg, setEndMsg] = useState('');
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [hasKey, setHasKey] = useState(false);
  const [maze, setMaze] = useState<number[][]>([]);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [stars, setStars] = useState(0);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [fogEnabled, setFogEnabled] = useState(false);
  const [selectedChar, setSelectedChar] = useState<Character>(CHARACTERS[0]);
  const [activeEvent, setActiveEvent] = useState<RandomEvent | null>(null);
  const [eventBanner, setEventBanner] = useState<{ emoji: string; name: string; description: string } | null>(null);
  const [tempWallChanges, setTempWallChanges] = useState<{ row: number; col: number; wasWall: boolean }[]>([]);
  const [fogOverride, setFogOverride] = useState(false); // temporary fog from power outage

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const playerPosRef = useRef({ row: 0, col: 0 });
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const mazeRef = useRef<number[][]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const hasKeyRef = useRef(false);
  const selectedCharRef = useRef<Character>(CHARACTERS[0]);
  selectedCharRef.current = selectedChar;

  const level = LEVELS[currentLevel];

  // Responsive cell size
  useEffect(() => {
    const update = () => {
      if (!maze.length) return;
      const cols = maze[0]?.length || 12;
      const rows = maze.length;
      const availW = Math.min(window.innerWidth - 24, 500);
      const availH = window.innerHeight - 200;
      const byWidth = Math.floor(availW / cols);
      const byHeight = Math.floor(availH / rows);
      setCellSize(Math.max(22, Math.min(byWidth, byHeight, 44)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [maze]);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      setPhase('lost');
      setEndMsg(LOSE_MSGS[Math.floor(Math.random() * LOSE_MSGS.length)]);
      return;
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft]);

  // Periodic screen shake for urgency
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 15 && timeLeft > 0 && timeLeft % 5 === 0) {
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 400);
    }
  }, [phase, timeLeft]);

  // ── Random Events System ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    // First event after 10-15 seconds, then every 12-20 seconds
    const delay = 10000 + Math.random() * 5000;
    const timer = setTimeout(() => {
      if (phaseRef.current !== 'playing') return;
      triggerRandomEvent();
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, activeEvent]); // re-schedule after each event ends

  function triggerRandomEvent() {
    const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    setActiveEvent(event);
    setEventBanner({ emoji: event.emoji, name: event.name, description: event.description });

    // Hide banner after 2.5 seconds
    setTimeout(() => setEventBanner(null), 2500);

    const currentMaze = mazeRef.current;

    switch (event.id) {
      case 'neighbor_door': {
        // Find a random wall adjacent to a floor cell and open it
        const candidates: { row: number; col: number }[] = [];
        for (let r = 1; r < currentMaze.length - 1; r++) {
          for (let c = 1; c < currentMaze[0].length - 1; c++) {
            if (currentMaze[r][c] !== 0) continue;
            // Check if adjacent to a floor
            const hasFloor = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(
              ([dr, dc]) => currentMaze[r + dr]?.[c + dc] === 1
            );
            // Check if opening this wall connects two areas (has floor on at least 2 sides)
            const floorCount = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(
              ([dr, dc]) => {
                const v = currentMaze[r + dr]?.[c + dc];
                return v === 1 || v === 2 || v === 3;
              }
            ).length;
            if (hasFloor && floorCount >= 2) candidates.push({ row: r, col: c });
          }
        }
        if (candidates.length > 0) {
          const spot = candidates[Math.floor(Math.random() * candidates.length)];
          const newMaze = currentMaze.map(r => [...r]);
          newMaze[spot.row][spot.col] = 1;
          mazeRef.current = newMaze;
          setMaze(newMaze);
          setTempWallChanges([{ row: spot.row, col: spot.col, wasWall: true }]);
          setTimeout(() => {
            if (phaseRef.current !== 'playing') return;
            const revert = mazeRef.current.map(r => [...r]);
            revert[spot.row][spot.col] = 0;
            mazeRef.current = revert;
            setMaze(revert);
            setTempWallChanges([]);
            setActiveEvent(null);
          }, event.duration * 1000);
        } else {
          setActiveEvent(null);
        }
        break;
      }
      case 'cat_block': {
        // Place a temporary wall (cat) on a random floor cell near the player
        const pPos = playerPosRef.current;
        const candidates: { row: number; col: number }[] = [];
        for (let r = Math.max(1, pPos.row - 4); r < Math.min(currentMaze.length - 1, pPos.row + 5); r++) {
          for (let c = Math.max(1, pPos.col - 4); c < Math.min(currentMaze[0].length - 1, pPos.col + 5); c++) {
            if (currentMaze[r][c] === 1 && !(r === pPos.row && c === pPos.col)) {
              candidates.push({ row: r, col: c });
            }
          }
        }
        if (candidates.length > 0) {
          const spot = candidates[Math.floor(Math.random() * candidates.length)];
          const newMaze = currentMaze.map(r => [...r]);
          newMaze[spot.row][spot.col] = 0;
          mazeRef.current = newMaze;
          setMaze(newMaze);
          setTempWallChanges([{ row: spot.row, col: spot.col, wasWall: false }]);
          setTimeout(() => {
            if (phaseRef.current !== 'playing') return;
            const revert = mazeRef.current.map(r => [...r]);
            revert[spot.row][spot.col] = 1;
            mazeRef.current = revert;
            setMaze(revert);
            setTempWallChanges([]);
            setActiveEvent(null);
          }, event.duration * 1000);
        } else {
          setActiveEvent(null);
        }
        break;
      }
      case 'power_outage': {
        setFogOverride(true);
        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 400);
        setTimeout(() => {
          setFogOverride(false);
          setActiveEvent(null);
        }, event.duration * 1000);
        break;
      }
      case 'bisli': {
        setTimeLeft(t => t + 7);
        setActiveEvent(null);
        break;
      }
      case 'earthquake': {
        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 600);
        // Open a random wall and close another
        const wallCandidates: { row: number; col: number }[] = [];
        const floorCandidates: { row: number; col: number }[] = [];
        const pPos = playerPosRef.current;
        for (let r = 1; r < currentMaze.length - 1; r++) {
          for (let c = 1; c < currentMaze[0].length - 1; c++) {
            if (currentMaze[r][c] === 0) {
              const floorCount = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(
                ([dr, dc]) => currentMaze[r + dr]?.[c + dc] === 1
              ).length;
              if (floorCount >= 2) wallCandidates.push({ row: r, col: c });
            } else if (currentMaze[r][c] === 1 && !(r === pPos.row && c === pPos.col)) {
              floorCandidates.push({ row: r, col: c });
            }
          }
        }
        const changes: { row: number; col: number; wasWall: boolean }[] = [];
        const newMaze = currentMaze.map(r => [...r]);
        if (wallCandidates.length > 0) {
          const w = wallCandidates[Math.floor(Math.random() * wallCandidates.length)];
          newMaze[w.row][w.col] = 1;
          changes.push({ row: w.row, col: w.col, wasWall: true });
        }
        if (floorCandidates.length > 0) {
          const f = floorCandidates[Math.floor(Math.random() * floorCandidates.length)];
          newMaze[f.row][f.col] = 0;
          changes.push({ row: f.row, col: f.col, wasWall: false });
        }
        mazeRef.current = newMaze;
        setMaze(newMaze);
        setTempWallChanges(changes);
        setTimeout(() => {
          if (phaseRef.current !== 'playing') return;
          const revert = mazeRef.current.map(r => [...r]);
          changes.forEach(ch => {
            revert[ch.row][ch.col] = ch.wasWall ? 0 : 1;
          });
          mazeRef.current = revert;
          setMaze(revert);
          setTempWallChanges([]);
          setActiveEvent(null);
        }, event.duration * 1000);
        break;
      }
      case 'wind': {
        // Similar to earthquake but opens 2 walls
        const candidates: { row: number; col: number }[] = [];
        for (let r = 1; r < currentMaze.length - 1; r++) {
          for (let c = 1; c < currentMaze[0].length - 1; c++) {
            if (currentMaze[r][c] === 0) {
              const floorCount = [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(
                ([dr, dc]) => currentMaze[r + dr]?.[c + dc] === 1
              ).length;
              if (floorCount >= 2) candidates.push({ row: r, col: c });
            }
          }
        }
        const newMaze = currentMaze.map(r => [...r]);
        const changes: { row: number; col: number; wasWall: boolean }[] = [];
        for (let i = 0; i < Math.min(2, candidates.length); i++) {
          const idx = Math.floor(Math.random() * candidates.length);
          const w = candidates.splice(idx, 1)[0];
          newMaze[w.row][w.col] = 1;
          changes.push({ row: w.row, col: w.col, wasWall: true });
        }
        mazeRef.current = newMaze;
        setMaze(newMaze);
        setTempWallChanges(changes);
        setTimeout(() => {
          if (phaseRef.current !== 'playing') return;
          const revert = mazeRef.current.map(r => [...r]);
          changes.forEach(ch => { revert[ch.row][ch.col] = 0; });
          mazeRef.current = revert;
          setMaze(revert);
          setTempWallChanges([]);
          setActiveEvent(null);
        }, event.duration * 1000);
        break;
      }
      default:
        setActiveEvent(null);
    }
  }

  // Update fog when player moves
  useEffect(() => {
    if (phase !== 'playing' || !maze.length) return;
    const baseRadius = currentLevel < 2 ? 4 : 3;
    const fogRadius = fogOverride ? Math.max(2, baseRadius - 1) : baseRadius + selectedChar.fogBonus;
    const newVisible = getVisibleCells(playerPos.row, playerPos.col, maze, fogRadius);
    setRevealedCells(prev => {
      const merged = new Set(prev);
      newVisible.forEach(c => merged.add(c));
      return merged;
    });
  }, [playerPos, phase, maze, currentLevel, selectedChar.fogBonus, fogOverride]);

  const move = useCallback((dr: number, dc: number) => {
    if (phaseRef.current !== 'playing') return;
    const { row, col } = playerPosRef.current;
    const nr = row + dr;
    const nc = col + dc;
    const currentMaze = mazeRef.current;
    if (nr < 0 || nr >= currentMaze.length || nc < 0 || nc >= currentMaze[0].length) return;
    const cellVal = currentMaze[nr][nc];
    if (cellVal === 0) return;

    // Locked door check
    if (cellVal === 4) {
      if (!hasKeyRef.current) {
        // Shake to indicate locked
        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 300);
        return;
      }
      // Unlock door
      const newMaze = currentMaze.map(r => [...r]);
      newMaze[nr][nc] = 1;
      mazeRef.current = newMaze;
      setMaze(newMaze);
    }

    playerPosRef.current = { row: nr, col: nc };
    setPlayerPos({ row: nr, col: nc });
    setMoves(m => m + 1);

    // Check collectibles
    const colls = collectiblesRef.current;
    const collIdx = colls.findIndex(c => c.row === nr && c.col === nc && !c.collected);
    if (collIdx >= 0) {
      const updated = colls.map((c, i) => i === collIdx ? { ...c, collected: true } : c);
      collectiblesRef.current = updated;
      setCollectibles(updated);
      const collType = colls[collIdx].type;
      if (collType === 'key') {
        hasKeyRef.current = true;
        setHasKey(true);
      }
      if (collType === 'phone') {
        setTimeLeft(t => t + selectedCharRef.current.phoneBonusSec);
      }
    }

    // Win check
    if (currentMaze[nr][nc] === 3) {
      setPhase('won');
      setEndMsg(WIN_MSGS[Math.floor(Math.random() * WIN_MSGS.length)]);
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 2000);
    }
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0],
        ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
        ArrowLeft: [0, -1], a: [0, -1], A: [0, -1],
        ArrowRight: [0, 1], d: [0, 1], D: [0, 1],
      };
      if (map[e.key]) { e.preventDefault(); move(...map[e.key]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [move]);

  function initLevel(levelIdx: number) {
    const lvl = LEVELS[levelIdx];
    const startPos = findCell(lvl.maze, 2);
    const mazeCopy = lvl.maze.map(r => [...r]);
    const collsCopy = lvl.collectibles.map(c => ({ ...c, collected: false }));

    setCurrentLevel(levelIdx);
    mazeRef.current = mazeCopy;
    setMaze(mazeCopy);
    playerPosRef.current = startPos;
    setPlayerPos(startPos);
    setTimeLeft(lvl.time + selectedChar.timeBonus);
    setMoves(0);
    collectiblesRef.current = collsCopy;
    setCollectibles(collsCopy);
    hasKeyRef.current = false;
    setHasKey(false);
    setRevealedCells(new Set());
    setStars(0);
    setEndMsg('');
    setActiveEvent(null);
    setEventBanner(null);
    setTempWallChanges([]);
    setFogOverride(false);
  }

  function startLevel(levelIdx: number) {
    initLevel(levelIdx);
    setPhase('story');
  }

  function beginPlaying() {
    setPhase('playing');
  }

  function goToLevelSelect() {
    setPhase('levelSelect');
  }

  function nextLevel() {
    if (currentLevel < LEVELS.length - 1) {
      startLevel(currentLevel + 1);
    } else {
      setPhase('intro');
    }
  }

  // Calculate stars on win
  useEffect(() => {
    if (phase === 'won') {
      const collectedCount = collectibles.filter(c => c.collected).length;
      const effectiveCollected = selectedChar.collectBonus ? Math.min(collectedCount * 2, collectibles.length) : collectedCount;
      const s = getStars(timeLeft, level.time + selectedChar.timeBonus, moves, collectibles.length, effectiveCollected);
      setStars(s);
      const timeTaken = (level.time + selectedChar.timeBonus) - timeLeft;
      saveProgress(level.id, s, timeTaken, moves);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function getCellBg(cell: number) {
    if (cell === 0) return 'bg-stone-800 border border-stone-900';
    if (cell === 3) return 'bg-green-600';
    if (cell === 2) return 'bg-blue-900';
    if (cell === 4) return 'bg-amber-800';
    return 'bg-stone-600';
  }

  const urgent = timeLeft <= 10 && phase === 'playing';
  const timerColor = timeLeft > 30 ? 'text-green-400' : timeLeft > 10 ? 'text-yellow-300 animate-pulse' : 'text-red-400 animate-pulse';
  const progress = typeof window !== 'undefined' ? loadProgress() : {};

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div dir="rtl" className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-stone-800 rounded-2xl p-7 text-center border border-stone-600 shadow-2xl">
          <div className="text-7xl mb-3 animate-bounce">🚨</div>
          <h1 className="text-3xl font-black text-white mb-1">המבוך לממ&quot;ד</h1>
          <p className="text-stone-300 text-sm mb-5 leading-relaxed">
            יש אזעקה. מיכל — כרגיל — על האסלה.
            חלצו אותה דרך <span className="text-yellow-300 font-black">5 שלבים</span> מאתגרים.
          </p>
          <div className="bg-stone-700/60 rounded-xl p-4 mb-5 text-sm text-stone-300 text-right space-y-2 border border-stone-600">
            <div className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <span>מובייל: החלק / כפתורי חצים</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⌨️</span>
              <span>מחשב: חצים / WASD</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-stone-600">
              <span className="text-lg">🛡️</span>
              <span><span className="text-green-400 font-bold">ירוק</span> = ממ&quot;ד (יעד)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🚽</span>
              <span><span className="text-blue-400 font-bold">כחול</span> = שירותים (התחלה)</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-stone-600">
              <span className="text-lg">📱</span>
              <span>טלפון = +5 שניות</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🧻</span>
              <span>נייר = ניקוד בונוס</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔑</span>
              <span>מפתח = פותח דלתות נעולות</span>
            </div>
          </div>
          <button
            onClick={() => setPhase('characterSelect')}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xl py-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-900"
          >
            🚨 בחר דמות!
          </button>
          <Link href="/" className="block text-center mt-3 text-stone-500 hover:text-stone-300 text-sm transition-colors">
            ← חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  // ── CHARACTER SELECT ──────────────────────────────────────────────────────────
  if (phase === 'characterSelect') {
    return (
      <div dir="rtl" className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-800 rounded-2xl p-6 border border-stone-600 shadow-2xl">
          <h2 className="text-2xl font-black text-white text-center mb-2">בחרו דמות</h2>
          <p className="text-stone-400 text-center text-sm mb-5">לכל דמות כוח מיוחד!</p>
          <div className="grid grid-cols-2 gap-3">
            {CHARACTERS.map(char => {
              const isSelected = selectedChar.id === char.id;
              return (
                <button
                  key={char.id}
                  onClick={() => setSelectedChar(char)}
                  className={`p-3 rounded-xl border-2 transition-all text-right cursor-pointer active:scale-[0.97] ${
                    isSelected
                      ? 'bg-stone-600 border-yellow-400 shadow-lg shadow-yellow-400/20'
                      : 'bg-stone-700 border-stone-600 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl">{char.emoji}</span>
                    <div>
                      <div className="text-white font-black text-sm">{char.name}</div>
                      <div className="text-yellow-400 text-xs font-bold">{char.title}</div>
                    </div>
                  </div>
                  <p className="text-stone-400 text-xs leading-snug">{char.description}</p>
                </button>
              );
            })}
          </div>
          <button
            onClick={goToLevelSelect}
            className="w-full mt-5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xl py-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-900"
          >
            {selectedChar.emoji} יאללה עם {selectedChar.name}!
          </button>
          <button
            onClick={() => setPhase('intro')}
            className="w-full mt-2 bg-stone-700 hover:bg-stone-600 text-stone-400 font-bold py-3 rounded-xl transition-all cursor-pointer"
          >
            ← חזרה
          </button>
        </div>
      </div>
    );
  }

  // ── LEVEL SELECT ─────────────────────────────────────────────────────────────
  if (phase === 'levelSelect') {
    return (
      <div dir="rtl" className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-800 rounded-2xl p-6 border border-stone-600 shadow-2xl">
          <h2 className="text-2xl font-black text-white text-center mb-5">בחרו שלב</h2>
          <div className="space-y-3">
            {LEVELS.map((lvl, idx) => {
              const prog = progress[lvl.id];
              const unlocked = idx === 0 || progress[LEVELS[idx - 1].id];
              return (
                <button
                  key={lvl.id}
                  onClick={() => unlocked && startLevel(idx)}
                  disabled={!unlocked}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-right cursor-pointer ${
                    unlocked
                      ? 'bg-stone-700 border-stone-500 hover:bg-stone-600 active:scale-[0.98]'
                      : 'bg-stone-800 border-stone-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black ${
                    prog ? 'bg-green-700 text-green-200' : unlocked ? 'bg-red-700 text-red-200' : 'bg-stone-700 text-stone-500'
                  }`}>
                    {unlocked ? lvl.id : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold">{lvl.name}</div>
                    <div className="text-stone-400 text-xs">{lvl.time} שניות</div>
                  </div>
                  <div className="text-xl">
                    {prog ? '⭐'.repeat(prog.stars) + '☆'.repeat(3 - prog.stars) : unlocked ? '☆☆☆' : ''}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setPhase('intro')}
              className="flex-1 bg-stone-700 hover:bg-stone-600 text-stone-300 font-bold py-3 rounded-xl transition-all cursor-pointer"
            >
              ← חזרה
            </button>
            <button
              onClick={() => setFogEnabled(f => !f)}
              className={`flex-1 font-bold py-3 rounded-xl transition-all cursor-pointer ${
                fogEnabled ? 'bg-purple-700 hover:bg-purple-600 text-purple-200' : 'bg-stone-700 hover:bg-stone-600 text-stone-400'
              }`}
            >
              {fogEnabled ? '🌫️ ערפל: פעיל' : '👁️ ערפל: כבוי'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STORY ────────────────────────────────────────────────────────────────────
  if (phase === 'story') {
    return (
      <div dir="rtl" className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-stone-800 rounded-2xl p-7 text-center border border-stone-600 shadow-2xl">
          <div className="text-6xl mb-3">{selectedChar.emoji}🏠</div>
          <div className="text-stone-500 text-sm font-bold mb-1">שלב {level.id} מתוך {LEVELS.length} • {selectedChar.name}</div>
          <h2 className="text-2xl font-black text-white mb-3">{level.name}</h2>
          <p className="text-stone-300 text-sm mb-6 leading-relaxed">{level.story}</p>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-stone-700/60 rounded-lg p-2 text-center border border-stone-600">
              <div className="text-xl">⏱️</div>
              <div className="text-stone-300 text-xs">{level.time} שניות</div>
            </div>
            <div className="flex-1 bg-stone-700/60 rounded-lg p-2 text-center border border-stone-600">
              <div className="text-xl">{level.collectibles.length > 0 ? '🎁' : '—'}</div>
              <div className="text-stone-300 text-xs">{level.collectibles.length} פריטים</div>
            </div>
            <div className="flex-1 bg-stone-700/60 rounded-lg p-2 text-center border border-stone-600">
              <div className="text-xl">{level.lockedDoors.length > 0 ? '🔒' : '🔓'}</div>
              <div className="text-stone-300 text-xs">{level.lockedDoors.length > 0 ? 'דלת נעולה' : 'פתוח'}</div>
            </div>
          </div>
          <button
            onClick={beginPlaying}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xl py-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-900"
          >
            🚨 יאללה!
          </button>
        </div>
      </div>
    );
  }

  // ── WON / LOST ───────────────────────────────────────────────────────────────
  if (phase === 'won' || phase === 'lost') {
    const won = phase === 'won';
    const timeTaken = level.time - timeLeft;
    const collectedCount = collectibles.filter(c => c.collected).length;
    const isLastLevel = currentLevel >= LEVELS.length - 1;

    return (
      <div dir="rtl" className="min-h-screen bg-stone-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Particles effect */}
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none z-50">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-2xl animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${0.5 + Math.random() * 1.5}s`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              >
                {['⭐', '🎉', '✨', '🛡️', '🎊'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="max-w-sm w-full bg-stone-800 rounded-2xl p-7 text-center border border-stone-600 shadow-2xl relative z-10">
          <div className="text-7xl mb-3">{won ? '🛡️' : '🚽'}</div>
          <h1 className={`text-2xl font-black mb-1 ${won ? 'text-green-400' : 'text-red-400'}`}>
            {won ? 'הגעת לממ"ד!' : 'נשארת בחוץ...'}
          </h1>

          {won && (
            <div className="text-3xl mb-2">
              {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
            </div>
          )}

          <div className={`rounded-xl p-4 my-4 border ${won ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
            {won ? (
              <>
                <p className="text-3xl font-black text-white">{formatTime(timeTaken)}</p>
                <p className="text-stone-400 text-xs mt-1">{moves} צעדים</p>
                {collectibles.length > 0 && (
                  <p className="text-stone-400 text-xs mt-1">
                    {collectedCount}/{collectibles.length} פריטים נאספו
                  </p>
                )}
              </>
            ) : (
              <p className="text-3xl font-black text-red-300">פסק הזמן</p>
            )}
          </div>

          <p className="text-stone-300 text-sm italic mb-6 leading-relaxed">{endMsg}</p>

          <div className="flex gap-2">
            <button
              onClick={() => startLevel(currentLevel)}
              className={`flex-1 ${won ? 'bg-stone-700 hover:bg-stone-600 text-stone-300' : 'bg-red-600 hover:bg-red-700 text-white'} active:scale-95 font-black text-lg py-4 rounded-xl transition-all cursor-pointer`}
            >
              {won ? '🔁 שוב' : '😤 עוד פעם'}
            </button>
            {won && (
              <button
                onClick={isLastLevel ? goToLevelSelect : nextLevel}
                className="flex-1 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black text-lg py-4 rounded-xl transition-all cursor-pointer"
              >
                {isLastLevel ? '🏆 סיימת!' : '▶ שלב הבא'}
              </button>
            )}
          </div>
          <button
            onClick={goToLevelSelect}
            className="w-full mt-2 bg-stone-700 hover:bg-stone-600 text-stone-400 font-bold py-3 rounded-xl transition-all cursor-pointer"
          >
            📋 בחירת שלב
          </button>
          <Link href="/" className="block text-center mt-3 text-stone-500 hover:text-stone-300 text-sm transition-colors">
            ← חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  // ── PLAYING ──────────────────────────────────────────────────────────────────
  const rows = maze.length;
  const cols = maze[0]?.length || 12;

  return (
    <div
      dir="rtl"
      className={`min-h-screen flex flex-col select-none transition-colors duration-500 ${urgent ? 'bg-red-950' : 'bg-stone-900'}`}
      style={shakeScreen ? { animation: 'shake 0.3s ease-in-out' } : undefined}
      onTouchStart={e => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if (Math.max(adx, ady) < 15) return;
        if (adx > ady) move(0, dx > 0 ? 1 : -1);
        else move(dy > 0 ? 1 : -1, 0);
        touchStart.current = null;
      }}
    >
      {/* Top bar */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-stone-700 bg-stone-900/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm">{selectedChar.emoji} שלב {level.id}</span>
          <span className="text-stone-500 text-xs">{level.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Collectibles display */}
          {hasKey && <span className="text-lg">🔑</span>}
          <span className="text-stone-400 text-sm">👣 {moves}</span>
          <span className={`font-mono font-black text-2xl tabular-nums ${timerColor}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-stone-800">
        <div
          className={`h-full transition-all duration-1000 ${timeLeft > 30 ? 'bg-green-500' : timeLeft > 10 ? 'bg-yellow-400' : 'bg-red-500'}`}
          style={{ width: `${(timeLeft / level.time) * 100}%` }}
        />
      </div>

      {/* Collectibles bar */}
      {collectibles.length > 0 && (
        <div className="flex justify-center gap-2 py-1 bg-stone-800/50">
          {collectibles.map((c, i) => (
            <span
              key={i}
              className={`text-lg transition-all ${c.collected ? 'opacity-30 line-through' : 'animate-pulse'}`}
            >
              {COLLECTIBLE_EMOJI[c.type]}
            </span>
          ))}
        </div>
      )}

      {/* Event banner */}
      {eventBanner && (
        <div className="flex items-center justify-center gap-2 py-2 bg-yellow-600/90 text-white font-black text-sm animate-pulse">
          <span className="text-xl">{eventBanner.emoji}</span>
          <span>{eventBanner.name}</span>
          <span className="font-normal text-yellow-200">— {eventBanner.description}</span>
        </div>
      )}

      {/* Active event indicator */}
      {activeEvent && !eventBanner && (
        <div className="flex items-center justify-center gap-1 py-1 bg-stone-800/80 text-stone-400 text-xs">
          <span>{activeEvent.emoji}</span>
          <span>{activeEvent.name}</span>
        </div>
      )}

      {/* Maze */}
      <div className="flex-1 flex items-center justify-center p-3 overflow-hidden">
        <div className="relative shadow-2xl rounded-lg overflow-hidden"
          style={{ width: cols * cellSize, height: rows * cellSize }}>
          {maze.map((row, r) =>
            row.map((cell, c) => {
              const cellKey = `${r},${c}`;
              const isRevealed = (!fogEnabled && !fogOverride) || revealedCells.has(cellKey);
              return (
                <div
                  key={cellKey}
                  className={`absolute flex items-center justify-center transition-all duration-200 ${
                    isRevealed ? getCellBg(cell) : 'bg-stone-950'
                  }`}
                  style={{ left: c * cellSize, top: r * cellSize, width: cellSize, height: cellSize }}
                >
                  {isRevealed && (
                    <>
                      {cell === 3 && (
                        <span style={{ fontSize: cellSize * 0.55 }} className="drop-shadow">🛡️</span>
                      )}
                      {cell === 2 && (
                        <span style={{ fontSize: cellSize * 0.55 }}>🚽</span>
                      )}
                      {cell === 4 && (
                        <span style={{ fontSize: cellSize * 0.55 }}>🔒</span>
                      )}
                      {/* Cat blocking a path */}
                      {cell === 0 && tempWallChanges.some(ch => ch.row === r && ch.col === c && !ch.wasWall) && (
                        <span style={{ fontSize: cellSize * 0.55 }}>🐈</span>
                      )}
                      {/* Opened wall from event */}
                      {cell === 1 && tempWallChanges.some(ch => ch.row === r && ch.col === c && ch.wasWall) && (
                        <span style={{ fontSize: cellSize * 0.35 }} className="opacity-50">🚪</span>
                      )}
                      {cell === 1 && level.decos[cellKey] && !tempWallChanges.some(ch => ch.row === r && ch.col === c) && (
                        <span style={{ fontSize: cellSize * 0.4 }} className="opacity-60">
                          {level.decos[cellKey]}
                        </span>
                      )}
                      {/* Collectibles on the maze */}
                      {collectibles.map((coll, ci) =>
                        coll.row === r && coll.col === c && !coll.collected ? (
                          <span
                            key={ci}
                            style={{ fontSize: cellSize * 0.5 }}
                            className="absolute animate-bounce drop-shadow-lg"
                          >
                            {COLLECTIBLE_EMOJI[coll.type]}
                          </span>
                        ) : null
                      )}
                    </>
                  )}
                  {/* Zoe's ability: show collectibles through fog */}
                  {!isRevealed && selectedChar.revealItems && collectibles.some(
                    coll => coll.row === r && coll.col === c && !coll.collected
                  ) && (
                    <span
                      style={{ fontSize: cellSize * 0.4 }}
                      className="absolute animate-pulse opacity-60"
                    >
                      ✨
                    </span>
                  )}
                </div>
              );
            })
          )}

          {/* Player */}
          <div
            className="absolute flex items-center justify-center z-20 pointer-events-none"
            style={{
              left: playerPos.col * cellSize,
              top: playerPos.row * cellSize,
              width: cellSize,
              height: cellSize,
              transition: 'left 0.07s linear, top 0.07s linear',
            }}
          >
            <span style={{ fontSize: cellSize * 0.7 }}>{selectedChar.emoji}</span>
          </div>
        </div>
      </div>

      {/* D-Pad — dir=ltr to prevent RTL grid reversal */}
      <div dir="ltr" className="p-3 pb-5 flex justify-center bg-stone-900/60">
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 52px)' }}>
          <div />
          <button
            onPointerDown={() => move(-1, 0)}
            className="h-13 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 active:scale-95 text-white rounded-xl text-2xl font-black border border-stone-600 touch-none transition-all cursor-pointer"
          >↑</button>
          <div />
          <button
            onPointerDown={() => move(0, -1)}
            className="h-13 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 active:scale-95 text-white rounded-xl text-2xl font-black border border-stone-600 touch-none transition-all cursor-pointer"
          >←</button>
          <div className="h-13 bg-stone-800 rounded-xl flex items-center justify-center border border-stone-700">
            <span className="text-stone-600 text-lg">{selectedChar.emoji}</span>
          </div>
          <button
            onPointerDown={() => move(0, 1)}
            className="h-13 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 active:scale-95 text-white rounded-xl text-2xl font-black border border-stone-600 touch-none transition-all cursor-pointer"
          >→</button>
          <div />
          <button
            onPointerDown={() => move(1, 0)}
            className="h-13 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 active:scale-95 text-white rounded-xl text-2xl font-black border border-stone-600 touch-none transition-all cursor-pointer"
          >↓</button>
          <div />
        </div>
      </div>

      {/* Shake animation */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
