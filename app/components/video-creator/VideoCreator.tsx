'use client';

import { useState, useMemo } from 'react';
import { Player } from '@remotion/player';
import { GreetingVideo } from '@/app/videos/compositions/GreetingVideo';
import type { GreetingProps } from '@/app/videos/schemas';
import Link from 'next/link';

const DEFAULTS: GreetingProps = {
  familyName: 'משפחת כהן',
  greetingText: 'ברוכים הבאים לממ"ד',
  personName: '',
  backgroundColor: '#78350f',
  textColor: '#fffbeb',
  fontSize: 72,
  durationInSeconds: 5,
};

const FPS = 30;

export default function VideoCreator() {
  const [props, setProps] = useState<GreetingProps>(DEFAULTS);

  const update = <K extends keyof GreetingProps>(key: K, value: GreetingProps[K]) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  };

  const durationInFrames = useMemo(
    () => Math.round(props.durationInSeconds * FPS),
    [props.durationInSeconds],
  );

  return (
    <div dir="rtl" className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-gradient-to-b from-amber-900 to-amber-800 text-white py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="text-amber-300 hover:text-white transition-colors text-sm font-bold"
          >
            ← חזרה
          </Link>
          <div className="flex-1 h-px bg-amber-700" />
          <h1 className="text-xl sm:text-2xl font-black">🎬 יוצר סרטוני ברכה</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="order-1 lg:order-2">
            <h2 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-3">
              תצוגה מקדימה
            </h2>
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl mx-auto" style={{ maxWidth: 320 }}>
              <Player
                component={GreetingVideo}
                inputProps={props}
                durationInFrames={durationInFrames}
                fps={FPS}
                compositionWidth={1080}
                compositionHeight={1920}
                style={{ width: '100%' }}
                controls
                loop
                autoPlay
                acknowledgeRemotionLicense
              />
            </div>
            <p className="text-xs text-amber-500 mt-3 text-center">
              💡 להורדה: הפעל במסך מלא והקלט עם הטלפון
            </p>
          </div>

          {/* Form */}
          <div className="order-2 lg:order-1">
            <h2 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-3">
              הגדרות
            </h2>

            <div className="space-y-4">
              {/* Greeting text */}
              <Field label="טקסט ברכה">
                <input
                  type="text"
                  value={props.greetingText}
                  onChange={(e) => update('greetingText', e.target.value)}
                  className="input-field"
                />
              </Field>

              {/* Family name */}
              <Field label="שם משפחה">
                <input
                  type="text"
                  value={props.familyName}
                  onChange={(e) => update('familyName', e.target.value)}
                  className="input-field"
                />
              </Field>

              {/* Person name */}
              <Field label="שם אישי (אופציונלי)">
                <input
                  type="text"
                  value={props.personName}
                  onChange={(e) => update('personName', e.target.value)}
                  placeholder="למשל: מיכל"
                  className="input-field"
                />
              </Field>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="צבע רקע">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={props.backgroundColor}
                      onChange={(e) => update('backgroundColor', e.target.value)}
                      className="w-10 h-10 rounded-lg border-2 border-amber-200 cursor-pointer"
                    />
                    <span className="text-xs text-amber-500 font-mono">{props.backgroundColor}</span>
                  </div>
                </Field>

                <Field label="צבע טקסט">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={props.textColor}
                      onChange={(e) => update('textColor', e.target.value)}
                      className="w-10 h-10 rounded-lg border-2 border-amber-200 cursor-pointer"
                    />
                    <span className="text-xs text-amber-500 font-mono">{props.textColor}</span>
                  </div>
                </Field>
              </div>

              {/* Font size */}
              <Field label={`גודל פונט: ${props.fontSize}px`}>
                <input
                  type="range"
                  min={30}
                  max={120}
                  value={props.fontSize}
                  onChange={(e) => update('fontSize', Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
              </Field>

              {/* Duration */}
              <Field label={`משך: ${props.durationInSeconds} שניות`}>
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={0.5}
                  value={props.durationInSeconds}
                  onChange={(e) => update('durationInSeconds', Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
              </Field>

              {/* Reset */}
              <button
                onClick={() => setProps(DEFAULTS)}
                className="text-sm text-amber-500 hover:text-amber-700 transition-colors font-bold"
              >
                ↻ איפוס לברירת מחדל
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-amber-800 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
