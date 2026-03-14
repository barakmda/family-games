import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'עדיין בממ"ד?',
  description: 'משחקי משפחה בטעם ביתי — עם הומור אשכנזי',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#78350f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
