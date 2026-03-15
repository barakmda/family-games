'use client';

import { useReducer, useEffect, useState, useCallback } from 'react';
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

// ─── SVG Scene Components ─────────────────────────────────────────────────────

function KitchenScene() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* ── Wall area (top ~45%) ── */}
      {/* Base wall color with warm kitchen wallpaper feel */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #e8d8b8 0%, #dfc9a0 25%, #d4ba8a 40%, #8B6914 40.5%, #5a4210 55%, #3d2b0f 100%)',
      }} />

      {/* Realistic kitchen tile pattern on wall - subway tile style */}
      <div className="absolute top-0 left-0 right-0" style={{
        height: '40%',
        backgroundImage: `
          linear-gradient(0deg, rgba(180,155,110,0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(180,155,110,0.3) 1px, transparent 1px)
        `,
        backgroundSize: '60px 30px',
      }} />
      {/* Offset every other row for subway tile effect */}
      <div className="absolute top-0 left-0 right-0" style={{
        height: '40%',
        backgroundImage: `
          linear-gradient(0deg, rgba(160,135,90,0.15) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        backgroundPosition: '30px 15px',
      }} />

      {/* Subtle tile grout shadow for depth */}
      <div className="absolute top-0 left-0 right-0" style={{
        height: '40%',
        backgroundImage: `
          linear-gradient(180deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.02) 14px, transparent 15px, transparent 29px, rgba(0,0,0,0.03) 30px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.01) 28px, transparent 29px, transparent 59px, rgba(0,0,0,0.02) 60px)
        `,
        backgroundSize: '60px 30px',
      }} />

      {/* Wallpaper decorative border strip between wall and counter */}
      <div className="absolute left-0 right-0" style={{
        top: '36%',
        height: '14px',
        background: 'linear-gradient(180deg, #c49a3c 0%, #a07828 40%, #8B6914 70%, #6d5210 100%)',
        borderTop: '2px solid #d4aa4c',
        borderBottom: '1px solid #5a4210',
      }} />
      {/* Decorative repeating pattern on the border strip */}
      <div className="absolute left-0 right-0" style={{
        top: '36%',
        height: '14px',
        backgroundImage: `repeating-linear-gradient(
          90deg,
          transparent 0px,
          transparent 18px,
          rgba(255,215,0,0.15) 18px,
          rgba(255,215,0,0.15) 20px,
          transparent 20px,
          transparent 38px
        )`,
      }} />

      {/* ── Wooden counter (thick, with realistic wood grain) ── */}
      <div className="absolute left-0 right-0" style={{
        top: '38%',
        height: '24px',
        background: `
          linear-gradient(180deg,
            #c49a3c 0%,
            #b8892e 15%,
            #a07828 30%,
            #96702a 50%,
            #8B6914 65%,
            #7d5e12 80%,
            #6d5210 100%
          )
        `,
        boxShadow: '0 6px 16px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,215,0,0.15)',
      }}>
        {/* Wood grain horizontal lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            repeating-linear-gradient(
              180deg,
              transparent 0px,
              transparent 2px,
              rgba(90,55,10,0.12) 2px,
              rgba(90,55,10,0.12) 3px,
              transparent 3px,
              transparent 5px,
              rgba(90,55,10,0.08) 5px,
              rgba(90,55,10,0.08) 6px,
              transparent 6px,
              transparent 9px
            )
          `,
        }} />
        {/* Wood grain subtle wavy pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            repeating-linear-gradient(
              95deg,
              transparent 0px,
              rgba(139,105,20,0.06) 40px,
              transparent 80px,
              rgba(139,105,20,0.04) 120px,
              transparent 160px
            )
          `,
        }} />
        {/* Counter edge highlight (front bevel) */}
        <div className="absolute left-0 right-0 bottom-0" style={{
          height: '4px',
          background: 'linear-gradient(180deg, #6d5210 0%, #4a3508 100%)',
          borderTop: '1px solid rgba(255,215,0,0.1)',
        }} />
      </div>

      {/* ── Kitchen floor area (bottom ~55%) ── */}
      {/* Checkered floor tile pattern */}
      <div className="absolute left-0 right-0 bottom-0" style={{
        top: '44%',
        backgroundImage: `
          linear-gradient(45deg, #3a2a12 25%, transparent 25%),
          linear-gradient(-45deg, #3a2a12 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #3a2a12 75%),
          linear-gradient(-45deg, transparent 75%, #3a2a12 75%)
        `,
        backgroundSize: '40px 40px',
        backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
        backgroundColor: '#2d1f0e',
      }} />
      {/* Floor tile grout lines */}
      <div className="absolute left-0 right-0 bottom-0" style={{
        top: '44%',
        backgroundImage: `
          linear-gradient(0deg, rgba(0,0,0,0.2) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.2) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />
      {/* Floor shine / reflection */}
      <div className="absolute left-0 right-0 bottom-0" style={{
        top: '44%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.15) 100%)',
      }} />

      {/* ── Kitchen decorations ── */}
      {/* Shelf on wall */}
      <div className="absolute right-4 sm:right-8" style={{
        top: '8%',
        width: '130px',
        height: '8px',
        background: 'linear-gradient(180deg, #a07828 0%, #8B6914 50%, #6d5210 100%)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        borderRadius: '2px 2px 0 0',
      }}>
        {/* Shelf bracket left */}
        <div className="absolute -bottom-10 left-2 w-2" style={{
          height: '10px',
          background: '#6d5210',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
        }} />
        {/* Shelf bracket right */}
        <div className="absolute -bottom-10 right-2 w-2" style={{
          height: '10px',
          background: '#6d5210',
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }} />
      </div>

      {/* Pot on shelf */}
      <div className="absolute right-8 sm:right-14" style={{ top: '1%' }}>
        <svg width="50" height="50" viewBox="0 0 50 50">
          <ellipse cx="25" cy="43" rx="20" ry="5" fill="#555" />
          <rect x="5" y="16" width="40" height="27" rx="4" fill="#777" />
          <rect x="6" y="16" width="38" height="27" rx="3" fill="url(#potGrad)" />
          <defs>
            <linearGradient id="potGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#666" />
              <stop offset="30%" stopColor="#999" />
              <stop offset="70%" stopColor="#888" />
              <stop offset="100%" stopColor="#666" />
            </linearGradient>
          </defs>
          <ellipse cx="25" cy="16" rx="20" ry="6" fill="#aaa" />
          <ellipse cx="25" cy="16" rx="16" ry="4" fill="#b34700" />
          <ellipse cx="25" cy="15.5" rx="14" ry="3" fill="#cc5500" opacity="0.6" />
          {/* Handles */}
          <rect x="0" y="24" width="6" height="4" rx="2" fill="#888" />
          <rect x="44" y="24" width="6" height="4" rx="2" fill="#888" />
          {/* Steam */}
          <path d="M18 10 Q16 5 18 0" stroke="#ddd" strokeWidth="1.5" fill="none" opacity="0.5">
            <animate attributeName="d" values="M18 10 Q16 5 18 0;M18 10 Q20 5 18 0;M18 10 Q16 5 18 0" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M25 9 Q23 4 25 -1" stroke="#ddd" strokeWidth="1" fill="none" opacity="0.4">
            <animate attributeName="d" values="M25 9 Q23 4 25 -1;M25 9 Q27 4 25 -1;M25 9 Q23 4 25 -1" dur="2.3s" repeatCount="indefinite" />
          </path>
          <path d="M32 10 Q30 5 32 0" stroke="#ddd" strokeWidth="1.5" fill="none" opacity="0.5">
            <animate attributeName="d" values="M32 10 Q30 5 32 0;M32 10 Q34 5 32 0;M32 10 Q30 5 32 0" dur="2.5s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>

      {/* Spice jar on left wall */}
      <div className="absolute left-4 sm:left-8" style={{ top: '5%' }}>
        <svg width="45" height="55" viewBox="0 0 45 55">
          {/* Jar body */}
          <rect x="7" y="15" width="30" height="35" rx="4" fill="#c4956a" />
          <rect x="8" y="15" width="28" height="35" rx="3" fill="url(#jarGrad)" />
          <defs>
            <linearGradient id="jarGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#b8855a" />
              <stop offset="40%" stopColor="#d4a574" />
              <stop offset="100%" stopColor="#c4956a" />
            </linearGradient>
          </defs>
          {/* Lid */}
          <rect x="9" y="2" width="26" height="14" rx="3" fill="#d4a574" />
          <rect x="16" y="0" width="12" height="5" rx="2" fill="#c49060" />
          {/* Label */}
          <rect x="11" y="22" width="22" height="18" rx="2" fill="#f5e6c8" />
          <rect x="11" y="22" width="22" height="18" rx="2" fill="none" stroke="#d4a574" strokeWidth="0.5" />
          <text x="22" y="34" textAnchor="middle" fontSize="7" fill="#8B4513" fontWeight="bold">חזרת</text>
        </svg>
      </div>

      {/* Second shelf on left with small items */}
      <div className="absolute left-4 sm:left-8" style={{
        top: '22%',
        width: '80px',
        height: '6px',
        background: 'linear-gradient(180deg, #a07828 0%, #8B6914 50%, #6d5210 100%)',
        boxShadow: '0 3px 6px rgba(0,0,0,0.25)',
        borderRadius: '2px',
      }} />
      {/* Small bottle on second shelf */}
      <div className="absolute left-8 sm:left-12" style={{ top: '17%' }}>
        <svg width="20" height="30" viewBox="0 0 20 30">
          <rect x="3" y="8" width="14" height="20" rx="2" fill="#4a7c59" />
          <rect x="6" y="2" width="8" height="8" rx="1" fill="#5a9069" />
          <rect x="7" y="0" width="6" height="3" rx="1" fill="#8B6914" />
        </svg>
      </div>

      {/* Hanging utensils on wall (right side) */}
      <div className="absolute right-2 sm:right-4" style={{ top: '20%' }}>
        <svg width="30" height="60" viewBox="0 0 30 60">
          {/* Hook bar */}
          <rect x="0" y="0" width="30" height="3" rx="1" fill="#8B6914" />
          {/* Ladle */}
          <line x1="8" y1="3" x2="8" y2="25" stroke="#aaa" strokeWidth="2" />
          <ellipse cx="8" cy="30" rx="6" ry="5" fill="#999" />
          <ellipse cx="8" cy="29" rx="4" ry="3" fill="#777" />
          {/* Spatula */}
          <line x1="22" y1="3" x2="22" y2="22" stroke="#8B6914" strokeWidth="2" />
          <rect x="18" y="22" width="8" height="14" rx="2" fill="#a07828" />
        </svg>
      </div>
    </div>
  );
}

function FoodTray({ label, color, active, onClick, children }: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="relative cursor-pointer transition-transform active:scale-95"
      style={{ minWidth: '70px' }}
    >
      {/* Tray container */}
      <div className="relative" style={{
        background: `linear-gradient(180deg, ${color}22 0%, ${color}44 100%)`,
        border: active ? `3px solid ${color}` : '3px solid #8B6914',
        borderRadius: '8px',
        padding: '8px 6px',
        boxShadow: active
          ? `0 0 12px ${color}66, inset 0 2px 4px rgba(255,255,255,0.3)`
          : 'inset 0 2px 4px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.2)',
        minHeight: '65px',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="text-2xl leading-none mb-1">{children}</div>
        <div className="text-[10px] font-black" style={{ color: active ? color : '#6d5210' }}>{label}</div>
      </div>
      {/* Label flag */}
      {active && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-black text-white"
          style={{ background: color, boxShadow: `0 2px 4px ${color}44` }}>
          ✓
        </div>
      )}
    </button>
  );
}

function VerticalMeter({ value, maxValue, color, label }: {
  value: number;
  maxValue: number;
  color: string;
  label?: string;
}) {
  const pct = Math.round((value / maxValue) * 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-4 bg-gray-700 rounded-full overflow-hidden" style={{ height: '60px' }}>
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(180deg, ${color}ee 0%, ${color} 100%)`,
            boxShadow: `0 0 6px ${color}66`,
          }}
        />
      </div>
      {label && <span className="text-[9px] font-bold text-white/70">{label}</span>}
    </div>
  );
}

function CustomerCharacter({ customer, isMatch, onServe, plate }: {
  customer: Customer;
  isMatch: boolean;
  onServe: () => void;
  plate: Order;
}) {
  const isWaiting = customer.status === 'waiting';
  const isUrgent = isWaiting && customer.timeLeft <= 4;
  const isSatisfied = customer.status === 'satisfied';
  const isAnnoyed = customer.status === 'annoyed';

  return (
    <div className={`relative flex flex-col items-center transition-all duration-300 ${
      isAnnoyed ? 'opacity-60' : ''
    }`} style={{ width: '140px' }}>
      {/* Speech bubble */}
      <div className={`relative rounded-xl px-3 py-2 mb-2 text-right transition-all duration-300 ${
        isSatisfied ? 'bg-green-100 border-2 border-green-400' :
        isAnnoyed ? 'bg-red-100 border-2 border-red-400' :
        isUrgent ? 'bg-red-50 border-2 border-red-300' :
        isMatch ? 'bg-green-50 border-2 border-green-400' :
        'bg-white border-2 border-amber-200'
      }`} style={{
        boxShadow: isMatch ? '0 0 12px rgba(34,197,94,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
        minHeight: '70px',
      }}>
        {/* Name */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black" style={{ color: '#5c3d0e' }}>{customer.name}</span>
          {isMatch && <span className="text-green-500 text-xs font-black">✓</span>}
        </div>

        {/* Order badges */}
        <div className="flex gap-0.5 flex-wrap justify-end mb-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: '#fef3c7', color: '#92400e' }}>
            {customer.order.fish === 'half' ? '½' : customer.order.fish === 'full' ? '1' : '2'} קציצה
          </span>
          {customer.order.horseradish && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: '#dcfce7', color: '#166534' }}>חזרת</span>
          )}
          {customer.order.sauce && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: '#ffedd5', color: '#9a3412' }}>רוטב</span>
          )}
        </div>

        {/* Quote */}
        <p className="text-[9px] leading-tight italic" style={{ color: '#92400e' }}>
          &ldquo;{customer.orderText}&rdquo;
        </p>

        {/* Bubble triangle */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: isSatisfied ? '8px solid #bbf7d0' :
              isAnnoyed ? '8px solid #fecaca' :
              isMatch ? '8px solid #dcfce7' :
              '8px solid white',
          }} />
      </div>

      {/* Character emoji (large) */}
      <div className={`text-4xl leading-none transition-transform duration-300 ${
        isUrgent ? 'animate-bounce' : ''
      } ${isSatisfied ? 'scale-110' : ''}`}>
        {isSatisfied ? '😊' : isAnnoyed ? '😤' : customer.emoji}
      </div>

      {/* Timer + Patience bar */}
      {isWaiting && (
        <div className="flex items-center gap-1.5 mt-1">
          <div className="relative w-20 h-2.5 rounded-full overflow-hidden" style={{
            background: '#374151',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
          }}>
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${(customer.timeLeft / CUSTOMER_TIME) * 100}%`,
              background: customer.timeLeft <= 4
                ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'
                : customer.timeLeft <= 8
                  ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                  : 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)',
              boxShadow: customer.timeLeft <= 4 ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
            }} />
          </div>
          <span className={`text-[10px] font-black tabular-nums ${
            customer.timeLeft <= 4 ? 'text-red-400' : 'text-amber-300'
          }`}>
            {customer.timeLeft}
          </span>
        </div>
      )}

      {/* Serve button */}
      {isWaiting && (
        <button
          onClick={onServe}
          className={`mt-1.5 px-4 py-1.5 rounded-lg text-[11px] font-black text-white transition-all active:scale-90 cursor-pointer ${
            isMatch
              ? 'shadow-lg shadow-green-500/30'
              : ''
          }`}
          style={{
            background: isMatch
              ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
            boxShadow: isMatch
              ? '0 4px 12px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
              : '0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          הגש! 🍽️
        </button>
      )}

      {/* Status label for resolved */}
      {isSatisfied && (
        <div className="mt-1 text-[10px] font-black text-green-500 animate-bounce">מרוצה!</div>
      )}
      {isAnnoyed && (
        <div className="mt-1 text-[10px] font-black text-red-500">כועס!</div>
      )}
    </div>
  );
}

// Plate display for showing what's currently being prepared
function PlateDisplay({ plate }: { plate: Order }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {/* Plate SVG */}
      <svg width="50" height="35" viewBox="0 0 50 35">
        <ellipse cx="25" cy="28" rx="24" ry="7" fill="#d1d5db" />
        <ellipse cx="25" cy="26" rx="22" ry="6" fill="#e5e7eb" />
        <ellipse cx="25" cy="24" rx="18" ry="5" fill="#f3f4f6" />
        {/* Fish on plate */}
        {plate.fish !== 'none' && (
          <>
            <text x="14" y="26" fontSize="10">🐟</text>
            {(plate.fish === 'full' || plate.fish === 'double') && (
              <text x="24" y="26" fontSize="10">🐟</text>
            )}
            {plate.fish === 'double' && (
              <text x="34" y="22" fontSize="8">🐟</text>
            )}
          </>
        )}
      </svg>
      <div className="flex gap-1">
        {plate.fish === 'none' ? (
          <span className="text-[10px] italic" style={{ color: '#a18553' }}>צלחת ריקה</span>
        ) : (
          <>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
              style={{ background: '#fef3c7', color: '#92400e' }}>
              {FISH_OPTS.find(f => f.v === plate.fish)?.display}
            </span>
            {plate.horseradish && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: '#dcfce7', color: '#166534' }}>🌿</span>
            )}
            {plate.sauce && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: '#ffedd5', color: '#9a3412' }}>🍲</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function GefilteKingGame() {
  const [state, dispatch] = useReducer(reducer, INIT);
  const { phase, meter, customers, plate, score, gameTime, message, messageType } = state;
  const [highScore, setHighScore] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);

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

  const handleStart = useCallback(() => {
    dispatch({ type: 'START', now: Date.now() });
  }, []);

  const visible = customers.filter(
    c => c.status === 'waiting' || (c.resolvedAt && Date.now() - c.resolvedAt < 1500)
  );
  const meterColor = meter > 60 ? '#22c55e' : meter > 30 ? '#eab308' : '#ef4444';

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div dir="rtl" className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-10 left-10 text-6xl opacity-20 animate-pulse">🐟</div>
          <div className="absolute top-20 right-20 text-4xl opacity-15 animate-pulse" style={{ animationDelay: '1s' }}>👑</div>
          <div className="absolute bottom-20 left-20 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>🍽️</div>
          <div className="absolute bottom-40 right-10 text-3xl opacity-15 animate-pulse" style={{ animationDelay: '1.5s' }}>🌿</div>
        </div>

        {/* Parchment-style instruction card */}
        <div className="relative max-w-md w-full" style={{
          background: 'linear-gradient(145deg, #f5e6c8 0%, #e8d5a8 30%, #dcc89a 60%, #f0ddb8 100%)',
          borderRadius: '16px',
          border: '4px solid #8B6914',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
          padding: '28px 24px',
        }}>
          {/* Close/X button area (decorative) */}
          <div className="absolute top-3 left-3 w-6 h-6 flex items-center justify-center text-amber-700 font-bold text-sm">
            X
          </div>

          {/* Title */}
          <div className="text-center mb-5">
            <h1 className="text-3xl font-black mb-1" style={{ color: '#c41e1e', textShadow: '1px 1px 0 #ffd700' }}>
              הוראות
            </h1>
          </div>

          {/* Game description */}
          <div className="text-sm leading-relaxed space-y-3 mb-5" style={{ color: '#5c3d0e' }}>
            <p className="text-center font-bold" style={{ color: '#8B4513' }}>
              זו ההזדמנות שלך להיות מלך הגעפילטע! כל שעליך לעשות הוא להכין מנות געפילטע פיש עבור כל הלקוחות שלך.
            </p>

            <div className="space-y-2 text-[13px]">
              <p>
                <span className="font-black">🐟</span>{' '}
                קודם כל בחר את כמות הקציצות - חצי, שלמה, או שתיים. שים לב למה כל לקוח מבקש.
              </p>
              <p>
                <span className="font-black">🌿</span>{' '}
                הוסף חזרת אם הלקוח ביקש. החזרת חזקה - אל תוסיף אם לא צריך!
              </p>
              <p>
                <span className="font-black">🍲</span>{' '}
                הוסף רוטב לפי הבקשה. לא כולם אוהבים רוטב על הגעפילטע.
              </p>
              <p>
                <span className="font-black">🍽️</span>{' '}
                כשהצלחת מוכנה, לחץ &ldquo;הגש!&rdquo; על הלקוח הנכון.
              </p>
              <p>
                <span className="font-black">📊</span>{' '}
                שמור על ה&ldquo;שקט תעשייתי&rdquo; - אם הוא יורד לאפס, המשחק נגמר!
              </p>
            </div>

            <p className="text-center text-xs italic" style={{ color: '#a0782c' }}>
              לכל לקוח יש סבלנות מוגבלת. אם לא תגיש בזמן - הוא יעזוב בכעס!
            </p>
          </div>

          {highScore > 0 && (
            <div className="text-center mb-4 text-sm font-bold" style={{ color: '#8B4513' }}>
              השיא שלך: <span className="font-black text-lg" style={{ color: '#c41e1e' }}>{highScore}</span> נקודות
            </div>
          )}

          <p className="text-center text-sm font-black mb-4" style={{ color: '#5c3d0e' }}>
            אז מה אתה אומר? האם אתה ראוי לתואר הנכסף &ldquo;מלך הגעפילטע&rdquo;???
          </p>

          {/* Start button */}
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-xl text-xl font-black text-white transition-all active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
              boxShadow: '0 6px 20px rgba(217,119,6,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
              border: '2px solid #92400e',
            }}
          >
            נו, שיהיה... 🐟
          </button>
          <Link href="/" className="block text-center mt-3 text-sm font-medium" style={{ color: '#a0782c' }}>
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
      <div dir="rtl" className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}>
        {/* Parchment game over card */}
        <div className="relative max-w-sm w-full" style={{
          background: 'linear-gradient(145deg, #f5e6c8 0%, #e8d5a8 30%, #dcc89a 60%, #f0ddb8 100%)',
          borderRadius: '16px',
          border: '4px solid #8B6914',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.3)',
          padding: '28px 24px',
        }}>
          <div className="text-center">
            <div className="text-6xl mb-3">{score >= 500 ? '🏆' : '😤'}</div>
            <h1 className="text-2xl font-black mb-1" style={{ color: '#5c3d0e' }}>
              {meter <= 0 ? 'איבדת את השקט התעשייתי' : 'נגמר הזמן'}
            </h1>

            {/* Score display */}
            <div className="my-4 py-4 px-6 rounded-xl" style={{
              background: 'rgba(139,105,20,0.1)',
              border: '2px solid #8B691444',
            }}>
              <p className="text-sm mb-1" style={{ color: '#a0782c' }}>הניקוד שלך</p>
              <p className="text-5xl font-black" style={{ color: '#8B4513' }}>{score}</p>
              {isNewRecord && (
                <span className="inline-block mt-2 text-xs font-black px-3 py-1 rounded-full"
                  style={{ background: '#fbbf24', color: '#78350f' }}>
                  🎉 שיא חדש!
                </span>
              )}
              {!isNewRecord && highScore > 0 && (
                <p className="text-xs mt-1" style={{ color: '#a0782c' }}>שיא: {highScore}</p>
              )}
            </div>

            <p className="text-sm italic mb-6" style={{ color: '#8B4513' }}>{scoreMsg(score)}</p>

            <button
              onClick={handleStart}
              className="w-full py-4 rounded-xl text-lg font-black text-white transition-all active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
                boxShadow: '0 6px 20px rgba(217,119,6,0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
                border: '2px solid #92400e',
              }}
            >
              עוד פעם? (כי למה לא) 🐟
            </button>
            <Link href="/" className="block text-center mt-3 text-sm font-medium" style={{ color: '#a0782c' }}>
              ← חזרה לדף הבית
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: '#2d1f0e' }}>

      {/* Kitchen scene background */}
      <KitchenScene />

      {/* ── Top HUD bar ── */}
      <div className="relative z-10" style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 100%)',
        borderBottom: '3px solid #8B6914',
      }}>
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-black text-base text-amber-300" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              👑 מלך הגעפילטע
            </span>
            <div className="flex items-center gap-4">
              <span className="font-black text-amber-200 text-sm">⭐ {score}</span>
              <span className={`font-mono font-black text-lg tabular-nums ${
                gameTime <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
              }`}>
                ⏱ {fmt(gameTime)}
              </span>
            </div>
          </div>

          {/* Meter bar styled like falafel game */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 whitespace-nowrap">שקט תעשייתי</span>
            <div className="flex-1 rounded-full h-4 overflow-hidden" style={{
              background: '#1f2937',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
              border: '1px solid #374151',
            }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${meter}%`,
                  background: `linear-gradient(180deg, ${meterColor}ee 0%, ${meterColor} 100%)`,
                  boxShadow: `0 0 8px ${meterColor}44`,
                }}
              />
            </div>
            <span className="font-black text-xs tabular-nums" style={{ color: meterColor, minWidth: '30px', textAlign: 'left' }}>
              {meter}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Help button ── */}
      <button
        onClick={() => setShowInstructions(true)}
        className="absolute top-2 left-2 z-20 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black cursor-pointer"
        style={{
          background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
          border: '2px solid #92400e',
          color: '#5c3d0e',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        ?
      </button>

      {/* ── Instructions overlay ── */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="relative max-w-sm w-full" style={{
            background: 'linear-gradient(145deg, #f5e6c8 0%, #e8d5a8 30%, #dcc89a 60%, #f0ddb8 100%)',
            borderRadius: '16px',
            border: '4px solid #8B6914',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            padding: '24px 20px',
          }}>
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center font-black text-sm cursor-pointer"
              style={{
                background: '#c41e1e',
                color: 'white',
                border: '2px solid #991b1b',
              }}
            >
              X
            </button>
            <h2 className="text-xl font-black text-center mb-3" style={{ color: '#c41e1e' }}>הוראות</h2>
            <div className="space-y-2 text-[12px]" style={{ color: '#5c3d0e' }}>
              <p><span className="font-black">🐟</span> בחר כמות קציצות</p>
              <p><span className="font-black">🌿</span> הוסף חזרת אם ביקשו</p>
              <p><span className="font-black">🍲</span> הוסף רוטב אם ביקשו</p>
              <p><span className="font-black">🍽️</span> לחץ &ldquo;הגש!&rdquo; על הלקוח הנכון</p>
              <p><span className="font-black">📊</span> שמור על השקט תעשייתי!</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Message banner ── */}
      {message && (
        <div className="relative z-10 text-center py-2 px-4 text-sm font-black" style={{
          background: messageType === 'good'
            ? 'linear-gradient(180deg, rgba(34,197,94,0.9) 0%, rgba(22,163,74,0.9) 100%)'
            : messageType === 'bad'
              ? 'linear-gradient(180deg, rgba(239,68,68,0.9) 0%, rgba(220,38,38,0.9) 100%)'
              : 'linear-gradient(180deg, rgba(234,179,8,0.9) 0%, rgba(202,138,4,0.9) 100%)',
          color: 'white',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          borderBottom: '2px solid rgba(0,0,0,0.2)',
        }}>
          {message}
        </div>
      )}

      {/* ── Main game area ── */}
      <div className="flex-1 relative z-10 flex flex-col">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">

          {/* ── Customer area (top half - behind the counter) ── */}
          <div className="flex-1 flex items-end justify-center gap-3 px-4 pb-2 pt-4" style={{
            minHeight: '250px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.05) 100%)',
          }}>
            {Array.from({ length: MAX_CUSTOMERS }, (_, i) => {
              const c = visible[i];

              if (!c) {
                return (
                  <div
                    key={`slot-${i}`}
                    className="flex flex-col items-center justify-end"
                    style={{ width: '140px', minHeight: '180px' }}
                  >
                    <div className="text-3xl opacity-20 mb-4">🪑</div>
                    <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.15)' }}>פנוי</span>
                  </div>
                );
              }

              const isMatch = plate.fish !== 'none' && c.status === 'waiting' && plateMatchesOrder(plate, c.order);

              return (
                <CustomerCharacter
                  key={c.id}
                  customer={c}
                  isMatch={isMatch}
                  plate={plate}
                  onServe={() => dispatch({ type: 'SERVE', id: c.id, now: Date.now() })}
                />
              );
            })}
          </div>

          {/* ── Counter surface (thick wood with grain texture) ── */}
          <div className="relative" style={{
            height: '20px',
            background: `linear-gradient(180deg,
              #d4aa4c 0%,
              #c49a3c 10%,
              #b8892e 25%,
              #a07828 45%,
              #96702a 60%,
              #8B6914 75%,
              #7d5e12 90%,
              #6d5210 100%
            )`,
            boxShadow: '0 6px 16px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,215,0,0.15)',
          }}>
            {/* Wood grain lines */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                repeating-linear-gradient(
                  180deg,
                  transparent 0px,
                  transparent 2px,
                  rgba(90,55,10,0.1) 2px,
                  rgba(90,55,10,0.1) 3px,
                  transparent 3px,
                  transparent 6px
                )
              `,
            }} />
            {/* Subtle wood knot pattern */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                radial-gradient(ellipse 30px 8px at 20% 50%, rgba(90,55,10,0.08) 0%, transparent 100%),
                radial-gradient(ellipse 25px 6px at 60% 40%, rgba(90,55,10,0.06) 0%, transparent 100%),
                radial-gradient(ellipse 35px 10px at 85% 60%, rgba(90,55,10,0.07) 0%, transparent 100%)
              `,
            }} />
            {/* Front edge bevel */}
            <div className="absolute left-0 right-0 bottom-0" style={{
              height: '4px',
              background: 'linear-gradient(180deg, #6d5210 0%, #4a3508 100%)',
              borderTop: '1px solid rgba(255,215,0,0.08)',
            }} />
          </div>

          {/* ── Kitchen area (bottom) with tiled floor ── */}
          <div className="relative" style={{
            background: '#2d1f0e',
            borderTop: '1px solid #4a3518',
          }}>
            {/* Kitchen floor tiles pattern */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(45deg, rgba(58,42,18,0.6) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(58,42,18,0.6) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, rgba(58,42,18,0.6) 75%),
                linear-gradient(-45deg, transparent 75%, rgba(58,42,18,0.6) 75%)
              `,
              backgroundSize: '36px 36px',
              backgroundPosition: '0 0, 0 18px, 18px -18px, -18px 0px',
            }} />
            {/* Tile grout lines */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(0deg, rgba(0,0,0,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px)
              `,
              backgroundSize: '36px 36px',
            }} />
            {/* Subtle floor gradient overlay */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.1) 100%)',
            }} />
            <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">

              {/* Plate preview */}
              <div className="rounded-lg py-2 px-3" style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(139,105,20,0.3)',
              }}>
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-[10px] font-bold" style={{ color: '#a18553' }}>הצלחת שלך:</span>
                  <PlateDisplay plate={plate} />
                </div>
              </div>

              {/* Food trays row */}
              <div>
                <p className="text-[10px] font-bold mb-2 tracking-wide" style={{ color: '#a18553' }}>כמות קציצות</p>
                <div className="grid grid-cols-4 gap-2">
                  {FISH_OPTS.map(opt => (
                    <FoodTray
                      key={opt.v}
                      label={opt.label}
                      color={plate.fish === opt.v ? '#d97706' : '#8B6914'}
                      active={plate.fish === opt.v}
                      onClick={() => dispatch({ type: 'SET_FISH', fish: opt.v })}
                    >
                      {opt.display}
                    </FoodTray>
                  ))}
                </div>
              </div>

              {/* Extras trays */}
              <div>
                <p className="text-[10px] font-bold mb-2 tracking-wide" style={{ color: '#a18553' }}>תוספות</p>
                <div className="grid grid-cols-2 gap-3">
                  <FoodTray
                    label="חזרת"
                    color="#22c55e"
                    active={plate.horseradish}
                    onClick={() => dispatch({ type: 'TOGGLE', field: 'horseradish' })}
                  >
                    🌿
                  </FoodTray>
                  <FoodTray
                    label="רוטב"
                    color="#f97316"
                    active={plate.sauce}
                    onClick={() => dispatch({ type: 'TOGGLE', field: 'sauce' })}
                  >
                    🍲
                  </FoodTray>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
