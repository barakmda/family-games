'use client';

import type { GameState } from '../game/types';

interface DaySummaryProps {
  state: GameState;
  onContinue: () => void;
}

export default function DaySummary({ state, onContinue }: DaySummaryProps) {
  const summary = state.dailySummaries[state.dailySummaries.length - 1];
  if (!summary) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 text-center" dir="rtl">
          <p>\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD</p>
          <button onClick={onContinue} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">\u05D4\u05DE\u05E9\u05DA</button>
        </div>
      </div>
    );
  }

  const profitColor = summary.profit >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-[fadeInUp_0.3s_ease-out]" dir="rtl">
        <h2 className="text-xl font-bold text-center mb-4">📊 \u05E1\u05D9\u05DB\u05D5\u05DD \u05D9\u05D5\u05DD {summary.day}</h2>

        <div className="space-y-2">
          <SummaryRow label="\u05D4\u05DB\u05E0\u05E1\u05D5\u05EA" value={`\u20AA${summary.revenue.toLocaleString()}`} color="text-green-600" emoji="💵" />
          <SummaryRow label="\u05D4\u05D5\u05E6\u05D0\u05D5\u05EA" value={`\u20AA${summary.expenses.toLocaleString()}`} color="text-red-600" emoji="💸" />

          <div className="border-t pt-2">
            <SummaryRow label="\u05E8\u05D5\u05D5\u05D7" value={`\u20AA${summary.profit.toLocaleString()}`} color={profitColor} emoji={summary.profit >= 0 ? '💰' : '📉'} bold />
          </div>

          <div className="border-t pt-2 space-y-1">
            <SummaryRow label="\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05E9\u05E8\u05D5\u05EA\u05D5" value={String(summary.customersServed)} color="text-blue-600" emoji="😊" />
            <SummaryRow label="\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05D0\u05D1\u05D5\u05D3\u05D9\u05DD" value={String(summary.customersLost)} color="text-orange-600" emoji="😔" />
            <SummaryRow label="\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05E0\u05DE\u05DB\u05E8\u05D5" value={String(summary.itemsSold)} color="text-purple-600" emoji="🛒" />
          </div>

          <div className="border-t pt-2">
            <SummaryRow
              label="\u05DE\u05D5\u05E0\u05D9\u05D8\u05D9\u05DF"
              value={`${summary.reputationChange >= 0 ? '+' : ''}${summary.reputationChange}`}
              color={summary.reputationChange >= 0 ? 'text-green-600' : 'text-red-600'}
              emoji="\u2B50"
            />
          </div>

          {summary.events.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-xs text-gray-500 mb-1">\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD:</div>
              {summary.events.map((e, i) => (
                <div key={i} className="text-xs text-gray-700">{e}</div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          \u05D9\u05EA\u05E8\u05EA \u05DE\u05D6\u05D5\u05DE\u05DF: \u20AA{state.cash.toLocaleString()}
        </div>

        <button
          onClick={onContinue}
          className="w-full mt-4 py-3 bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition shadow-lg"
        >
          \u05D4\u05DE\u05E9\u05DA \u05DC\u05D9\u05D5\u05DD {state.day} \u27A1
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, color, emoji, bold }: { label: string; value: string; color: string; emoji: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? 'font-bold text-base' : ''}`}>
      <span className="text-gray-600">{emoji} {label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
