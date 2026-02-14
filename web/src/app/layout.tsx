import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Modi's Mission — Record Your Vision",
  description: 'Share your vision for a better India. Record your message for Modi\'s Mission.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/brand-cover.jpg" type="image/jpeg" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
