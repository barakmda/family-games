import type { GameItem, StageConfig } from './types';

// ─── Stage Configurations ───────────────────────────────────────────────────

export const STAGES: Record<number, StageConfig> = {
  1: {
    level: 1,
    name: 'חדר הילדים',
    duration: 45,
    spawnIntervalStart: 1400,
    spawnIntervalMin: 700,
    baseSpeed: 1.5,
    maxSpeed: 2.5,
    trapChance: 0.15,
    powerupChance: 0.08,
    zigzag: false,
    description: 'התחלה קלה. תפוס מה שאתה יכול.',
  },
  2: {
    level: 2,
    name: 'הסלון',
    duration: 40,
    spawnIntervalStart: 1100,
    spawnIntervalMin: 500,
    baseSpeed: 2.0,
    maxSpeed: 3.5,
    trapChance: 0.25,
    powerupChance: 0.1,
    zigzag: false,
    description: 'יותר מהר. יותר מלכודות. אמא מתקרבת.',
  },
  3: {
    level: 3,
    name: 'המרתף',
    duration: 35,
    spawnIntervalStart: 800,
    spawnIntervalMin: 350,
    baseSpeed: 2.5,
    maxSpeed: 4.5,
    trapChance: 0.3,
    powerupChance: 0.12,
    zigzag: true,
    description: 'הכל מהר. הכל מזגזג. אמא כמעט כאן.',
  },
};

// ─── Game Items ──────────────────────────────────────────────────────────────

export const TECHNIC_ITEMS: GameItem[] = [
  { id: 1, emoji: '🏎️', name: 'בוגאטי שירון', category: 'technic' },
  { id: 2, emoji: '🏍️', name: 'אופנוע דוקאטי', category: 'technic' },
  { id: 3, emoji: '✈️', name: 'מטוס כיבוי', category: 'technic' },
  { id: 4, emoji: '🚜', name: 'טרקטור ג׳ון דיר', category: 'technic' },
  { id: 5, emoji: '🏗️', name: 'מנוף ענק', category: 'technic' },
  { id: 6, emoji: '🚁', name: 'מסוק חילוץ', category: 'technic' },
  { id: 7, emoji: '🏁', name: 'מכונית פורמולה 1', category: 'technic' },
  { id: 8, emoji: '🚛', name: 'משאית וולוו', category: 'technic' },
  { id: 9, emoji: '⛏️', name: 'חופר קטרפילר', category: 'technic' },
  { id: 10, emoji: '🚗', name: 'פורד מוסטנג', category: 'technic' },
  { id: 11, emoji: '🏎️', name: 'למבורגיני סיאן', category: 'technic' },
  { id: 12, emoji: '🚙', name: "ג'יפ לנד רובר", category: 'technic' },
];

export const LOGICAL_ITEMS: GameItem[] = [
  { id: 20, emoji: '👶', name: 'התינוק', category: 'logical' },
  { id: 21, emoji: '💊', name: 'תרופות', category: 'logical' },
  { id: 22, emoji: '🔦', name: 'פנס', category: 'logical' },
  { id: 23, emoji: '📱', name: 'טלפון', category: 'logical' },
  { id: 24, emoji: '💧', name: 'בקבוק מים', category: 'logical' },
  { id: 25, emoji: '🐕', name: 'הכלב', category: 'logical' },
  { id: 26, emoji: '📄', name: 'תעודת זהות', category: 'logical' },
  { id: 27, emoji: '🧸', name: 'דובי של הקטנה', category: 'logical' },
  { id: 28, emoji: '🩹', name: 'ערכת עזרה ראשונה', category: 'logical' },
  { id: 29, emoji: '🔑', name: 'מפתחות הבית', category: 'logical' },
  { id: 30, emoji: '👵', name: 'סבתא', category: 'logical' },
  { id: 31, emoji: '🍼', name: 'בקבוק לתינוק', category: 'logical' },
];

export const TRAP_ITEMS: GameItem[] = [
  { id: 40, emoji: '🏰', name: 'לגו טירה (City)', category: 'trap' },
  { id: 41, emoji: '🧙', name: 'לגו הארי פוטר', category: 'trap' },
  { id: 42, emoji: '🌸', name: 'לגו פרחים (Friends)', category: 'trap' },
  { id: 43, emoji: '🏴‍☠️', name: 'לגו שודדי ים', category: 'trap' },
  { id: 44, emoji: '🦕', name: 'לגו דינוזאורים', category: 'trap' },
  { id: 45, emoji: '🌌', name: 'לגו סטאר וורז', category: 'trap' },
];

export const POWERUP_ITEMS: GameItem[] = [
  { id: 60, emoji: '🧲', name: 'מגנט', category: 'powerup', powerupType: 'magnet' },
  { id: 61, emoji: '⏱️', name: 'זמן נוסף', category: 'powerup', powerupType: 'clock' },
  { id: 62, emoji: '🛡️', name: 'מגן מאמא', category: 'powerup', powerupType: 'shield' },
  { id: 63, emoji: '🌟', name: 'ניקוד כפול', category: 'powerup', powerupType: 'double' },
];

export const ALL_GAME_ITEMS = [...TECHNIC_ITEMS, ...LOGICAL_ITEMS, ...TRAP_ITEMS];

// ─── Quotes ──────────────────────────────────────────────────────────────────

export const QUOTES = {
  grabTechnic: [
    'הבוגאטי שלי! שווה יותר מהדירה!',
    'עוד סט בטוח!',
    'טכניק = חיים!',
    'זה לא צעצוע, זה השקעה!',
    'אחלה! עוד אחד לאוסף!',
    'לא ישאר בחוץ!',
    'עוד סט! ועוד לא קניתי ביטוח!',
    'הגעפילטע? לא. טכניק? כן!',
  ],
  grabLogical: [
    'מה? אין לי מקום! יש פה מנוף!',
    'התינוק? יש לו אמא. לבוגאטי אין!',
    'סדר עדיפויות, אנשים!',
    'מה אני, רציונלי?!',
    'תרופות? בריא כשור. עוד טכניק!',
    'מה זה סדר עדיפויות? תגיד ללגו!',
    'אופס... רגע... לא, לא צריך.',
  ],
  grabTrap: [
    'הארי פוטר?! אני ברצינות?!',
    'זה לא טכניק! בושה!',
    'סטאר וורז?! מה אני, ילד?!',
    'רק טכניק! רק טכניק!',
    'City?! יש לי כבוד!',
  ],
  missTechnic: [
    'לאאאא! הטרקטור נשאר!',
    'נפל! לגו טכניק נפל!',
    'אני לא אסלח לעצמי!',
  ],
  powerup: [
    'פאוור-אפ! כמו בחלומות!',
    'עכשיו אני בלתי ניתן לעצירה!',
    'הכוח איתי!',
  ],
  win: [
    'שיא חדש! אמא תבין יום אחד.',
    'הצלתי את מה שחשוב באמת.',
    'כל הסטים בטוחים. אפשר לנשום.',
  ],
  specialGrandma: [
    '📞 סבתא: "חיים, אכלת? מה אכלת? כמה?"',
    '📞 סבתא: "שמעתי יש אזעקה. אכלת?"',
    '📞 סבתא: "מה אתה עושה? למה אתה נושם ככה?"',
  ],
  specialDad: [
    '🚶 אבא נכנס: "מה הרעש הזה?!"',
    '🚶 אבא: "חיים! למה הכל על הרצפה?!"',
  ],
  specialCat: [
    '🐈 החתול קפץ על המדף!',
    '🐈 מיטזי! לא! לא המדף!',
  ],
};

// ─── Game Balance ────────────────────────────────────────────────────────────

export const MAMA_MAX = 100;
export const MAMA_PER_LOGICAL = 15;
export const MAMA_PER_TRAP = 8;

export const SCORE_TECHNIC = 100;
export const SCORE_LOGICAL_PENALTY = -50;
export const SCORE_TRAP_PENALTY = -30;
export const SCORE_MISS_PENALTY = -20;
export const COMBO_BONUS_THRESHOLD = 3;
export const COMBO_BONUS = 50;
export const MEGA_COMBO_THRESHOLD = 5;
export const MEGA_COMBO_BONUS = 150;

export const POWERUP_DURATIONS: Record<string, number> = {
  magnet: 5,
  clock: 0, // instant
  shield: 8,
  double: 10,
};
export const CLOCK_BONUS_SECONDS = 10;

export const SPECIAL_EVENT_CHANCE = 0.003; // per frame
export const SPECIAL_EVENT_DURATION = 3; // seconds

export const ITEM_SIZE = 56; // min pixels for mobile touch
export const HIT_AREA_PADDING = 12; // extra pixels around item for tap

// ─── Visual ──────────────────────────────────────────────────────────────────

export const PARTICLE_COLORS = {
  technic: [0x22c55e, 0x4ade80, 0x86efac], // greens
  trap: [0xef4444, 0xf87171, 0xfca5a5],     // reds
  combo: [0xfbbf24, 0xf59e0b, 0xfde68a],    // golds
  powerup: [0xa78bfa, 0x8b5cf6, 0xc4b5fd],  // purples
  lego: [0xff0000, 0x0000ff, 0xffff00, 0x00ff00, 0xff8800], // lego colors
};

export const MAMA_FACES = ['😌', '😐', '😒', '😤', '😡', '🤬', '🤱'] as const;

export function getMamaFace(meter: number): string {
  const idx = Math.min(MAMA_FACES.length - 1, Math.floor((meter / MAMA_MAX) * (MAMA_FACES.length - 1)));
  return MAMA_FACES[idx];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
