import Link from 'next/link';
import FooterMessage from '@/app/components/FooterMessage';

const GAMES = [
  {
    href: '/games/gefilte-king',
    emoji: '👑🐟',
    title: 'מלך הגעפילטע',
    description: 'תשרת את המשפחה לפני שהסבלנות שלהם נגמרת. כמו חג פסח אמיתי.',
    quip: '״מה זה ׳אין חריין׳? זה לא ׳אין׳, זה ׳עוד לא הביאו׳.״',
    badge: 'קלאסיקה',
    badgeColor: 'bg-amber-600 text-white',
    cardBg: 'bg-gradient-to-br from-amber-50 to-amber-100',
    borderColor: 'border-amber-300 hover:border-amber-500',
    accentColor: 'text-amber-700',
    buttonColor: 'text-amber-600 group-hover:text-amber-800',
  },
  {
    href: '/games/mamad-maze',
    emoji: '🚽🏃‍♀️🛡️',
    title: 'המבוך לממ"ד',
    description: 'יש אזעקה. מיכל בשירותים. יש לך 90 שניות להציל אותה.',
    quip: '״מיכל, הצבע אדום! — ״רגע, אני באמצע משהו!״',
    badge: 'הכי משוחק',
    badgeColor: 'bg-red-600 text-white',
    cardBg: 'bg-gradient-to-br from-stone-800 to-stone-900',
    borderColor: 'border-stone-600 hover:border-red-500',
    accentColor: 'text-stone-300',
    buttonColor: 'text-red-400 group-hover:text-red-300',
    dark: true,
  },
  {
    href: '/games/mamad-maze-pro',
    emoji: '🔦🌑👧',
    title: 'מבוך החושך',
    description: 'מבוכים פרוצדורליים, תאורה דינמית, אויבים ופאוור-אפים.',
    quip: '״למה בחושך? כי חשמל עולה כסף.״',
    badge: 'למתקדמים',
    badgeColor: 'bg-purple-600 text-white',
    cardBg: 'bg-gradient-to-br from-slate-900 to-purple-950',
    borderColor: 'border-purple-700 hover:border-purple-400',
    accentColor: 'text-slate-400',
    buttonColor: 'text-purple-400 group-hover:text-purple-300',
    dark: true,
  },
  {
    href: '/games/lego-rescue',
    emoji: '🏎️🧱🤱',
    title: 'חיים מציל את הלגו',
    description: 'יש אזעקה! תפוס כמה שיותר לגו טכניק לפני שאמא תופסת.',
    quip: '״מה זה ׳צעצוע׳? זה השקעה! תפסיק להגיד ׳צעצוע׳.״',
    badge: 'חדש!',
    badgeColor: 'bg-yellow-400 text-yellow-900',
    cardBg: 'bg-gradient-to-br from-blue-900 to-blue-950',
    borderColor: 'border-blue-600 hover:border-yellow-400',
    accentColor: 'text-blue-300',
    buttonColor: 'text-yellow-400 group-hover:text-yellow-300',
    dark: true,
  },
];

const GRANDMA_GREETINGS = [
  'נו? מה אתם רוצים?',
  'שוב באתם? יופי.',
  'אכלתם? לא? אז למה באתם?',
  'כולם פה? מישהו חסר? תספרו.',
];

export default function HomePage() {
  // Pick a greeting deterministically based on the day
  const greeting = GRANDMA_GREETINGS[0];

  return (
    <div dir="rtl" className="min-h-screen bg-amber-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-amber-900 via-amber-800 to-amber-800 relative overflow-hidden">
        {/* Decorative pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-amber-500/20 rounded-full blur-3xl" />

        <div className="relative text-white py-8 sm:py-12 px-4 text-center">
          {/* Grandma with speech bubble */}
          <div className="inline-block relative mb-3">
            <div className="text-7xl sm:text-8xl select-none animate-float drop-shadow-lg">👵</div>
            <div className="absolute -top-9 sm:-top-10 right-full mr-1 bg-white text-amber-900 text-xs sm:text-sm rounded-2xl rounded-bl-none px-3 py-1.5 font-bold whitespace-nowrap shadow-lg animate-wiggle">
              {greeting}
            </div>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-sm">
            עדיין בממ&quot;ד?
          </h1>
          <p className="text-amber-300 text-sm sm:text-base mt-2 font-medium max-w-xs mx-auto leading-relaxed">
            משחקי משפחה בטעם ביתי — עם הומור אשכנזי מקורי
          </p>

          {/* Stats bar */}
          <div className="flex justify-center gap-6 mt-5 text-amber-400/80 text-xs sm:text-sm font-medium">
            <span>4 משחקים</span>
            <span className="text-amber-600">|</span>
            <span>0 שקל</span>
            <span className="text-amber-600">|</span>
            <span>100% גילטי פלאז׳ר</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 sm:px-5 py-6 max-w-2xl mx-auto w-full">

        {/* Section label */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-black text-amber-800 uppercase tracking-widest">
            משחקים
          </h2>
          <div className="flex-1 h-px bg-amber-200" />
        </div>

        {/* Game cards — 1 col mobile, 2 col tablet+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-8">
          {GAMES.map((game, i) => (
            <Link
              key={game.href}
              href={game.href}
              className={`group relative overflow-hidden rounded-2xl border-2 ${game.borderColor} ${game.cardBg} p-5 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 block card-shine animate-fade-in-up stagger-${i + 1}`}
            >
              {/* Badge */}
              <span className={`absolute top-3 left-3 ${game.badgeColor} text-xs font-black px-2.5 py-1 rounded-full shadow-sm`}>
                {game.badge}
              </span>

              {/* Emoji row */}
              <div className="text-4xl sm:text-5xl mb-3 select-none">{game.emoji}</div>

              {/* Title */}
              <h3 className={`font-black text-xl sm:text-[1.35rem] leading-tight ${game.dark ? 'text-white' : 'text-amber-900'}`}>
                {game.title}
              </h3>

              {/* Description */}
              <p className={`text-sm mt-1.5 leading-relaxed ${game.accentColor}`}>
                {game.description}
              </p>

              {/* Funny quote */}
              <p className={`text-xs mt-3 italic leading-relaxed ${game.dark ? 'text-stone-500' : 'text-amber-500'}`}>
                {game.quip}
              </p>

              {/* Play button */}
              <div className={`mt-4 flex items-center gap-2 ${game.buttonColor} transition-colors`}>
                <span className="text-sm font-bold">שחק עכשיו</span>
                <span className="text-base group-hover:-translate-x-1 transition-transform">←</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Coming soon section */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-black text-amber-800 uppercase tracking-widest">
            בקרוב
          </h2>
          <div className="flex-1 h-px bg-amber-200" />
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-amber-100 p-5 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="text-4xl sm:text-5xl select-none">🖼️🤖</div>
            <div className="flex-1">
              <h3 className="font-black text-amber-900 text-lg">מעבדת AI</h3>
              <p className="text-amber-600 text-sm mt-0.5">מצא את ההבדלים · חפש את הפרצוף</p>
              <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-500 px-3 py-1 rounded-full font-bold">
                בקרוב...
              </span>
            </div>
          </div>
          <p className="relative text-xs text-amber-400 italic mt-3">
            ״כשהבינה המלאכותית תחליף את סבתא, אז נדבר. עד אז — אני כאן.״
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-t from-amber-950 to-amber-900 text-amber-400 text-center py-5 px-6 text-sm font-medium safe-bottom">
        <div className="max-w-xl mx-auto">
          <FooterMessage />
          <div className="mt-3 text-amber-700 text-xs">
            משחקי משפחה בטעם ביתי · נבנה באהבה (ובלחץ)
          </div>
        </div>
      </footer>
    </div>
  );
}
