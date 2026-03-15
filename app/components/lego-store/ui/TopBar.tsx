'use client';

import type { GameState } from '../game/types';
import { TIME_OF_DAY_NAMES } from '../game/constants';

interface TopBarProps {
  state: GameState;
}

export default function TopBar({ state }: TopBarProps) {
  const stars = Math.ceil(state.reputation / 20);
  const starDisplay = '\u2B50'.repeat(stars) + '\u2606'.repeat(5 - stars);

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-l from-blue-900/90 via-blue-800/90 to-blue-900/90 text-white text-sm backdrop-blur-sm" dir="rtl">
      <div className="flex items-center gap-3">
        <span className="font-bold">📅 \u05D9\u05D5\u05DD {state.day}</span>
        <span className="text-xs opacity-80">{TIME_OF_DAY_NAMES[state.timeOfDay]}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className={`font-mono font-bold ${state.cash < 0 ? 'text-red-400' : 'text-green-300'}`}>
          💰 \u20AA{state.cash.toLocaleString()}
        </span>
        <span className="text-xs">{starDisplay}</span>
      </div>

      {/* Active events indicator */}
      {state.activeEvents.length > 0 && (
        <div className="flex items-center gap-1">
          {state.activeEvents.map((ae, i) => (
            <span key={i} className="text-xs" title={ae.event.name}>
              {ae.event.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Milestones */}
      <div className="flex items-center gap-1 text-xs">
        {state.milestones.bronze && <span>🥉</span>}
        {state.milestones.silver && <span>🥈</span>}
        {state.milestones.gold && <span>🥇</span>}
      </div>
    </div>
  );
}
