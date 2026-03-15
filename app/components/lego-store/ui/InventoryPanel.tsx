'use client';

import type { GameState, ProductCategory } from '../game/types';
import { PRODUCTS, PRODUCT_LIST } from '../game/constants';

interface InventoryPanelProps {
  state: GameState;
  onOrder: (category: ProductCategory, quantity: number) => void;
  onClose: () => void;
}

export default function InventoryPanel({ state, onOrder, onClose }: InventoryPanelProps) {
  return (
    <div className="absolute inset-x-0 bottom-12 max-h-[60vh] overflow-y-auto bg-white/95 backdrop-blur-md rounded-t-2xl shadow-2xl z-20" dir="rtl">
      <div className="sticky top-0 bg-white/95 px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-bold text-lg">📦 \u05E0\u05D9\u05D4\u05D5\u05DC \u05DE\u05DC\u05D0\u05D9</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">\u2715</button>
      </div>

      <div className="p-3 space-y-2">
        {PRODUCT_LIST.map(cat => {
          const product = PRODUCTS[cat];
          const inv = state.inventory[cat];
          const stockColor = inv.stock <= 0 ? 'text-red-600' : inv.stock <= 3 ? 'text-yellow-600' : 'text-green-600';

          return (
            <div key={cat} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
              <span className="text-2xl">{product.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{product.name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={`font-bold ${stockColor}`}>\u05DE\u05DC\u05D0\u05D9: {inv.stock}</span>
                  {inv.onOrder > 0 && (
                    <span className="text-blue-600">\u05D1\u05D3\u05E8\u05DA: +{inv.onOrder}</span>
                  )}
                  <span>\u05E0\u05DE\u05DB\u05E8\u05D5: {inv.totalSold}</span>
                </div>
                <div className="text-xs text-gray-400">
                  \u05E7\u05E0\u05D9\u05D9\u05D4: \u20AA{product.buyPrice} | \u05DE\u05DB\u05D9\u05E8\u05D4: \u20AA{product.sellPrice}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {[5, 10, 20].map(qty => (
                  <button
                    key={qty}
                    onClick={() => onOrder(cat, qty)}
                    disabled={state.cash < product.buyPrice * qty}
                    className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    +{qty}
                    <div className="text-[10px] opacity-80">\u20AA{(product.buyPrice * qty).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
