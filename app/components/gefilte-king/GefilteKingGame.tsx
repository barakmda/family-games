'use client';

import { useReducer, useEffect, useState } from 'react';
import Link from 'next/link';

type FishAmount = 'none' | 'half' | 'full' | 'double';

interface Order {
  fish: FishAmount;
  horseradish: boolean;
  sauce: boolean;
}

interface Customer {
  id: number;
  name: string;
  emoji: string;
  orderText: string;
  order: Order;
  timeLeft: number;
  status: 'waiting' | 'satisfied' | 'annoyed';
  resolvedAt?: number;
}

interface GameState {
  phase: 'intro' | 'playing' | 'gameover';
  meter: number;
  customers: Customer[];
  plate: Order;
  score: number;
  gameTime: number;
  tickCount: number;
  customerIndex: number;
  message: string;
  messageType: 'good' | 'bad' | 'neutral';
  messageClearTick: number;
}

const TEMPLATES: Omit<Customer, 'id' | 'timeLeft' | 'status' | 'resolvedAt'>[] = [
  { name: 'דודה רחל', emoji: '👵', orderText: 'חצי קציצה בלבד! אני בדיאטה מאז 1982 וזה עובד!', order: { fish: 'half', horseradish: false, sauce: false } },
  { name: 'סבתא מרים', emoji: '🧓', orderText: 'תשים הרבה חזרת. שיהיה לי תירוץ לבכות.', order: { fish: 'full', horseradish: true, sauce: false } },
  { name: 'דודה שושנה', emoji: '👩‍🦳', orderText: 'שתי קציצות עם רוטב. הרופא אמר שבשבת זה מותר.', order: { fish: 'double', horseradish: false, sauce: true } },
  { name: 'סבא יוסף', emoji: '👴', orderText: 'קציצה שלמה עם הכל. ומהר, יש כדורגל.', order: { fish: 'full', horseradish: true, sauce: true } },
  { name: 'דודה ציפי', emoji: '👩‍🦱', orderText: 'חצי קציצה עם קצת חזרת. ממש קצת. לא יותר מדי.', order: { fish: 'half', horseradish: true, sauce: false } },
  { name: 'בן דוד ארי', emoji: '🧑', orderText: 'שתיים עם הכל. כי אני שווה את זה.', order: { fish: 'double', horseradish: true, sauce: true } },
  { name: 'דוד ראובן', emoji: '👨‍🦲', orderText: 'בלי חזרת, בלי רוטב, קציצה שלמה. פשוט. כמו החיים.', order: { fish: 'full', horseradish: false, sauce: false } },
  { name: 'אמא', emoji: '👩‍🍳', orderText: 'שתיים עם חזרת, בלי רוטב. ואל תגיד לאבא.', order: { fish: 'double', horseradish: true, sauce: false } },
  { name: 'סבתא לאה', emoji: '🧕', orderText: 'חצי קציצה עם רוטב. אני לא רעבה, אבל רק חצי.', order: { fish: 'half', horseradish: false, sauce: true } },
];

const GAME_DURATION = 60;
const CUSTOMER_TIME = 15;
const MAX_CUSTOMERS = 3;
const SPAWN_EVERY = 4;
const MSG_TICKS = 3;
const EMPTY_PLATE: Order = { fish: 'none', horseradish: false, sauce: false };

const INIT: GameState = {
  phase: 'intro',
  meter: 70,
  customers: [],
  plate: EMPTY_PLATE,
  score: 0,
  gameTime: GAME_DURATION,
  tickCount: 0,
  customerIndex: 0,
  message: '',
  messageType: 'neutral',
  messageClearTick: -1,
};

type Action =
  | { type: 'START'; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'SERVE'; id: number; now: number }
  | { type: 'SET_FISH'; fish: FishAmount }
  | { type: 'TOGGLE'; field: 'horseradish' | 'sauce' };

function mkCustomer(idx: number, now: number): Customer {
  return { ...TEMPLATES[idx % TEMPLATES.length], id: now + idx * 0.001 + Math.random() * 0.0001, timeLeft: CUSTOMER_TIME, status: 'waiting' };
}

function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'START':
      return { ...INIT, phase: 'playing', customers: [mkCustomer(0, a.now)], customerIndex: 1 };

    case 'TICK': {
      if (s.phase !== 'playing') return s;
      const tick = s.tickCount + 1;
      const now = a.now;
      let meterDelta = 0;
      let msg = tick > s.messageClearTick ? '' : s.message;
      let msgType = s.messageType;
      let msgClear = s.messageClearTick;

      const next = s.customers
        .map((c): Customer | null => {
          if (c.status !== 'waiting') return c.resolvedAt && now - c.resolvedAt > 1500 ? null : c;
          const t = c.timeLeft - 1;
          if (t <= 0) {
            meterDelta -= 15;
            msg = `${c.name} עזבה בכעס! צק צק צק...`;
            msgType = 'bad';
            msgClear = tick + MSG_TICKS;
            return { ...c, timeLeft: 0, status: 'annoyed', resolvedAt: now };
          }
          return { ...c, timeLeft: t };
        })
        .filter((c): c is Customer => c !== null);

      let custIdx = s.customerIndex;
      if (tick % SPAWN_EVERY === 0) {
        const waiting = next.filter(c => c.status === 'waiting').length;
        if (waiting < MAX_CUSTOMERS) { next.push(mkCustomer(custIdx, now)); custIdx++; }
      }

      const newMeter = Math.max(0, s.meter + meterDelta);
      const newTime = Math.max(0, s.gameTime - 1);
      return {
        ...s,
        phase: newMeter <= 0 || newTime <= 0 ? 'gameover' : 'playing',
        meter: newMeter, gameTime: newTime, customers: next,
        tickCount: tick, customerIndex: custIdx,
        message: msg, messageType: msgType, messageClearTick: msgClear,
      };
    }

    case 'SERVE': {
      if (s.phase !== 'playing') return s;
      const c = s.customers.find(x => x.id === a.id && x.status === 'waiting');
      if (!c) return s;
      if (s.plate.fish === 'none') {
        return { ...s, message: '...אתה מגיש צלחת ריקה? ממש כמו אבא שלך', messageType: 'bad', messageClearTick: s.tickCount + MSG_TICKS };
      }
      const ok = c.order.fish === s.plate.fish && c.order.horseradish === s.plate.horseradish && c.order.sauce === s.plate.sauce;
      return {
        ...s,
        customers: s.customers.map(x => x.id === a.id ? { ...x, status: ok ? 'satisfied' : 'annoyed', resolvedAt: a.now } : x),
        meter: ok ? Math.min(100, s.meter + 10) : Math.max(0, s.meter - 20),
        score: ok ? s.score + 100 : s.score,
        plate: EMPTY_PLATE,
        message: ok ? `פששש... ${c.name} מרוצה. ממש איינשטיין הקטן!` : `חמווווץ! ${c.name} לא מרוצה! אולי כדאי שתחזור לגן?`,
        messageType: ok ? 'good' : 'bad',
        messageClearTick: s.tickCount + MSG_TICKS,
      };
    }

    case 'SET_FISH': return { ...s, plate: { ...s.plate, fish: a.fish } };
    case 'TOGGLE': return { ...s, plate: { ...s.plate, [a.field]: !s.plate[a.field] } };
    default: return s;
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const FISH_OPTS: { v: FishAmount; label: string; display: string }[] = [
  { v: 'none', label: 'ריק', display: '🍽️' },
  { v: 'half', label: '½ קציצה', display: '🐟' },
  { v: 'full', label: 'שלמה', display: '🐟🐟' },
  { v: 'double', label: 'שתיים', display: '🐟🐟🐟' },
];

function plateMatchesOrder(plate: Order, order: Order) {
  return plate.fish === order.fish && plate.horseradish === order.horseradish && plate.sauce === order.sauce;
}

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

function scoreMsg(s: number) {
  if (s >= 800) return 'אפשר לסמוך עליך. אולי.';
  if (s >= 500) return 'לא רע. אבל יכולת יותר.';
  if (s >= 200) return 'זה בסדר. אני אשב פה בחושך ואחכה שתשתפר.';
  return 'אולי כדאי שתחזור לגן? אנחנו נמצא מישהו אחר.';
}

// Order summary badges shown on customer card
function OrderBadges({ order }: { order: Order }) {
  const fishMap: Record<FishAmount, string> = { none: '', half: '🐟 ½', full: '🐟🐟', double: '🐟🐟🐟' };
  const fishLabel = fishMap[order.fish];
  return (
    <div className="flex gap-1 flex-wrap justify-center my-1.5">
      <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">{fishLabel}</span>
      {order.horseradish && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">🌿 חזרת</span>}
      {order.sauce && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">🍲 רוטב</span>}
      {!order.horseradish && !order.sauce && (
        <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">ללא תוספות</span>
      )}
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function GefilteKingGame() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const { phase, meter, customers, plate, score, gameTime, message, messageType } = state;
  const [highScore, setHighScore] = useState(0);

  // Load high score
  useEffect(() => {
    setHighScore(parseInt(localStorage.getItem('gefilte-highscore') ?? '0'));
  }, []);

  // Save high score on game over
  useEffect(() => {
    if (phase === 'gameover' && score > highScore) {
      setHighScore(score);
      localStorage.setItem('gefilte-highscore', score.toString());
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Game loop
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const visible = customers.filter(
    c => c.status === 'waiting' || (c.resolvedAt && Date.now() - c.resolvedAt < 1500)
  );
  const meterColor = meter > 60 ? 'bg-green-500' : meter > 30 ? 'bg-yellow-400' : 'bg-red-500';

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div dir="rtl" className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-7 border-2 border-amber-200">
          <div className="text-center mb-5">
            <div className="text-6xl mb-2">👑🐟</div>
            <h1 className="text-3xl font-black text-amber-900">מלך הגעפילטע</h1>
            <p className="text-amber-500 text-sm mt-1">אתה הנכד התורן. המשפחה רעבה.</p>
          </div>

          {/* Rules */}
          <div className="bg-amber-50 rounded-xl p-4 mb-5 space-y-2 text-sm text-amber-800">
            {[
              ['🐟', 'בחר כמה קציצות שמים בצלחת'],
              ['🌿', 'הוסף חזרת אם ביקשו'],
              ['🍲', 'הוסף רוטב אם ביקשו'],
              ['🍽️', 'לחץ "הגש!" על הלקוח הנכון'],
              ['📊', 'שקט תעשייתי = חיים. אל תתן לו לרדת לאפס'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-start gap-2">
                <span>{icon}</span>
                <span className="text-right">{text}</span>
              </div>
            ))}
          </div>

          {highScore > 0 && (
            <div className="text-center mb-4 text-sm text-amber-600 font-medium">
              השיא שלך: <span className="font-black text-amber-800">{highScore}</span> נקודות
            </div>
          )}

          <button
            onClick={() => dispatch({ type: 'START', now: Date.now() })}
            className="w-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xl py-4 rounded-xl transition-all cursor-pointer"
          >
            נו, שיהיה...
          </button>
          <Link href="/" className="block text-center mt-3 text-amber-400 hover:text-amber-600 text-sm">
            ← חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  // ── GAME OVER ──────────────────────────────────────────────────────────────
  if (phase === 'gameover') {
    const isNewRecord = score > 0 && score >= highScore;
    return (
      <div dir="rtl" className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-7 text-center border-2 border-amber-200">
          <div className="text-6xl mb-3">{score >= 500 ? '🏆' : '😤'}</div>
          <h1 className="text-2xl font-black text-amber-900 mb-1">
            {meter <= 0 ? 'איבדת את השקט התעשייתי' : 'נגמר הזמן'}
          </h1>

          <div className="bg-amber-50 rounded-xl p-4 my-4">
            <p className="text-sm text-amber-600 mb-1">הניקוד שלך</p>
            <p className="text-5xl font-black text-amber-700">{score}</p>
            {isNewRecord && (
              <span className="inline-block mt-1 text-xs bg-yellow-400 text-yellow-900 font-black px-3 py-0.5 rounded-full">
                🎉 שיא חדש!
              </span>
            )}
            {!isNewRecord && highScore > 0 && (
              <p className="text-xs text-amber-400 mt-1">שיא: {highScore}</p>
            )}
          </div>

          <p className="text-amber-600 text-sm italic mb-6">{scoreMsg(score)}</p>

          <button
            onClick={() => dispatch({ type: 'START', now: Date.now() })}
            className="w-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-lg py-4 rounded-xl transition-all cursor-pointer"
          >
            עוד פעם? (כי למה לא)
          </button>
          <Link href="/" className="block text-center mt-3 text-amber-400 hover:text-amber-600 text-sm">
            ← חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="min-h-screen bg-amber-50 flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-amber-800 text-white px-4 py-3 sticky top-0 z-10 shadow-md">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="font-black text-base">👑 מלך הגעפילטע</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold">⭐ {score}</span>
              <span className={`font-mono font-black text-base tabular-nums ${gameTime <= 10 ? 'text-red-300 animate-pulse' : ''}`}>
                ⏱ {fmt(gameTime)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-300 whitespace-nowrap">שקט תעשייתי</span>
            <div className="flex-1 bg-amber-900 rounded-full h-3.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${meterColor}`}
                style={{ width: `${meter}%` }}
              />
            </div>
            <span className="text-xs text-amber-300 w-7 text-left tabular-nums">{meter}%</span>
          </div>
        </div>
      </div>

      {/* ── Message banner ── */}
      {message && (
        <div className={`text-center py-2.5 px-4 text-sm font-bold border-b ${
          messageType === 'good' ? 'bg-green-100 text-green-800 border-green-200' :
          messageType === 'bad'  ? 'bg-red-100 text-red-800 border-red-200' :
                                   'bg-yellow-100 text-yellow-800 border-yellow-200'
        }`}>
          {message}
        </div>
      )}

      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* ── Customer grid (always 3 slots) ── */}
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: MAX_CUSTOMERS }, (_, i) => {
              const c = visible[i];

              if (!c) {
                return (
                  <div
                    key={`slot-${i}`}
                    className="rounded-xl border-2 border-dashed border-amber-100 bg-white/40 flex items-center justify-center text-amber-200 text-xs min-h-40"
                  >
                    פנוי
                  </div>
                );
              }

              const isMatch = plate.fish !== 'none' && c.status === 'waiting' && plateMatchesOrder(plate, c.order);

              return (
                <div
                  key={c.id}
                  className={`rounded-xl border-2 p-2.5 flex flex-col transition-all duration-300 min-h-40 ${
                    c.status === 'satisfied'  ? 'border-green-400 bg-green-50' :
                    c.status === 'annoyed'    ? 'border-red-400 bg-red-50' :
                    isMatch                   ? 'border-green-400 bg-green-50 ring-2 ring-green-300 ring-offset-1' :
                    c.timeLeft <= 4           ? 'border-red-300 bg-red-50 animate-pulse' :
                                                'border-amber-200 bg-white'
                  }`}
                >
                  {/* Avatar + match indicator */}
                  <div className="flex items-start justify-between">
                    <div className="text-2xl leading-none">
                      {c.status === 'satisfied' ? '😊' : c.status === 'annoyed' ? '😤' : c.emoji}
                    </div>
                    {isMatch && (
                      <span className="text-green-500 text-xs font-black leading-none">✓</span>
                    )}
                  </div>
                  <div className="text-xs font-black text-amber-900 mt-0.5">{c.name}</div>

                  {/* Order badges — quick visual summary */}
                  <OrderBadges order={c.order} />

                  {/* Speech bubble quote */}
                  <p className="text-xs text-amber-500 italic flex-1 leading-relaxed line-clamp-3">
                    &ldquo;{c.orderText}&rdquo;
                  </p>

                  {/* Timer + serve button */}
                  {c.status === 'waiting' && (
                    <>
                      <div className={`text-center text-xs font-black my-1 ${c.timeLeft <= 4 ? 'text-red-500' : 'text-amber-400'}`}>
                        ⏰ {c.timeLeft}
                      </div>
                      <button
                        onClick={() => dispatch({ type: 'SERVE', id: c.id, now: Date.now() })}
                        className={`w-full text-white text-xs font-black py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer ${
                          isMatch
                            ? 'bg-green-500 hover:bg-green-600 shadow-sm shadow-green-200'
                            : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                      >
                        הגש! 🍽️
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Kitchen ── */}
          <div className="bg-white rounded-xl border-2 border-amber-200 overflow-hidden">
            <div className="bg-amber-100 px-4 py-2 border-b border-amber-200">
              <h2 className="font-black text-amber-900 text-sm">🍳 המטבח שלך</h2>
            </div>
            <div className="p-4 space-y-3">

              {/* Fish amount */}
              <div>
                <p className="text-xs text-amber-500 font-bold mb-2 uppercase tracking-wide">כמות דגים</p>
                <div className="grid grid-cols-4 gap-2">
                  {FISH_OPTS.map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => dispatch({ type: 'SET_FISH', fish: opt.v })}
                      className={`py-2.5 rounded-xl text-xs font-black border-2 transition-all active:scale-95 cursor-pointer ${
                        plate.fish === opt.v
                          ? 'border-amber-600 bg-amber-600 text-white shadow-md'
                          : 'border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-300'
                      }`}
                    >
                      <div className="text-lg">{opt.display}</div>
                      <div className="mt-0.5">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Extras */}
              <div>
                <p className="text-xs text-amber-500 font-bold mb-2 uppercase tracking-wide">תוספות</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE', field: 'horseradish' })}
                    className={`flex-1 py-3 rounded-xl font-black border-2 text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                      plate.horseradish
                        ? 'border-green-500 bg-green-500 text-white shadow-md'
                        : 'border-amber-100 bg-amber-50 text-amber-700 hover:border-green-300'
                    }`}
                  >
                    🌿 חזרת
                    {plate.horseradish && <span className="text-xs">✓</span>}
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE', field: 'sauce' })}
                    className={`flex-1 py-3 rounded-xl font-black border-2 text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                      plate.sauce
                        ? 'border-orange-500 bg-orange-500 text-white shadow-md'
                        : 'border-amber-100 bg-amber-50 text-amber-700 hover:border-orange-300'
                    }`}
                  >
                    🍲 רוטב
                    {plate.sauce && <span className="text-xs">✓</span>}
                  </button>
                </div>
              </div>

              {/* Plate preview */}
              <div className="bg-amber-50 rounded-xl py-2.5 px-3 flex items-center gap-2 border border-amber-100">
                <span className="text-xs text-amber-400 font-medium whitespace-nowrap">הצלחת:</span>
                <div className="flex gap-1 flex-wrap">
                  {plate.fish === 'none' ? (
                    <span className="text-xs text-amber-300 italic">ריקה</span>
                  ) : (
                    <>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        {FISH_OPTS.find(f => f.v === plate.fish)?.display}
                      </span>
                      {plate.horseradish && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">🌿</span>}
                      {plate.sauce && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">🍲</span>}
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
