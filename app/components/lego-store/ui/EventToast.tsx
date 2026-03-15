'use client';

import type { Toast } from '../game/types';

interface EventToastProps {
  toasts: Toast[];
}

const typeColors: Record<Toast['type'], string> = {
  info: 'bg-blue-600',
  warning: 'bg-yellow-600',
  success: 'bg-green-600',
  danger: 'bg-red-600',
};

export default function EventToast({ toasts }: EventToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-1 w-[90%] max-w-sm" dir="rtl">
      {toasts.map((toast, i) => (
        <div
          key={i}
          className={`${typeColors[toast.type]} text-white px-3 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-[fadeInUp_0.3s_ease-out]`}
          style={{ opacity: Math.min(1, toast.timeLeft / 2) }}
        >
          <span className="text-lg">{toast.emoji}</span>
          <span className="flex-1">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
