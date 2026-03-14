'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

const PROMPT_TEMPLATES = [
  { label: 'סבתא על הירח', prompt: 'A Jewish grandmother cooking gefilte fish on the moon, cartoon style, funny, colorful' },
  { label: 'חתול בממ"ד', prompt: 'A cute cat sitting in a bomb shelter playing board games with a family, cartoon style, cozy, warm lighting' },
  { label: 'געפילטע פיש ענק', prompt: 'A giant gefilte fish monster attacking a city like Godzilla, funny cartoon style, people running away with plates' },
  { label: 'משפחה על מרבד קסמים', prompt: 'An Israeli family flying on a magic carpet over Jerusalem at sunset, whimsical cartoon style' },
  { label: 'כלב שף', prompt: 'A golden retriever wearing a chef hat cooking shakshuka in a tiny kitchen, funny cartoon, warm colors' },
  { label: 'דינוזאור בסלון', prompt: 'A friendly dinosaur sitting on a couch watching TV with an Israeli family eating sunflower seeds, cartoon style, funny' },
  { label: 'חד-קרן בשוק', prompt: 'A magical unicorn shopping at an Israeli outdoor market (shuk), carrying bags of vegetables, cartoon style, vibrant colors' },
  { label: 'אסטרונאוט עם פיתה', prompt: 'An astronaut eating pita with hummus floating in space, cartoon style, funny, stars background' },
];

const STYLE_OPTIONS = [
  { label: 'קריקטורה', value: 'cartoon style, colorful, fun' },
  { label: 'ציור שמן', value: 'oil painting style, classical, rich colors' },
  { label: 'אנימה', value: 'anime style, vibrant, detailed' },
  { label: 'פיקסל ארט', value: 'pixel art style, retro game, 8-bit' },
  { label: 'צבעי מים', value: 'watercolor painting style, soft, dreamy' },
  { label: 'תלת מימד', value: '3D render, Pixar style, cinematic lighting' },
];

export default function AiStudio() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState(STYLE_OPTIONS[0].value);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ prompt: string; url: string }>>([]);

  const generateImage = useCallback(async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;

    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const fullPrompt = `${finalPrompt}, ${style}`;
      const encoded = encodeURIComponent(fullPrompt);
      const seed = Math.floor(Math.random() * 100000);
      const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&seed=${seed}&nologo=true`;

      // Pre-load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to generate image'));
        img.src = url;
      });

      setImageUrl(url);
      setHistory(prev => [{ prompt: finalPrompt, url }, ...prev].slice(0, 12));
    } catch {
      setError('אוי ויי, משהו השתבש... נסו שוב!');
    } finally {
      setLoading(false);
    }
  }, [prompt, style]);

  const handleTemplateClick = (template: typeof PROMPT_TEMPLATES[0]) => {
    setPrompt(template.prompt);
    generateImage(template.prompt);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ai-studio-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-700 to-indigo-700 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative text-white py-6 px-4">
          <div className="max-w-xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-purple-200 hover:text-white text-sm mb-3 transition-colors"
            >
              <span>→</span>
              <span>חזרה הביתה</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-5xl">🎨🤖</span>
              <div>
                <h1 className="text-3xl font-black">מעבדת AI</h1>
                <p className="text-purple-200 text-sm mt-1">תכתבו מה בא לכם ו-AI ייצור תמונה!</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-5 max-w-xl mx-auto w-full">
        {/* Quick Templates */}
        <section className="mb-6">
          <h2 className="text-sm font-black text-purple-700 uppercase tracking-widest mb-3">
            ✨ רעיונות מהירים
          </h2>
          <div className="flex flex-wrap gap-2">
            {PROMPT_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => handleTemplateClick(t)}
                disabled={loading}
                className="bg-white border-2 border-purple-200 text-purple-700 px-3 py-1.5 rounded-full text-sm font-bold hover:bg-purple-100 hover:border-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Custom Prompt */}
        <section className="mb-6">
          <h2 className="text-sm font-black text-purple-700 uppercase tracking-widest mb-3">
            ✏️ תיאור חופשי
          </h2>
          <div className="bg-white rounded-2xl border-2 border-purple-200 p-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="תארו מה אתם רוצים לראות... למשל: דינוזאור אוכל פלאפל בתל אביב"
              className="w-full h-24 resize-none border-0 outline-none text-gray-800 placeholder-gray-400 text-sm"
              disabled={loading}
            />

            {/* Style Picker */}
            <div className="border-t border-purple-100 pt-3 mt-2">
              <span className="text-xs font-bold text-purple-500 mb-2 block">סגנון:</span>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                      style === s.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => generateImage()}
              disabled={loading || !prompt.trim()}
              className="mt-4 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-spin">🎨</span>
                  יוצר... זה לוקח כמה שניות
                </span>
              ) : (
                '🪄 צור תמונה!'
              )}
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 text-center">
            <p className="text-red-600 font-bold">{error}</p>
          </div>
        )}

        {/* Result */}
        {(imageUrl || loading) && (
          <section className="mb-6">
            <h2 className="text-sm font-black text-purple-700 uppercase tracking-widest mb-3">
              🖼️ התוצאה
            </h2>
            <div className="bg-white rounded-2xl border-2 border-purple-200 overflow-hidden">
              {loading ? (
                <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
                  <div className="text-center">
                    <div className="text-6xl animate-bounce mb-4">🎨</div>
                    <p className="text-purple-600 font-bold">ה-AI מצייר...</p>
                    <p className="text-purple-400 text-sm mt-1">זה יכול לקחת עד 30 שניות</p>
                  </div>
                </div>
              ) : imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="AI generated image"
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-3 flex gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 bg-purple-100 text-purple-700 font-bold py-2 rounded-xl hover:bg-purple-200 transition-colors text-sm"
                    >
                      📥 הורדה
                    </button>
                    <button
                      onClick={() => generateImage()}
                      className="flex-1 bg-indigo-100 text-indigo-700 font-bold py-2 rounded-xl hover:bg-indigo-200 transition-colors text-sm"
                    >
                      🔄 נסה שוב
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        )}

        {/* History */}
        {history.length > 1 && (
          <section className="mb-6">
            <h2 className="text-sm font-black text-purple-700 uppercase tracking-widest mb-3">
              🕐 יצירות קודמות
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {history.slice(1).map((item, i) => (
                <button
                  key={i}
                  onClick={() => setImageUrl(item.url)}
                  className="rounded-xl overflow-hidden border-2 border-purple-100 hover:border-purple-400 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.prompt}
                    className="w-full aspect-square object-cover"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Info */}
        <div className="bg-purple-50 rounded-2xl p-4 text-center text-sm text-purple-500">
          <p className="font-bold mb-1">💡 טיפ</p>
          <p>כתבו באנגלית לתוצאות טובות יותר, או בעברית - ה-AI יבין!</p>
          <p className="mt-2 text-xs text-purple-400">מופעל על ידי Pollinations.ai · חינמי לגמרי</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-purple-900 text-purple-300 text-center py-5 px-6 text-sm font-medium">
        <p>🎨 כל התמונות נוצרות על ידי בינה מלאכותית · אין לנו שליטה על התוצאות</p>
      </footer>
    </div>
  );
}
