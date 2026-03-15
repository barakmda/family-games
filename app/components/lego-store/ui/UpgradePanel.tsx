'use client';

import type { GameState } from '../game/types';
import { UPGRADES } from '../game/constants';

interface UpgradePanelProps {
  state: GameState;
  onPurchase: (upgradeId: string) => void;
  onClose: () => void;
}

export default function UpgradePanel({ state, onPurchase, onClose }: UpgradePanelProps) {
  return (
    <div className="absolute inset-x-0 bottom-12 max-h-[60vh] overflow-y-auto bg-white/95 backdrop-blur-md rounded-t-2xl shadow-2xl z-20" dir="rtl">
      <div className="sticky top-0 bg-white/95 px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-bold text-lg">🔧 \u05E9\u05D3\u05E8\u05D5\u05D2\u05D9 \u05D7\u05E0\u05D5\u05EA</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">\u2715</button>
      </div>

      <div className="p-3 space-y-2">
        {UPGRADES.map(upgrade => {
          const owned = state.upgrades.includes(upgrade.id);
          const canAfford = state.cash >= upgrade.cost;
          const dayReq = state.day >= upgrade.minDay;
          const disabled = owned || !canAfford || !dayReq;

          return (
            <div key={upgrade.id} className={`flex items-center gap-3 p-3 rounded-lg transition ${owned ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
              <span className="text-2xl">{upgrade.emoji}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {upgrade.name}
                  {owned && <span className="text-green-600 mr-2">\u2713 \u05E0\u05E8\u05DB\u05E9</span>}
                </div>
                <div className="text-xs text-gray-600">{upgrade.effect}</div>
                {!dayReq && (
                  <div className="text-xs text-orange-600">\u05E0\u05D3\u05E8\u05E9 \u05DE\u05D9\u05D5\u05DD {upgrade.minDay}</div>
                )}
                {upgrade.recurringCost > 0 && (
                  <div className="text-xs text-gray-400">\u05E2\u05DC\u05D5\u05EA \u05E9\u05D1\u05D5\u05E2\u05D9\u05EA: \u20AA{upgrade.recurringCost.toLocaleString()}</div>
                )}
              </div>
              {!owned && (
                <button
                  onClick={() => onPurchase(upgrade.id)}
                  disabled={disabled}
                  className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-bold"
                >
                  \u20AA{upgrade.cost.toLocaleString()}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
