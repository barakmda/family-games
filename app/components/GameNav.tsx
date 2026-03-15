'use client';

import Link from 'next/link';

export default function GameNav() {
  return (
    <nav
      dir="rtl"
      className="sticky top-0 z-50 bg-amber-900/95 backdrop-blur-sm border-b border-amber-700/50 px-4 py-2.5 safe-top"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-amber-200 hover:text-white transition-colors text-sm font-bold"
        >
          <span className="text-base">→</span>
          <span>חזרה לתפריט</span>
        </Link>
        <Link
          href="/"
          className="text-amber-400 hover:text-amber-200 transition-colors text-xs font-medium"
        >
          עדיין בממ&quot;ד? 👵
        </Link>
      </div>
    </nav>
  );
}
