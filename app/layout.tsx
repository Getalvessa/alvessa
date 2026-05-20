import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  // metadataBase enables relative OG image URLs (/og-image.png) across all pages
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alvessa.nl'),
  title: 'Alvessa — Premium massage aan huis in Utrecht',
  description:
    'Boek een professionele masseur aan huis in Utrecht. Gecertificeerde massage therapeuten, flexibele tijden, veilige betaling.',
};

// Root layout — html/body here. Lang attribute is set per locale by [locale]/layout.tsx.
// suppressHydrationWarning prevents hydration mismatch when locale layout overrides lang.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
