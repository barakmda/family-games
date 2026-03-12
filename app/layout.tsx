import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'עדיין בממ"ד?',
  description: 'משחקי משפחה בטעם ביתי',
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
