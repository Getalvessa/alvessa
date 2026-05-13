import type { Metadata } from 'next';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zenzo.nl';

/**
 * Builds full page metadata: title, description, canonical, hreflang,
 * OpenGraph and Twitter Card. Use in every public page's generateMetadata.
 *
 * path: '' for root, 'aanbod' for /aanbod, 'aanbod/anna' for provider page.
 */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  ogImage = '/og-image.png',
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  ogImage?: string;
}): Metadata {
  const nlUrl = path ? `${SITE_URL}/${path}` : SITE_URL;
  const enUrl = path ? `${SITE_URL}/en/${path}` : `${SITE_URL}/en`;
  const canonicalUrl = locale === 'nl' ? nlUrl : enUrl;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        nl: nlUrl,
        en: enUrl,
        'x-default': nlUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Zenzo',
      locale: locale === 'nl' ? 'nl_NL' : 'en_US',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export const NOINDEX: Metadata = {
  robots: { index: false, follow: false },
};
