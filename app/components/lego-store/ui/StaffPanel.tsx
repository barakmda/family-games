'use client';

import type { GameState, StaffRole } from '../game/types';
import { STAFF_ROLES, BALANCE } from '../game/constants';

interface StaffPanelProps {
  state: GameState;
  onHire: (role: StaffRole) => void;
  onFire: (staffId: number) => void;
  onClose: () => void;
}

const ROLES: StaffRole[] = ['salesperson', 'cashier', 'stockWorker', 'shiftManager'];

export default function StaffPanel({ state, onHire, onFire, onClose }: StaffPanelProps) {
  const maxStaff = BALANCE.MAX_STAFF(state.storeLevel);

  return (
    <div className="absolute inset-x-0 bottom-12 max-h-[60vh] overflow-y-auto bg-white/95 backdrop-blur-md rounded-t-2xl shadow-2xl z-20" dir="rtl">
      <div className="sticky top-0 bg-white/95 px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-bold text-lg">👥 \u05E0\u05D9\u05D4\u05D5\u05DC \u05E6\u05D5\u05D5\u05EA ({state.staff.length}/{maxStaff})</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">\u2715</button>
      </div>

      {/* Current staff */}
      <div className="p-3 space-y-2">
        {state.staff.length === 0 && (
          <p className="text-center text-gray-400 py-4">\u05D0\u05D9\u05DF \u05E2\u05D5\u05D1\u05D3\u05D9\u05DD</p>
        )}
        {state.staff.map(s => {
          const roleDef = STAFF_ROLES[s.role];
          const moraleColor = s.morale >= 60 ? 'bg-green-500' : s.morale >= 30 ? 'bg-yellow-500' : 'bg-red-500';

          return (
            <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
              <span className="text-2xl">{roleDef.emoji}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{s.name} <span className="text-gray-400">({roleDef.name})</span></div>
                <div className="flex items-center gap-2 text-xs">
                  <span>\u05DE\u05E9\u05DB\u05D5\u05E8\u05EA: \u20AA{roleDef.salary}/\u05D9\u05D5\u05DD</span>
                  {s.isTraining && <span className="text-orange-600 font-bold">\u05D1\u05D4\u05DB\u05E9\u05E8\u05D4</span>}
                </div>
                {/* Morale bar */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-500">\u05DE\u05D5\u05E8\u05DC:</span>
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${moraleColor} transition-all`} style={{ width: `${s.morale}%` }} />
                  </div>
                  <span className="text-xs">{s.morale}</span>
                </div>
              </div>
              <button
                onClick={() => onFire(s.id)}
                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
              >
                \u05E4\u05D9\u05D8\u05D5\u05E8\u05D9\u05DD
              </button>
            </div>
          );
        })}
      </div>

      {/* Hire section */}
      {state.staff.length < maxStaff && (
        <div className="p-3 border-t">
          <h3 className="font-bold text-sm mb-2">\u05D2\u05D9\u05D5\u05E1 \u05E2\u05D5\u05D1\u05D3/\u05EA \u05D7\u05D3\u05E9/\u05D4</h3>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(role => {
              const def = STAFF_ROLES[role];
              return (
                <button
                  key={role}
                  onClick={() => onHire(role)}
                  disabled={state.cash < def.hireCost}
                  className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-right"
                >
                  <span className="text-xl">{def.emoji}</span>
                  <div>
                    <div className="text-xs font-medium">{def.name}</div>
                    <div className="text-[10px] text-gray-500">\u20AA{def.hireCost} \u05D2\u05D9\u05D5\u05E1 + \u20AA{def.salary}/\u05D9\u05D5\u05DD</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
