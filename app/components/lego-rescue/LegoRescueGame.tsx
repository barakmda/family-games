'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { StageLevel, ActivePowerup, SpecialEvent, LeaderboardEntry } from './game/types';
import {
  STAGES, MAMA_MAX, QUOTES, getMamaFace, randomFrom,
  POWERUP_DURATIONS,
} from './game/constants';
import { playSiren } from './game/audio';

const LegoGameCanvas = dynamic(() => import('./LegoGameCanvas'), { ssr: false });

// ─── Leaderboard helpers ────────────────────────────────────────────────────

function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('lego-rescue-leaderboard') || '[]');
  } catch { return []; }
}

function saveToLeaderboard(entry: LeaderboardEntry) {
  const lb = loadLeaderboard();
  lb.push(entry);
  lb.sort((a, b) => b.score - a.score);
  const top5 = lb.slice(0, 5);
  localStorage.setItem('lego-rescue-leaderboard', JSON.stringify(top5));
  // Keep legacy key in sync
  if (top5.length > 0) {
    localStorage.setItem('lego-rescue-highscore', top5[0].score.toString());
  }
  return top5;
}

// ─── Rating ─────────────────────────────────────────────────────────────────

function getRating(technicSaved: number, stage: StageLevel) {
  const base = technicSaved + (stage - 1) * 2; // bonus for higher stages
  if (base >= 12) return { stars: '⭐⭐⭐', text: 'מאסטר טכניק!' };
  if (base >= 7) return { stars: '⭐⭐', text: 'חובב לגו מוכשר' };
  if (base >= 3) return { stars: '⭐', text: 'מתחיל מבטיח' };
  return { stars: '💔', text: 'הלגו נשאר בחוץ...' };
}

// ─── Component ──────────────────────────────────────────────────────────────

type Phase = 'intro' | 'stageSelect' | 'playing' | 'gameover';

export default function LegoRescueGame() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [stage, setStage] = useState<StageLevel>(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [mamaMeter, setMamaMeter] = useState(0);
  const [combo, setCombo] = useState(0);
  const [technicSaved, setTechnicSaved] = useState(0);
  const [quote, setQuote] = useState('');
  const [activePowerups, setActivePowerups] = useState<ActivePowerup[]>([]);
  const [specialEvent, setSpecialEvent] = useState<SpecialEvent | null>(null);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [endMamaMeter, setEndMamaMeter] = useState(0);

  const quoteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load leaderboard on mount
  useEffect(() => {
    setLeaderboard(loadLeaderboard());
  }, []);

  const highScore = leaderboard.length > 0 ? leaderboard[0].score : 0;

  // ── Callbacks from canvas ──
  const handleGameOver = useCallback((finalScore: number, finalTechnic: number, finalMama: number, finalStage: StageLevel) => {
    setScore(finalScore);
    setTechnicSaved(finalTechnic);
    setEndMamaMeter(finalMama);
    setPhase('gameover');
    const lb = saveToLeaderboard({
      score: finalScore,
      technicSaved: finalTechnic,
      stage: finalStage,
      date: Date.now(),
    });
    setLeaderboard(lb);
  }, []);

  const handleQuote = useCallback((text: string) => {
    setQuote(text);
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(() => setQuote(''), 2500);
  }, []);

  const handleShake = useCallback(() => {
    setShakeScreen(true);
    setTimeout(() => setShakeScreen(false), 300);
  }, []);

  const handleFlash = useCallback((color: string) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 200);
  }, []);

  const startGame = useCallback((selectedStage: StageLevel) => {
    setStage(selectedStage);
    setScore(0);
    setTimeLeft(STAGES[selectedStage].duration);
    setMamaMeter(0);
    setCombo(0);
    setTechnicSaved(0);
    setQuote('');
    setActivePowerups([]);
    setSpecialEvent(null);
    setPhase('playing');
  }, []);

  // ─── INTRO ──────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-950 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full">
          <div className="text-6xl sm:text-7xl mb-4 animate-bounce">🚨</div>

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            חיים מציל את הלגו
          </h1>
          <p className="text-blue-200 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
            יש אזעקה! חיים רץ לחדר הילדים.<br />
            תפוס כמה שיותר סטים של{' '}
            <span className="text-yellow-300 font-black">לגו טכניק</span>!
          </p>

          {/* Rules */}
          <div className="bg-blue-800/50 rounded-2xl p-4 sm:p-5 mb-6 text-right space-y-3 border border-blue-600/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">🏎️</span>
              <div className="text-sm sm:text-base">
                <span className="text-green-400 font-bold">לגו טכניק</span>
                <span className="text-blue-200"> — תלחץ! +100 נקודות</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">👶</span>
              <div className="text-sm sm:text-base">
                <span className="text-red-400 font-bold">דברים הגיוניים</span>
                <span className="text-blue-200"> — אל תיגע! -50 נקודות</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">🧙</span>
              <div className="text-sm sm:text-base">
                <span className="text-yellow-400 font-bold">לגו אחר</span>
                <span className="text-blue-200"> — מלכודת! -30 נקודות</span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-blue-600/30">
              <span className="text-2xl sm:text-3xl">🤱</span>
              <div className="text-sm sm:text-base">
                <span className="text-orange-400 font-bold">מד אמא</span>
                <span className="text-blue-200"> — אם אמא תופסת, נגמר!</span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-blue-600/30">
              <span className="text-2xl sm:text-3xl">🧲⏱️🛡️🌟</span>
              <div className="text-sm sm:text-base">
                <span className="text-purple-400 font-bold">פאוור-אפים</span>
                <span className="text-blue-200"> — תפוס אותם!</span>
              </div>
            </div>
          </div>

          {/* Controls info */}
          <div className="bg-blue-900/50 rounded-xl p-3 mb-6 text-blue-300 text-xs sm:text-sm border border-blue-700/30">
            <span className="font-bold">📱 מובייל:</span> לחץ על פריטים לתפוס · גרור להזיז את חיים
            <br />
            <span className="font-bold">💻 מחשב:</span> לחץ על פריטים · הזז עכבר לשלוט בחיים
          </div>

          <button
            onClick={() => setPhase('stageSelect')}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-black text-xl sm:text-2xl px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer"
          >
            🏃 יאללה, בחר שלב!
          </button>

          {highScore > 0 && (
            <p className="text-blue-300 mt-4 text-sm">
              שיא: <span className="font-black text-yellow-300">{highScore}</span> נקודות
            </p>
          )}

          <Link
            href="/"
            className="inline-block mt-5 text-blue-400 hover:text-blue-200 text-sm transition-colors"
          >
            ← חזרה לתפריט
          </Link>
        </div>
      </div>
    );
  }

  // ─── STAGE SELECT ─────────────────────────────────────────────────────────

  if (phase === 'stageSelect') {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-950 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">בחר שלב</h2>

          <div className="space-y-3 mb-6">
            {([1, 2, 3] as StageLevel[]).map(lvl => {
              const cfg = STAGES[lvl];
              const bestInStage = leaderboard.find(e => e.stage === lvl);
              return (
                <button
                  key={lvl}
                  onClick={() => startGame(lvl)}
                  className="w-full bg-blue-800/60 hover:bg-blue-700/70 border border-blue-500/30 hover:border-blue-400/50 rounded-2xl p-4 sm:p-5 text-right transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-700/50 flex items-center justify-center text-2xl sm:text-3xl font-black text-white">
                      {lvl}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-black text-base sm:text-lg">{cfg.name}</div>
                      <div className="text-blue-300 text-xs sm:text-sm">{cfg.description}</div>
                      <div className="text-blue-400 text-xs mt-1">
                        ⏱️ {cfg.duration} שניות
                        {bestInStage && <span className="text-yellow-400 mr-2">🏆 {bestInStage.score}</span>}
                      </div>
                    </div>
                    <div className="text-2xl">
                      {lvl === 1 ? '🧸' : lvl === 2 ? '🛋️' : '🏚️'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPhase('intro')}
            className="w-full bg-blue-900/50 hover:bg-blue-800/60 text-blue-300 font-bold py-3 rounded-xl transition-all cursor-pointer border border-blue-700/30"
          >
            ← חזרה
          </button>
        </div>
      </div>
    );
  }

  // ─── GAME OVER ────────────────────────────────────────────────────────────

  if (phase === 'gameover') {
    const rating = getRating(technicSaved, stage);
    const isHighScore = score >= highScore && score > 0;
    const endedByMama = endMamaMeter >= MAMA_MAX;

    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full">
          {endedByMama ? (
            <>
              <div className="text-5xl sm:text-6xl mb-4">🤱😱</div>
              <h2 className="text-2xl sm:text-3xl font-black text-red-400 mb-2">אמא תפסה אותך!</h2>
              <p className="text-gray-300 text-base sm:text-lg mb-4">&quot;חיים! איפה התינוק?!&quot;</p>
            </>
          ) : (
            <>
              <div className="text-5xl sm:text-6xl mb-4">⏰🧱</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">נגמר הזמן!</h2>
              <p className="text-gray-300 text-base sm:text-lg mb-4">{randomFrom(QUOTES.win)}</p>
            </>
          )}

          <div className="text-4xl sm:text-5xl mb-2">{rating.stars}</div>
          <p className="text-lg sm:text-xl text-yellow-300 font-bold mb-4">{rating.text}</p>

          {/* Stats */}
          <div className="bg-gray-800/50 rounded-2xl p-4 sm:p-5 mb-5 space-y-2.5 border border-gray-600/30 text-sm sm:text-base">
            <div className="flex justify-between">
              <span className="text-gray-400">ניקוד</span>
              <span className="text-white font-black">{score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">שלב</span>
              <span className="text-blue-400 font-bold">{STAGES[stage].name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">סטי טכניק שניצלו</span>
              <span className="text-green-400 font-black">{technicSaved}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">מצב אמא</span>
              <span className="font-black">{getMamaFace(endMamaMeter)}</span>
            </div>
            {isHighScore && (
              <div className="text-yellow-300 font-black pt-2 border-t border-gray-600/30">
                🏆 שיא חדש!
              </div>
            )}
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 1 && (
            <div className="bg-gray-800/30 rounded-xl p-3 mb-5 border border-gray-700/30">
              <h3 className="text-sm font-bold text-gray-400 mb-2">🏆 טבלת שיאים</h3>
              <div className="space-y-1.5">
                {leaderboard.slice(0, 5).map((entry, i) => (
                  <div key={i} className={`flex justify-between text-xs sm:text-sm ${entry.score === score && entry.date > Date.now() - 5000 ? 'text-yellow-300 font-bold' : 'text-gray-400'}`}>
                    <span>{i + 1}. {STAGES[entry.stage].name}</span>
                    <span>{entry.score} נק׳ · {entry.technicSaved} סטים</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => startGame(stage)}
              className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-black text-base sm:text-lg px-4 py-3 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              🔄 שוב!
            </button>
            <button
              onClick={() => setPhase('stageSelect')}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-bold text-base sm:text-lg px-4 py-3 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              📋 שלבים
            </button>
          </div>
          <Link
            href="/"
            className="block text-center mt-4 text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            ← חזרה לתפריט
          </Link>
        </div>
      </div>
    );
  }

  // ─── PLAYING ──────────────────────────────────────────────────────────────

  const cfg = STAGES[stage];
  const timerColor = timeLeft <= 10 ? 'text-red-400 animate-pulse' : timeLeft <= 20 ? 'text-yellow-300' : 'text-white';
  const mamaPercent = Math.min(100, (mamaMeter / MAMA_MAX) * 100);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 overflow-hidden select-none"
      style={shakeScreen ? { animation: 'shake 0.3s ease-in-out' } : {}}
    >
      {/* Flash overlay */}
      {flashColor && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity"
          style={{ backgroundColor: flashColor }}
        />
      )}

      {/* PixiJS Canvas */}
      <LegoGameCanvas
        stage={stage}
        onGameOver={handleGameOver}
        onScoreChange={setScore}
        onTimeChange={setTimeLeft}
        onMamaChange={setMamaMeter}
        onComboChange={setCombo}
        onTechnicChange={setTechnicSaved}
        onQuote={handleQuote}
        onPowerup={setActivePowerups}
        onSpecialEvent={setSpecialEvent}
        onShake={handleShake}
        onFlash={handleFlash}
      />

      {/* HUD Overlay — React DOM on top of canvas */}
      <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
        {/* Top bar */}
        <div className="bg-slate-900/80 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between text-sm pointer-events-auto safe-bottom">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`font-black text-xl sm:text-2xl tabular-nums ${timerColor}`}>
              ⏱️ {timeLeft}
            </div>
            <div className="text-white font-bold text-base sm:text-lg">
              💰 {score}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-green-400 font-bold text-sm">
              🧱 {technicSaved}
            </div>
            {combo >= 3 && (
              <div className="text-yellow-300 font-black animate-pulse text-sm">
                🔥x{combo}
              </div>
            )}
            <div className="text-xs text-gray-400">
              {cfg.name}
            </div>
          </div>
        </div>

        {/* Mama meter */}
        <div className="bg-slate-900/60 px-3 sm:px-4 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base">{getMamaFace(mamaMeter)}</span>
            <div className="flex-1 bg-slate-700 rounded-full h-2.5 sm:h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${mamaPercent}%`,
                  backgroundColor: mamaPercent > 70 ? '#ef4444' : mamaPercent > 40 ? '#f59e0b' : '#22c55e',
                }}
              />
            </div>
            <span className="text-xs text-slate-400">{getMamaFace(mamaMeter)}</span>
          </div>
        </div>

        {/* Active powerups */}
        {activePowerups.length > 0 && (
          <div className="flex justify-center gap-2 py-1.5 bg-slate-900/40">
            {activePowerups.map((p, i) => (
              <div key={i} className="flex items-center gap-1 bg-purple-600/40 rounded-full px-2.5 py-0.5 text-xs text-purple-200 font-bold border border-purple-500/30">
                <span>{p.type === 'magnet' ? '🧲' : p.type === 'shield' ? '🛡️' : p.type === 'double' ? '🌟' : '⏱️'}</span>
                <span>{p.remaining}s</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quote bubble */}
      {quote && (
        <div className="absolute top-28 sm:top-32 left-1/2 -translate-x-1/2 bg-white text-slate-800 font-bold text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-lg z-50 max-w-[85vw] text-center pointer-events-none"
          style={{ animation: 'bounceIn 0.3s ease-out' }}
        >
          &quot;{quote}&quot;
        </div>
      )}

      {/* Special event overlay */}
      {specialEvent === 'grandma_calls' && (
        <div className="absolute inset-x-4 top-1/3 z-50 pointer-events-none">
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-2xl text-center max-w-sm mx-auto border-4 border-green-400"
            style={{ animation: 'bounceIn 0.3s ease-out' }}
          >
            <div className="text-5xl mb-2">📞👵</div>
            <p className="text-lg font-black text-slate-800">סבתא מתקשרת!</p>
            <p className="text-sm text-slate-500 mt-1">״חיים, אכלת? מה אכלת?״</p>
          </div>
        </div>
      )}

      {specialEvent === 'dad_enters' && (
        <div className="absolute bottom-20 right-4 z-50 pointer-events-none"
          style={{ animation: 'slideInRight 0.5s ease-out' }}
        >
          <div className="text-6xl">🚶</div>
          <div className="bg-white rounded-xl px-3 py-1 text-xs font-bold shadow-lg mt-1">
            מה הרעש?!
          </div>
        </div>
      )}

      {/* Shake + custom animations */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes bounceIn {
          0% { transform: translate(-50%, -20px) scale(0.8); opacity: 0; }
          50% { transform: translate(-50%, 5px) scale(1.05); }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
