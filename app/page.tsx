import Link from 'next/link';
import FooterMessage from '@/app/components/FooterMessage';

export default function HomePage() {
  return (
    <div dir="rtl" className="min-h-screen bg-amber-50 flex flex-col">
      {/* Header */}
      <header className="bg-amber-800 relative overflow-hidden">
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative text-white py-10 px-4 text-center">
          {/* Grandma with speech bubble */}
          <div className="inline-block relative mb-4">
            <div className="text-6xl select-none">👵</div>
            <div className="absolute -top-8 right-full ml-2 mr-2 bg-white text-amber-800 text-xs rounded-2xl rounded-bl-none px-3 py-1.5 font-bold whitespace-nowrap shadow-md">
              נו? מה אתם רוצים?
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight">עדיין בממ&quot;ד?</h1>
          <p className="text-amber-200 text-sm mt-2 font-medium">משחקי משפחה בטעם ביתי</p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-5 max-w-xl mx-auto w-full">

        {/* Games */}
        <h2 className="text-sm font-black text-amber-700 uppercase tracking-widest mb-3 mt-2">
          🎮 משחקים
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">

          {/* Gefilte King — active */}
          <Link
            href="/games/gefilte-king"
            className="group bg-white rounded-2xl border-2 border-amber-300 p-5 hover:border-amber-500 hover:shadow-xl hover:-translate-y-0.5 transition-all block relative"
          >
            <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
              חדש!
            </span>
            <div className="text-5xl mb-3">👑🐟</div>
            <h3 className="font-black text-amber-900 text-xl leading-tight">מלך הגעפילטע</h3>
            <p className="text-amber-600 text-sm mt-1 leading-relaxed">
              תשרת את המשפחה לפני שאוזלת הסבלנות
            </p>
            <div className="mt-4 flex items-center gap-2 text-amber-500 group-hover:text-amber-700 transition-colors">
              <span className="text-sm font-bold">שחק עכשיו</span>
              <span className="text-base">←</span>
            </div>
          </Link>

          {/* Mamad Maze — active */}
          <Link
            href="/games/mamad-maze"
            className="group bg-stone-800 rounded-2xl border-2 border-stone-600 p-5 hover:border-red-500 hover:shadow-xl hover:-translate-y-0.5 transition-all block relative"
          >
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              🚨 חדש!
            </span>
            <div className="text-5xl mb-3">🚽🏃‍♀️🛡️</div>
            <h3 className="font-black text-white text-xl leading-tight">המבוך לממ&quot;ד</h3>
            <p className="text-stone-400 text-sm mt-1 leading-relaxed">
              יש אזעקה. מיכל בשירותים. יש לך 90 שניות.
            </p>
            <div className="mt-4 flex items-center gap-2 text-red-400 group-hover:text-red-300 transition-colors">
              <span className="text-sm font-bold">שחק עכשיו</span>
              <span className="text-base">←</span>
            </div>
          </Link>

          {/* Mamad Maze Pro — active */}
          <Link
            href="/games/mamad-maze-pro"
            className="group bg-slate-950 rounded-2xl border-2 border-purple-600 p-5 hover:border-purple-400 hover:shadow-xl hover:-translate-y-0.5 transition-all block relative"
          >
            <span className="absolute top-3 left-3 bg-purple-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              🌑 חדש!
            </span>
            <div className="text-5xl mb-3">🔦🌑👧</div>
            <h3 className="font-black text-white text-xl leading-tight">מבוך החושך</h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              מבוכים פרוצדורליים, תאורה דינמית, אויבים, פאוור-אפים
            </p>
            <div className="mt-4 flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors">
              <span className="text-sm font-bold">שחק עכשיו</span>
              <span className="text-base">←</span>
            </div>
          </Link>

          {/* Lego Rescue — active */}
          <Link
            href="/games/lego-rescue"
            className="group bg-blue-900 rounded-2xl border-2 border-blue-600 p-5 hover:border-yellow-400 hover:shadow-xl hover:-translate-y-0.5 transition-all block relative"
          >
            <span className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              🧱 חדש!
            </span>
            <div className="text-5xl mb-3">🏎️🧱🤱</div>
            <h3 className="font-black text-white text-xl leading-tight">חיים מציל את הלגו</h3>
            <p className="text-blue-300 text-sm mt-1 leading-relaxed">
              יש אזעקה! תפוס כמה שיותר לגו טכניק לפני שאמא תופסת
            </p>
            <div className="mt-4 flex items-center gap-2 text-yellow-400 group-hover:text-yellow-300 transition-colors">
              <span className="text-sm font-bold">שחק עכשיו</span>
              <span className="text-base">←</span>
            </div>
          </Link>
        </div>

        {/* AI Studio */}
        <h2 className="text-sm font-black text-amber-700 uppercase tracking-widest mb-3">
          🎨 סטודיו יצירה
        </h2>
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 opacity-60 select-none">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🖼️🤖</div>
            <div>
              <h3 className="font-black text-amber-900 text-lg">מעבדת AI</h3>
              <p className="text-amber-600 text-sm mt-0.5">מצא את ההבדלים · חפש את הפרצוף</p>
              <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-400 px-3 py-1 rounded-full font-medium">
                בקרוב...
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-amber-900 text-amber-300 text-center py-5 px-6 text-sm font-medium">
        <FooterMessage />
      </footer>
    </div>
  );
}
