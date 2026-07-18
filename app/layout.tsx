import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  // metadataBase enables relative OG image URLs (/og-image.png) across all pages
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alvessa.nl'),
  title: 'Alvessa — Massage aan huis in Utrecht — binnenkort',
  description:
    'Alvessa bouwt aan een netwerk van professionele massagetherapeuten in Utrecht. Klantafspraken zijn nog niet open. Masseurs kunnen zich nu aanmelden.',
};

// Root layout must exist for the App Router, but the sole <html>/<body> lives in
// app/[locale]/layout.tsx so `lang` can come from the static [locale] param
// without calling getLocale() (which forces dynamic rendering).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
