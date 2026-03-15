'use client';

import type { GameSpeed, ActivePanel } from '../game/types';

interface BottomBarProps {
  speed: GameSpeed;
  activePanel: ActivePanel;
  onSpeedChange: (speed: GameSpeed) => void;
  onPanelChange: (panel: ActivePanel) => void;
}

const speeds: { speed: GameSpeed; label: string }[] = [
  { speed: 0, label: '\u23F8\uFE0F' },
  { speed: 1, label: '\u25B6\uFE0F' },
  { speed: 2, label: '\u23E9' },
  { speed: 3, label: '\u23ED\uFE0F' },
];

const panels: { panel: ActivePanel; label: string; emoji: string }[] = [
  { panel: 'inventory', label: '\u05DE\u05DC\u05D0\u05D9', emoji: '📦' },
  { panel: 'staff', label: '\u05E6\u05D5\u05D5\u05EA', emoji: '👥' },
  { panel: 'marketing', label: '\u05E9\u05D9\u05D5\u05D5\u05E7', emoji: '📢' },
  { panel: 'upgrades', label: '\u05E9\u05D3\u05E8\u05D5\u05D2', emoji: '🔧' },
];

export default function BottomBar({ speed, activePanel, onSpeedChange, onPanelChange }: BottomBarProps) {
  return (
    <div className="flex items-center justify-between px-2 py-2 bg-gradient-to-l from-gray-900/90 via-gray-800/90 to-gray-900/90 text-white text-sm backdrop-blur-sm" dir="rtl">
      {/* Speed controls */}
      <div className="flex items-center gap-1">
        {speeds.map(s => (
          <button
            key={s.speed}
            onClick={() => onSpeedChange(s.speed)}
            className={`px-2 py-1 rounded text-base transition-all ${
              speed === s.speed
                ? 'bg-blue-600 scale-110'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Panel buttons */}
      <div className="flex items-center gap-1">
        {panels.map(p => (
          <button
            key={p.panel}
            onClick={() => onPanelChange(activePanel === p.panel ? 'none' : p.panel)}
            className={`px-2 py-1 rounded text-xs transition-all flex items-center gap-1 ${
              activePanel === p.panel
                ? 'bg-yellow-600 scale-105'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <span>{p.emoji}</span>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
