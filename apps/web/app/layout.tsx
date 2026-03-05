import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'P-Office Modern',
  description: 'Cloud-first ERP for Swiss trades'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH">
      <body>{children}</body>
    </html>
  );
}
