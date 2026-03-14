'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Link from 'next/link';

// 0=wall, 1=floor, 2=start(toilet), 3=end(ממ"ד)
const MAZE = [
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
];

const ROWS = MAZE.length;
const COLS = MAZE[0].length;
const GAME_TIME = 90;

// Decorative furniture on floor tiles (purely visual)
const DECOS: Record<string, string> = {
  '2,3': '🛋️',
  '4,1': '📺',
  '5,9': '🐕',
  '7,1': '🛏️',
  '8,5': '🍳',
  '3,8': '🪑',
  '1,9': '🪴',
};

const WIN_MSGS = [
  'הגעת! הממ"ד מאושר. ועכשיו, כל אחד לאסלה שלו.',
  'מיכל בטוחה! (ובלי נייר, נס של ממש)',
  'שיא! מיכל הגיעה בזמן. ממש גיבורת.',
];

const LOSE_MSGS = [
  'נשארת בשירותים... הקציצות ימתינו.',
  'הסירנה נגמרה. את הבאת פפיר.',
  'ממ"ד? פעם הבאה. השירותים יותר בטוחים בינתיים.',
];

function findStart() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (MAZE[r][c] === 2) return { row: r, col: c };
  return { row: 0, col: 0 };
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const START_POS = findStart();

function getCellBg(cell: number) {
  if (cell === 0) return 'bg-stone-800 border border-stone-900';
  if (cell === 3) return 'bg-green-500';
  if (cell === 2) return 'bg-blue-900';
  return 'bg-stone-600';
}

const MazeGrid = memo(function MazeGrid({ cellSize }: { cellSize: number }) {
  return (
    <>
      {MAZE.map((row, r) =>
        row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            className={`absolute flex items-center justify-center ${getCellBg(cell)}`}
            style={{ left: c * cellSize, top: r * cellSize, width: cellSize, height: cellSize }}
          >
            {cell === 3 && (
              <span style={{ fontSize: cellSize * 0.55 }} className="drop-shadow">🛡️</span>
            )}
            {cell === 2 && (
              <span style={{ fontSize: cellSize * 0.55 }}>🚽</span>
            )}
            {cell === 1 && DECOS[`${r},${c}`] && (
              <span style={{ fontSize: cellSize * 0.4 }} className="opacity-60">
                {DECOS[`${r},${c}`]}
              </span>
            )}
          </div>
        ))
      )}
    </>
  );
});

export default function MamadMaze() {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'won' | 'lost'>('intro');
  const [playerPos, setPlayerPos] = useState(START_POS);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [moves, setMoves] = useState(0);
  const [cellSize, setCellSize] = useState(32);
  const [endMsg, setEndMsg] = useState('');

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const playerPosRef = useRef(START_POS);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Responsive cell size
  useEffect(() => {
    const update = () => {
      const avail = Math.min(window.innerWidth - 24, 420);
      setCellSize(Math.max(26, Math.floor(avail / COLS)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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

  const move = useCallback((dr: number, dc: number) => {
    if (phaseRef.current !== 'playing') return;
    const { row, col } = playerPosRef.current;
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    if (MAZE[nr][nc] === 0) return;
    playerPosRef.current = { row: nr, col: nc };
    setPlayerPos({ row: nr, col: nc });
    setMoves(m => m + 1);
    if (MAZE[nr][nc] === 3) {
      setPhase('won');
      setEndMsg(WIN_MSGS[Math.floor(Math.random() * WIN_MSGS.length)]);
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

  function startGame() {
    playerPosRef.current = START_POS;
    setPlayerPos(START_POS);
    setTimeLeft(GAME_TIME);
    setMoves(0);
    setPhase('playing');
  }

  const urgent = timeLeft <= 10 && phase === 'playing';
  const timerColor = timeLeft > 30 ? 'text-green-400' : timeLeft > 10 ? 'text-yellow-300 animate-pulse' : 'text-red-400 animate-pulse';

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div dir="rtl" className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-stone-800 rounded-2xl p-7 text-center border border-stone-600 shadow-2xl">
          <div className="text-7xl mb-3 animate-bounce">🚨</div>
          <h1 className="text-3xl font-black text-white mb-1">המבוך לממ&quot;ד</h1>
          <p className="text-stone-300 text-sm mb-5 leading-relaxed">
            יש אזעקה. מיכל — כרגיל — על האסלה.
            יש לך <span className="text-yellow-300 font-black">90 שניות</span> לחלץ אותה לממ&quot;ד.
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
          </div>
          <button
            onClick={startGame}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xl py-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-900"
          >
            🚨 אזעקה! רוץ!
          </button>
          <Link href="/" className="block text-center mt-3 text-stone-500 hover:text-stone-300 text-sm transition-colors">
            ← חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  // ── WON / LOST ─────────────────────────────────────────────────────────────
  if (phase === 'won' || phase === 'lost') {
    const won = phase === 'won';
    const timeTaken = GAME_TIME - timeLeft;
    return (
      <div dir="rtl" className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-stone-800 rounded-2xl p-7 text-center border border-stone-600 shadow-2xl">
          <div className="text-7xl mb-3">{won ? '🛡️' : '🚽'}</div>
          <h1 className={`text-2xl font-black mb-1 ${won ? 'text-green-400' : 'text-red-400'}`}>
            {won ? 'הגעת לממ"ד!' : 'נשארת בחוץ...'}
          </h1>
          <div className={`rounded-xl p-4 my-4 border ${won ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
            {won ? (
              <>
                <p className="text-3xl font-black text-white">{formatTime(timeTaken)}</p>
                <p className="text-stone-400 text-xs mt-1">{moves} צעדים</p>
              </>
            ) : (
              <p className="text-3xl font-black text-red-300">פסק הזמן</p>
            )}
          </div>
          <p className="text-stone-300 text-sm italic mb-6 leading-relaxed">{endMsg}</p>
          <button
            onClick={startGame}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-lg py-4 rounded-xl transition-all cursor-pointer"
          >
            {won ? '🔁 שוב' : '😤 עוד פעם'}
          </button>
          <Link href="/" className="block text-center mt-3 text-stone-500 hover:text-stone-300 text-sm transition-colors">
            ← חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className={`min-h-screen flex flex-col select-none transition-colors duration-500 ${urgent ? 'bg-red-950' : 'bg-stone-900'}`}
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
      <div className="flex justify-between items-center px-4 py-3 border-b border-stone-700 bg-stone-900/80 backdrop-blur">
        <span className="text-white font-black text-sm">🏠 המבוך לממ&quot;ד</span>
        <div className="flex items-center gap-3">
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
          style={{ width: `${(timeLeft / GAME_TIME) * 100}%` }}
        />
      </div>

      {/* Maze */}
      <div className="flex-1 flex items-center justify-center p-3 overflow-hidden">
        <div className="relative shadow-2xl rounded-lg overflow-hidden"
          style={{ width: COLS * cellSize, height: ROWS * cellSize }}>
          <MazeGrid cellSize={cellSize} />

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
            <span style={{ fontSize: cellSize * 0.7 }}>👧</span>
          </div>
        </div>
      </div>

      {/* D-Pad */}
      <div className="p-3 pb-5 flex justify-center bg-stone-900/60">
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 56px)' }}>
          {/* Row 1 */}
          <div />
          <button
            onPointerDown={() => move(-1, 0)}
            className="h-14 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 active:scale-95 text-white rounded-xl text-2xl font-black border border-stone-600 touch-none transition-all cursor-pointer"
          >↑</button>
          <div />
          {/* Row 2 */}
          <button
            onPointerDown={() => move(0, -1)}
            className="h-14 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 active:scale-95 text-white rounded-xl text-2xl font-black border border-stone-600 touch-none transition-all cursor-pointer"
          >←</button>
          <div className="h-14 bg-stone-800 rounded-xl flex items-center justify-center border border-stone-700">
            <span className="text-stone-600 text-lg">👧</span>
          </div>
          <button
            onPointerDown={() => move(0, 1)}
            className="h-14 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 active:scale-95 text-white rounded-xl text-2xl font-black border border-stone-600 touch-none transition-all cursor-pointer"
          >→</button>
          {/* Row 3 */}
          <div />
          <button
            onPointerDown={() => move(1, 0)}
            className="h-14 bg-stone-700 hover:bg-stone-600 active:bg-stone-500 active:scale-95 text-white rounded-xl text-2xl font-black border border-stone-600 touch-none transition-all cursor-pointer"
          >↓</button>
          <div />
        </div>
      </div>
    </div>
  );
}
