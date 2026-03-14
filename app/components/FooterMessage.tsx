'use client';

import { useState, useEffect } from 'react';

const MESSAGES = [
  '״אל תשכחו לשתות. אתם נראים חיוורים. כמו אבא שלכם.״',
  '״כבר שאלתם את סבתא אם היא צריכה משהו? לא? ככה גידלתי אתכם?״',
  '״אם האתר הזה טוב, תגידו. אני לא אאמין, אבל תגידו.״',
  '״נו, כבר הגעתם? לקח לכם זמן. כמו אבא בסופר.״',
  '״מי עושה אתרים בזמן אזעקה? אנחנו. כי אנחנו משפחה.״',
  '״שבו, שתו, אכלו משהו. מה אתם, אורחים? אתם אורחים.״',
  '״מה הוא ׳גיימר׳? בזמני קראו לזה ׳ילד שלא עוזר בבית׳.״',
  '״יש כאן עוגיות? לא? אז מה יש? ״',
  '״בזמני לא היו משחקים. היה אוכל. וזה הספיק.״',
  '״תפסיקו ללחוץ. הכפתור לא עושה ממנו כלום. ממש כמו אבא.״',
  '״מישהו פה מרוויח כסף מזה? לא? אז למה אתם מתאמצים?״',
  '״אני לא אומרת שזה רע. אני לא אומרת שזה טוב. אני אומרת שאכלתם?״',
];

export default function FooterMessage() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % MESSAGES.length);
        setShow(true);
      }, 350);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-[2.5em] flex items-center justify-center">
      <span
        className="text-sm leading-relaxed"
        style={{ transition: 'opacity 0.35s ease', opacity: show ? 1 : 0 }}
      >
        👵 {MESSAGES[idx]}
      </span>
    </div>
  );
}
