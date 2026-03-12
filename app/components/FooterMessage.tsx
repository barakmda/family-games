'use client';

import { useState, useEffect } from 'react';

const MESSAGES = [
  'אל תשכחו לשתות משהו, אתם נראים חיוורים',
  'כבר שאלתם את סבתא אם היא צריכה משהו?',
  'אם האתר נראה לכם טוב, תגידו לי. אני לא אאמין לכם.',
  'לחיצה על כפתור לא עושה ממנו כלום. לחצת שוב? ממש כמו אבא.',
  'נו, כבר הגעתם? לקח לכם זמן.',
  'אל תעמדו כאן. שבו. שתו. אכלו משהו.',
  'יש כאן עוגיות? שאלו רק.',
  'מה עם "בוא נמשחק" הפך ל"אין זמן"? שאל לי.',
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
    <span style={{ transition: 'opacity 0.35s ease', opacity: show ? 1 : 0 }}>
      {MESSAGES[idx]}
    </span>
  );
}
