'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemCategory = 'technic' | 'logical' | 'trap';

interface GameItem {
  id: number;
  emoji: string;
  name: string;
  category: ItemCategory;
}

interface FallingItem extends GameItem {
  uid: number;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  speed: number;
  grabbed: boolean;
  rejected: boolean;
}

type Phase = 'intro' | 'playing' | 'gameover';

// ─── Game Data ───────────────────────────────────────────────────────────────

const TECHNIC_ITEMS: GameItem[] = [
  { id: 1, emoji: '🏎️', name: 'בוגאטי שירון', category: 'technic' },
  { id: 2, emoji: '🏍️', name: 'אופנוע דוקאטי', category: 'technic' },
  { id: 3, emoji: '✈️', name: 'מטוס כיבוי', category: 'technic' },
  { id: 4, emoji: '🚜', name: 'טרקטור ג׳ון דיר', category: 'technic' },
  { id: 5, emoji: '🏗️', name: 'מנוף ענק', category: 'technic' },
  { id: 6, emoji: '🚁', name: 'מסוק חילוץ', category: 'technic' },
  { id: 7, emoji: '🏁', name: 'מכונית פורמולה 1', category: 'technic' },
  { id: 8, emoji: '🚛', name: 'משאית וולוו', category: 'technic' },
  { id: 9, emoji: '⛏️', name: 'חופר קטרפילר', category: 'technic' },
  { id: 10, emoji: '🚗', name: 'פורד מוסטנג', category: 'technic' },
  { id: 11, emoji: '🏎️', name: 'למבורגיני סיאן', category: 'technic' },
  { id: 12, emoji: '🚙', name: "ג'יפ לנד רובר", category: 'technic' },
];

const LOGICAL_ITEMS: GameItem[] = [
  { id: 20, emoji: '👶', name: 'התינוק', category: 'logical' },
  { id: 21, emoji: '💊', name: 'תרופות', category: 'logical' },
  { id: 22, emoji: '🔦', name: 'פנס', category: 'logical' },
  { id: 23, emoji: '📱', name: 'טלפון', category: 'logical' },
  { id: 24, emoji: '💧', name: 'בקבוק מים', category: 'logical' },
  { id: 25, emoji: '🐕', name: 'הכלב', category: 'logical' },
  { id: 26, emoji: '📄', name: 'תעודת זהות', category: 'logical' },
  { id: 27, emoji: '🧸', name: 'דובי של הקטנה', category: 'logical' },
  { id: 28, emoji: '🩹', name: 'ערכת עזרה ראשונה', category: 'logical' },
  { id: 29, emoji: '🔑', name: 'מפתחות הבית', category: 'logical' },
  { id: 30, emoji: '👵', name: 'סבתא', category: 'logical' },
  { id: 31, emoji: '🍼', name: 'בקבוק לתינוק', category: 'logical' },
];

const TRAP_ITEMS: GameItem[] = [
  { id: 40, emoji: '🏰', name: 'לגו טירה (City)', category: 'trap' },
  { id: 41, emoji: '🧙', name: 'לגו הארי פוטר', category: 'trap' },
  { id: 42, emoji: '🌸', name: 'לגו פרחים (Friends)', category: 'trap' },
  { id: 43, emoji: '🏴‍☠️', name: 'לגו שודדי ים', category: 'trap' },
  { id: 44, emoji: '🦕', name: 'לגו דינוזאורים', category: 'trap' },
  { id: 45, emoji: '🌌', name: 'לגו סטאר וורז', category: 'trap' },
];

const ALL_ITEMS = [...TECHNIC_ITEMS, ...LOGICAL_ITEMS, ...TRAP_ITEMS];

// ─── Chaim's quotes ──────────────────────────────────────────────────────────

const QUOTES = {
  grabTechnic: [
    'הבוגאטי! הצלתי את הבוגאטי!',
    'עוד סט בטוח!',
    'טכניק = חיים!',
    'זה שווה יותר מהדירה!',
    'אחלה! עוד אחד לאוסף!',
    'לא ישאר בחוץ!',
  ],
  grabLogical: [
    'מה? אין לי מקום! יש פה מנוף!',
    'התינוק יסתדר, הבוגאטי לא!',
    'סדר עדיפויות, אנשים!',
    'מה אני, רציונלי?!',
    'אופס... שניה... לא, לא צריך את זה.',
  ],
  grabTrap: [
    'הארי פוטר?! אני ברצינות?!',
    'זה לא טכניק! בושה!',
    'סטאר וורז?! מה אני, ילד?!',
    'רק טכניק! רק טכניק!',
    'City?! יש לי כבוד!',
  ],
  missTechnic: [
    'לאאאא! הטרקטור נשאר!',
    'נפל! לגו טכניק נפל!',
    'אני לא אסלח לעצמי!',
  ],
  win: [
    'שיא חדש! אמא תבין יום אחד.',
    'הצלתי את מה שחשוב באמת.',
    'כל הסטים בטוחים. אפשר לנשום.',
  ],
};

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GAME_DURATION = 30;
const SPAWN_INTERVAL_START = 1200;
const SPAWN_INTERVAL_MIN = 500;
const MAMA_MAX = 100;
const MAMA_PER_LOGICAL = 15;
const MAMA_PER_TRAP = 8;

// ─── Component ───────────────────────────────────────────────────────────────

export default function LegoRescueGame() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [mamaMeter, setMamaMeter] = useState(0);
  const [quote, setQuote] = useState('');
  const [technicSaved, setTechnicSaved] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  const uidRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);
  const lastTickRef = useRef(0);
  const itemsRef = useRef<FallingItem[]>([]);
  const phaseRef = useRef<Phase>('intro');
  const timeLeftRef = useRef(GAME_DURATION);
  const mamaMeterRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { mamaMeterRef.current = mamaMeter; }, [mamaMeter]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('lego-rescue-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const showQuote = useCallback((text: string) => {
    setQuote(text);
    setTimeout(() => setQuote(''), 2000);
  }, []);

  const flash = useCallback((color: string) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 200);
  }, []);

  const shake = useCallback(() => {
    setShakeScreen(true);
    setTimeout(() => setShakeScreen(false), 300);
  }, []);

  // ── Spawn a random item ──
  const spawnItem = useCallback(() => {
    const item = randomFrom(ALL_ITEMS);
    const uid = ++uidRef.current;
    const newItem: FallingItem = {
      ...item,
      uid,
      x: 10 + Math.random() * 75,
      y: -10,
      speed: 0.3 + Math.random() * 0.3,
      grabbed: false,
      rejected: false,
    };
    setItems(prev => [...prev, newItem]);
  }, []);

  // ── Handle grab (tap/click on item) ──
  const handleGrab = useCallback((uid: number) => {
    const item = itemsRef.current.find(i => i.uid === uid);
    if (!item || item.grabbed || item.rejected) return;

    if (item.category === 'technic') {
      const comboBonus = combo >= 3 ? 50 : 0;
      setScore(s => s + 100 + comboBonus);
      setTechnicSaved(n => n + 1);
      setCombo(c => c + 1);
      showQuote(randomFrom(QUOTES.grabTechnic));
      flash('rgba(34,197,94,0.3)');
      setItems(prev => prev.map(i => i.uid === uid ? { ...i, grabbed: true } : i));
    } else if (item.category === 'logical') {
      setScore(s => Math.max(0, s - 50));
      setCombo(0);
      setMamaMeter(m => Math.min(MAMA_MAX, m + MAMA_PER_LOGICAL));
      mamaMeterRef.current = Math.min(MAMA_MAX, mamaMeterRef.current + MAMA_PER_LOGICAL);
      showQuote(randomFrom(QUOTES.grabLogical));
      flash('rgba(239,68,68,0.3)');
      shake();
      setItems(prev => prev.map(i => i.uid === uid ? { ...i, rejected: true } : i));
    } else {
      // trap
      setScore(s => Math.max(0, s - 30));
      setCombo(0);
      setMamaMeter(m => Math.min(MAMA_MAX, m + MAMA_PER_TRAP));
      mamaMeterRef.current = Math.min(MAMA_MAX, mamaMeterRef.current + MAMA_PER_TRAP);
      showQuote(randomFrom(QUOTES.grabTrap));
      flash('rgba(251,191,36,0.3)');
      shake();
      setItems(prev => prev.map(i => i.uid === uid ? { ...i, rejected: true } : i));
    }
  }, [combo, showQuote, flash, shake]);

  // ── Game loop ──
  const gameLoop = useCallback((timestamp: number) => {
    if (phaseRef.current !== 'playing') return;

    // Timer
    if (timestamp - lastTickRef.current >= 1000) {
      lastTickRef.current = timestamp;
      setTimeLeft(t => {
        const next = t - 1;
        timeLeftRef.current = next;
        return next;
      });
    }

    // Check game over conditions
    if (timeLeftRef.current <= 0 || mamaMeterRef.current >= MAMA_MAX) {
      setPhase('gameover');
      return;
    }

    // Spawn items
    const elapsed = GAME_DURATION - timeLeftRef.current;
    const spawnInterval = Math.max(
      SPAWN_INTERVAL_MIN,
      SPAWN_INTERVAL_START - elapsed * 25
    );
    if (timestamp - lastSpawnRef.current >= spawnInterval) {
      lastSpawnRef.current = timestamp;
      spawnItem();
    }

    // Move items down
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.grabbed || item.rejected) return item;
        return { ...item, y: item.y + item.speed };
      });

      // Check for missed technic items (fell below screen)
      const missed = updated.filter(
        i => i.y > 105 && !i.grabbed && !i.rejected && i.category === 'technic'
      );
      if (missed.length > 0) {
        setScore(s => Math.max(0, s - 20 * missed.length));
        setCombo(0);
        showQuote(randomFrom(QUOTES.missTechnic));
      }

      // Remove items that fell off screen or were grabbed/rejected and faded
      return updated.filter(i => {
        if (i.grabbed || i.rejected) return i.y < 110; // let animation play
        return i.y <= 105;
      });
    });

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [spawnItem, showQuote]);

  // ── Start / End game ──
  const startGame = useCallback(() => {
    setPhase('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setItems([]);
    setMamaMeter(0);
    setTechnicSaved(0);
    setCombo(0);
    setQuote('');
    mamaMeterRef.current = 0;
    timeLeftRef.current = GAME_DURATION;
    uidRef.current = 0;
    lastSpawnRef.current = 0;
    lastTickRef.current = 0;
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Save high score on game over
  useEffect(() => {
    if (phase === 'gameover' && score > highScore) {
      setHighScore(score);
      localStorage.setItem('lego-rescue-highscore', score.toString());
    }
  }, [phase, score, highScore]);

  // ── Rating ──
  const getRating = () => {
    if (technicSaved >= 10) return { stars: '⭐⭐⭐', text: 'מאסטר טכניק!' };
    if (technicSaved >= 6) return { stars: '⭐⭐', text: 'חובב לגו מוכשר' };
    if (technicSaved >= 3) return { stars: '⭐', text: 'מתחיל מבטיח' };
    return { stars: '💔', text: 'הלגו נשאר בחוץ...' };
  };

  const getMamaMessage = () => {
    if (mamaMeter >= MAMA_MAX) return '🤱 אמא תפסה אותך! "חיים! איפה התינוק?!"';
    if (mamaMeter >= 70) return '😤 אמא כמעט תפסה אותך...';
    if (mamaMeter >= 40) return '😒 אמא חושדת...';
    return '😌 אמא לא שמה לב!';
  };

  // ─── INTRO ─────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          {/* Siren animation */}
          <div className="text-6xl mb-4 animate-bounce">🚨</div>

          <h1 className="text-4xl font-black text-white mb-2">
            חיים מציל את הלגו
          </h1>
          <p className="text-blue-200 text-lg mb-8">
            יש אזעקה! חיים רץ לחדר הילדים.<br />
            יש לו {GAME_DURATION} שניות לתפוס כמה שיותר<br />
            סטים של <span className="text-yellow-300 font-black">לגו טכניק</span>!
          </p>

          {/* Rules */}
          <div className="bg-blue-800/50 rounded-2xl p-5 mb-8 text-right space-y-3 border border-blue-600/30">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏎️</span>
              <div>
                <span className="text-green-400 font-bold">לגו טכניק</span>
                <span className="text-blue-200"> — תלחץ! +100 נקודות</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">👶</span>
              <div>
                <span className="text-red-400 font-bold">דברים הגיוניים</span>
                <span className="text-blue-200"> — אל תיגע! -50 נקודות</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧙</span>
              <div>
                <span className="text-yellow-400 font-bold">לגו אחר</span>
                <span className="text-blue-200"> — מלכודת! -30 נקודות</span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-blue-600/30">
              <span className="text-3xl">🤱</span>
              <div>
                <span className="text-orange-400 font-bold">מד אמא</span>
                <span className="text-blue-200"> — אם אמא תופסת, נגמר!</span>
              </div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-black text-2xl px-10 py-4 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            🏃 יאללה, רוצים!
          </button>

          {highScore > 0 && (
            <p className="text-blue-300 mt-4 text-sm">
              שיא: <span className="font-black text-yellow-300">{highScore}</span> נקודות
            </p>
          )}

          <Link
            href="/"
            className="inline-block mt-6 text-blue-400 hover:text-blue-200 text-sm transition-colors"
          >
            → חזרה לתפריט
          </Link>
        </div>
      </div>
    );
  }

  // ─── GAME OVER ─────────────────────────────────────────────────────────────

  if (phase === 'gameover') {
    const rating = getRating();
    const isHighScore = score >= highScore && score > 0;
    const endedByMama = mamaMeter >= MAMA_MAX;

    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          {endedByMama ? (
            <>
              <div className="text-6xl mb-4">🤱😱</div>
              <h2 className="text-3xl font-black text-red-400 mb-2">אמא תפסה אותך!</h2>
              <p className="text-gray-300 text-lg mb-6">&quot;חיים! איפה התינוק?!&quot;</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">⏰🧱</div>
              <h2 className="text-3xl font-black text-white mb-2">נגמר הזמן!</h2>
              <p className="text-gray-300 text-lg mb-6">{randomFrom(QUOTES.win)}</p>
            </>
          )}

          <div className="text-5xl mb-2">{rating.stars}</div>
          <p className="text-xl text-yellow-300 font-bold mb-6">{rating.text}</p>

          {/* Stats */}
          <div className="bg-gray-800/50 rounded-2xl p-5 mb-6 space-y-3 border border-gray-600/30">
            <div className="flex justify-between text-lg">
              <span className="text-gray-400">ניקוד</span>
              <span className="text-white font-black">{score}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-400">סטי טכניק שניצלו</span>
              <span className="text-green-400 font-black">{technicSaved}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-400">מצב אמא</span>
              <span className="font-black">{getMamaMessage()}</span>
            </div>
            {isHighScore && (
              <div className="text-yellow-300 font-black text-lg pt-2 border-t border-gray-600/30">
                🏆 שיא חדש!
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-black text-lg px-6 py-3 rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              🔄 שוב!
            </button>
            <Link
              href="/"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg px-6 py-3 rounded-2xl shadow-lg active:scale-95 transition-all text-center"
            >
              🏠 תפריט
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYING ───────────────────────────────────────────────────────────────

  const timerColor = timeLeft <= 10 ? 'text-red-400' : timeLeft <= 20 ? 'text-yellow-300' : 'text-white';
  const mamaPercent = Math.min(100, (mamaMeter / MAMA_MAX) * 100);

  return (
    <div
      dir="rtl"
      className={`min-h-screen bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 flex flex-col overflow-hidden select-none ${shakeScreen ? 'animate-shake' : ''}`}
      style={shakeScreen ? { animation: 'shake 0.3s ease-in-out' } : {}}
    >
      {/* Flash overlay */}
      {flashColor && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity"
          style={{ backgroundColor: flashColor }}
        />
      )}

      {/* HUD */}
      <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between text-sm z-40">
        <div className="flex items-center gap-4">
          <div className={`font-black text-2xl ${timerColor}`}>
            ⏱️ {timeLeft}
          </div>
          <div className="text-white font-bold text-lg">
            💰 {score}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-green-400 font-bold">
            🧱 {technicSaved}
          </div>
          {combo >= 3 && (
            <div className="text-yellow-300 font-black animate-pulse">
              🔥x{combo}
            </div>
          )}
        </div>
      </div>

      {/* Mama meter */}
      <div className="bg-slate-900/60 px-4 py-1.5 z-40">
        <div className="flex items-center gap-2">
          <span className="text-sm">🤱</span>
          <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${mamaPercent}%`,
                backgroundColor: mamaPercent > 70 ? '#ef4444' : mamaPercent > 40 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
          <span className="text-xs text-slate-400">
            {mamaPercent > 70 ? '😡' : mamaPercent > 40 ? '😤' : '😌'}
          </span>
        </div>
      </div>

      {/* Quote bubble */}
      {quote && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-white text-slate-800 font-bold text-sm px-4 py-2 rounded-2xl shadow-lg z-50 whitespace-nowrap animate-bounce-in">
          &quot;{quote}&quot;
        </div>
      )}

      {/* Game area */}
      <div
        ref={gameAreaRef}
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: 'manipulation' }}
      >
        {/* Falling items */}
        {items.map(item => (
          <button
            key={item.uid}
            onClick={() => handleGrab(item.uid)}
            className={`absolute w-16 h-16 flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-transform active:scale-90
              ${item.grabbed ? 'scale-150 opacity-0 transition-all duration-300' : ''}
              ${item.rejected ? 'opacity-0 rotate-45 transition-all duration-300' : ''}
              ${item.category === 'technic' ? 'bg-green-500/20 border-2 border-green-400/40 hover:bg-green-500/40' : ''}
              ${item.category === 'logical' ? 'bg-red-500/10 border-2 border-red-400/20 hover:bg-red-500/30' : ''}
              ${item.category === 'trap' ? 'bg-yellow-500/15 border-2 border-yellow-400/30 hover:bg-yellow-500/35' : ''}
            `}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `translate(-50%, -50%)`,
            }}
          >
            <span className="text-3xl">{item.emoji}</span>
            <span className="text-[9px] text-white font-bold mt-0.5 leading-tight text-center px-1 truncate max-w-full">
              {item.name}
            </span>
          </button>
        ))}

        {/* Chaim at bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-5xl">
          🧑‍🦱
        </div>
      </div>

      {/* Shake keyframes style */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes bounce-in {
          0% { transform: translate(-50%, -20px) scale(0.8); opacity: 0; }
          50% { transform: translate(-50%, 5px) scale(1.05); }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
