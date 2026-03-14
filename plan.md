# שדרוג משמעותי למשחק "חיים מציל את הלגו"

## מצב נוכחי — ניתוח
המשחק כיום הוא **DOM-based falling items game** (~790 שורות):
- פריטים נופלים כ-`<button>` אלמנטים עם `position: absolute` ו-`%` coordinates
- אנימציות דרך `requestAnimationFrame` שמעדכן React state כל פריים
- אודיו בסיסי דרך Web Audio API (ללא ספרייה)
- אין particle effects, אין אנימציות פיזיקליות
- מובייל: touchAction: manipulation בלבד, אין gesture support אמיתי
- גרפיקה: אימוג'ים בלבד, ללא sprites/textures

### בעיות עיקריות
1. **ביצועים**: 15-20+ DOM elements מתעדכנים כל פריים → jank במובייל
2. **מובייל**: אין swipe, אין haptic feedback, כפתורים קטנים מדי
3. **גרפיקה**: אימוג'ים בלבד — אין פרטיקלים, אין אפקטים, אין עומק ויזואלי
4. **גיימפליי**: חד-ממדי — רק לחיצה על פריטים נופלים

---

## מנוע גרפי: PixiJS 8 + @pixi/react

### למה PixiJS?
- **WebGL accelerated** — חומרה גרפית, ביצועים של 60fps גם עם מאות אובייקטים
- **@pixi/react v8** — אינטגרציה first-party עם React 19 (שלנו: 19.2.3)
- **קל** — ~200KB, לא צריך מנוע משחקים מלא
- **Particle system** — ניתן להוסיף פרטיקלים (ניצוצות, פיצוצים, עשן)
- **Sprite sheets** — אנימציות חלקות לדמויות ופריטים

### Dependencies להתקנה
```bash
npm install pixi.js @pixi/react
```

---

## ארכיטקטורה חדשה

### מבנה קבצים
```
app/components/lego-rescue/
├── LegoRescueGame.tsx          # Main component — phases, UI overlay (React DOM)
├── LegoGameCanvas.tsx          # PixiJS canvas — כל הגרפיקה בפנים
├── game/
│   ├── constants.ts            # Game data, items, quotes, tuning
│   ├── types.ts                # TypeScript interfaces
│   ├── audio.ts                # Web Audio sound effects (existing, cleaned up)
│   ├── useGameLoop.ts          # Custom hook — game tick logic
│   └── physics.ts              # Simple falling physics + collision
```

### הפרדת אחריות
1. **React DOM** = UI שכבה עליונה (HUD, mama meter, quotes, intro/gameover screens)
2. **PixiJS Canvas** = כל מה שזז — פריטים נופלים, שחקן, פרטיקלים, רקע
3. **Custom hook** = לוגיקת game loop נפרדת מ-render

---

## שדרוגים מפורטים

### 1. גרפיקה (PixiJS Canvas)

#### רקע דינמי
- **Parallax scrolling** — 3 שכבות רקע (עיר/בניינים/עננים) שזזות במהירויות שונות
- חדר ילדים ברקע עם מדפי לגו (sprites סטטיים)
- תאורה דינמית — אדום מהבהב כשהאזעקה פועלת

#### פריטים נופלים — Sprites במקום אימוג'ים
- כל פריט = **AnimatedSprite** עם סיבוב קל ו-bobbing effect
- **גודל דינמי** — פריטים מתגדלים ככל שיורדים (פרספקטיבה)
- **Trail effect** — זנב צבעוני מאחורי פריטי טכניק (ירוק)
- **Glow effect** — הילה סביב פריטי טכניק שמשתנה לפי combo

#### דמות חיים
- **Animated character** בתחתית המסך — idle animation, walk animation
- זז שמאלה/ימינה עם **swipe** או **tilt** (accelerometer)
- אנימציית catch — ידיים למעלה כשתופס
- אנימציית facepalm — כשתופס דבר הגיוני

#### Particle Effects
- **פיצוץ ירוק** כשתופסים טכניק
- **עשן אדום** כשתופסים מלכודת
- **קונפטי** כש-combo >= 5
- **ניצוצות** מסביב לטיימר כשנגמר הזמן
- **Game over explosion** — פרטיקלים של לגו עפים לכל הכיוונים

### 2. מובייל — First Class

#### שליטה בדמות
- **Swipe/Drag** — חיים זז לנקודה שהאצבע נוגעת (touch position → character X)
- **Accelerometer** (אופציונלי) — הטיית הטלפון מזיזה את חיים
- **Tap on item** — נשאר כמו היום, אבל עם **hit area גדול יותר** (44px minimum)

#### התאמה ויזואלית
- **Safe areas** — padding לnotch ו-home indicator
- **Landscape lock** — אם רוחב > גובה, מציגים הודעה לסובב
- **גודל פריטים דינמי** — מתאים לגודל מסך (min 56px)
- **HUD מותאם** — sticky top עם backdrop-blur, לא חוסם משחק

#### Touch UX
- **Haptic feedback** (navigator.vibrate) — רטט קצר בתפיסה, רטט ארוך בטעות
- **Visual feedback** — ripple effect בנגיעה
- **No accidental scrolls** — touch-action: none על canvas

### 3. גיימפליי חדש

#### מערכת חיים/שלבים
- **3 שלבים** (Easy → Medium → Hard) במקום משחק אחד של 30 שניות
  - שלב 1: 45 שניות, פריטים איטיים, פחות מלכודות
  - שלב 2: 40 שניות, מהירות בינונית, פריטים הגיוניים קופצים הצידה
  - שלב 3: 35 שניות, מהיר, פריטים מזגזגים, "אמא מתקרבת"

#### Power-ups (פריטים מיוחדים נופלים)
- **🧲 מגנט** — כל הטכניק עף לחיים למשך 5 שניות
- **⏱️ שעון** — +10 שניות
- **🛡️ מגן** — מד האמא לא עולה למשך 8 שניות
- **🌟 כפול** — ניקוד כפול למשך 10 שניות

#### Combo System משופר
- combo counter ויזואלי (x2, x3, x5...) עם אנימציה
- **streak bonus** — 5 טכניק ברצף = מגה בונוס + אנימציית victory
- **leaderboard מקומי** — top 5 תוצאות (לא רק highscore)

#### מד אמא משודרג
- מד בצורת **פנים של אמא** שמשנה הבעה (😌→😒→😤→🤬→🤱)
- כשהמד גבוה, **צעדי אמא נשמעים מתקרבים** (אודיו)
- ב-80%+ **המסך מתחיל לרעוד** כאילו אמא הולכת

### 4. אודיו משודרג
- **מוזיקת רקע** — לופ של Web Audio synth (8-bit style)
- **אפקט סירנה** משופר — מתעדכן לפי מצב המשחק
- **אפקטי combo** — קול עולה עם כל combo
- **כפתור mute** — לא כולם רוצים סירנה ב-3 בלילה

### 5. הומור אשכנזי נוסף

#### ציטוטים נוספים של חיים
```
grabTechnic: [
  'הבוגאטי שלי! שווה יותר מהדירה!',
  'עוד סט! ועוד לא קניתי ביטוח!',
  'זה לא צעצוע, זה השקעה לעתיד!',
  'הגעפילטע? לא. טכניק? כן!',
]
grabLogical: [
  'התינוק? יש לו אמא. לבוגאטי אין!',
  'תרופות? בריא כשור. עוד טכניק!',
  'מה זה סדר עדיפויות? תגיד ללגו!',
  'אופס... רגע... לא, לא צריך.',
]
```

#### אירועים מיוחדים
- **"סבתא מתקשרת"** — popup שחוסם חצי מסך ל-3 שניות
- **"אבא נכנס לחדר"** — פריטים מתחבאים לשנייה
- **"החתול קפץ על המדף"** — כל הפריטים על המסך מקבלים דחיפה הצידה

---

## סדר ביצוע (שלבים)

### Phase 1: Infrastructure
1. התקנת `pixi.js` + `@pixi/react`
2. פיצול הקוד הקיים ל-modules (types, constants, audio)
3. יצירת `LegoGameCanvas.tsx` עם PixiJS Application בסיסי
4. העברת הפריטים הנופלים מ-DOM ל-PixiJS sprites (אימוג'ים כ-text sprites לשלב ראשון)

### Phase 2: Mobile & Controls
5. מנגנון swipe/touch לתזוזת חיים
6. hit areas מוגדלים לפריטים
7. Safe areas + viewport fixes
8. Haptic feedback

### Phase 3: Visual Upgrade
9. Particle effects (grab, miss, combo)
10. רקע parallax
11. אנימציות לדמות חיים
12. Glow/trail effects לפריטים

### Phase 4: Gameplay
13. מערכת 3 שלבים
14. Power-ups
15. Combo system משופר + ויזואלי
16. מד אמא אנימטיבי

### Phase 5: Polish
17. אודיו — מוזיקת רקע + אפקטים חדשים
18. אירועים מיוחדים (סבתא, אבא, חתול)
19. Leaderboard מקומי (top 5)
20. בדיקת ביצועים + אופטימיזציה

---

## הערות טכניות

- **SSR**: `LegoGameCanvas` חייב להיות dynamic import עם `ssr: false` (PixiJS צריך DOM)
- **Bundle size**: PixiJS ~200KB gzipped — סביר לגמרי
- **Fallback**: אם WebGL לא נתמך, PixiJS יורד ל-Canvas2D אוטומטית
- **React 19 compat**: `@pixi/react` v8 תוכנן ל-React 19 — ✅
- **Next.js 16 compat**: צריך `'use client'` על כל קומפוננט PixiJS

## מקורות
- [PixiJS Official](https://pixijs.com/)
- [@pixi/react npm](https://www.npmjs.com/package/@pixi/react)
- [PixiJS React Docs](https://react.pixijs.io/)
- [PixiJS React v8 Blog Post](https://pixijs.com/blog/pixi-react-v8-live)
- [Web Game Engines Comparison 2026](https://app.cinevva.com/guides/web-game-engines-comparison.html)
