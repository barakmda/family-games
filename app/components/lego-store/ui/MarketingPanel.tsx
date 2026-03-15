'use client';

import type { GameState, InfluencerType, LaunchType } from '../game/types';
import { INFLUENCERS, LAUNCHES, BALANCE } from '../game/constants';

interface MarketingPanelProps {
  state: GameState;
  onInfluencer: (id: InfluencerType) => void;
  onLaunch: (id: LaunchType) => void;
  onClose: () => void;
}

export default function MarketingPanel({ state, onInfluencer, onLaunch, onClose }: MarketingPanelProps) {
  const canStartInfluencer = !state.activeMarketing && state.marketingCooldown <= 0;
  const canStartLaunch = state.day - state.lastLaunchDay >= BALANCE.LAUNCH_COOLDOWN;

  return (
    <div className="absolute inset-x-0 bottom-12 max-h-[60vh] overflow-y-auto bg-white/95 backdrop-blur-md rounded-t-2xl shadow-2xl z-20" dir="rtl">
      <div className="sticky top-0 bg-white/95 px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-bold text-lg">📢 \u05E9\u05D9\u05D5\u05D5\u05E7</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">\u2715</button>
      </div>

      {/* Active marketing */}
      {state.activeMarketing && (
        <div className="mx-3 mt-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
          <div className="text-sm font-bold text-purple-800">\u05E4\u05E2\u05D9\u05DC \u05DB\u05E8\u05D2\u05E2</div>
          <div className="text-xs text-purple-600">
            \u05E0\u05D5\u05EA\u05E8\u05D5 {state.activeMarketing.daysRemaining} \u05D9\u05DE\u05D9\u05DD
          </div>
        </div>
      )}

      {/* Influencers */}
      <div className="p-3">
        <h3 className="font-bold text-sm mb-2">{'🎬 שת"פ עם משפיענים'}</h3>
        {!canStartInfluencer && !state.activeMarketing && (
          <p className="text-xs text-orange-600 mb-2">
            \u05E7\u05D5\u05DC\u05D3\u05D0\u05D5\u05DF: \u05E2\u05D5\u05D3 {state.marketingCooldown} \u05D9\u05DE\u05D9\u05DD
          </p>
        )}
        <div className="space-y-2">
          {INFLUENCERS.map(inf => {
            const canAfford = state.cash >= inf.cost;
            const hasRep = state.reputation >= inf.minReputation;
            const disabled = !canStartInfluencer || !canAfford || !hasRep;

            return (
              <button
                key={inf.id}
                onClick={() => onInfluencer(inf.id)}
                disabled={disabled}
                className="w-full flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-right"
              >
                <span className="text-2xl">{inf.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{inf.name}</div>
                  <div className="text-xs text-gray-500">
                    {inf.duration} \u05D9\u05DE\u05D9\u05DD | \u05DE\u05D5\u05E0\u05D9\u05D8\u05D9\u05DF {inf.minReputation}+
                  </div>
                </div>
                <div className="text-sm font-bold text-blue-600">\u20AA{inf.cost.toLocaleString()}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Launches */}
      <div className="p-3 border-t">
        <h3 className="font-bold text-sm mb-2">🎉 \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9 \u05D4\u05E9\u05E7\u05D4</h3>
        {!canStartLaunch && (
          <p className="text-xs text-orange-600 mb-2">
            \u05E7\u05D5\u05DC\u05D3\u05D0\u05D5\u05DF: \u05E2\u05D5\u05D3 {BALANCE.LAUNCH_COOLDOWN - (state.day - state.lastLaunchDay)} \u05D9\u05DE\u05D9\u05DD
          </p>
        )}
        <div className="space-y-2">
          {LAUNCHES.map(launch => {
            const canAfford = state.cash >= launch.cost;
            let meetsReq = true;
            if (launch.requirement === 'vipRoom') meetsReq = state.upgrades.includes('vipRoom');
            if (launch.requirement === 'playArea') meetsReq = state.upgrades.includes('playArea');
            if (launch.requirement === 'day20') meetsReq = state.day >= 20;
            const disabled = !canStartLaunch || !canAfford || !meetsReq;

            return (
              <button
                key={launch.id}
                onClick={() => onLaunch(launch.id)}
                disabled={disabled}
                className="w-full flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-right"
              >
                <span className="text-2xl">{launch.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{launch.name}</div>
                  <div className="text-xs text-gray-500">
                    {launch.duration} \u05D9\u05DE\u05D9\u05DD | {launch.requirement === 'inventory10' ? '\u05DE\u05DC\u05D0\u05D9 10+' : launch.requirement}
                  </div>
                </div>
                <div className="text-sm font-bold text-blue-600">\u20AA{launch.cost.toLocaleString()}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
