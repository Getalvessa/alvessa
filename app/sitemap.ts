import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alvessa.nl';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Provider detail pages (/aanbod/[slug]) carry noindex: true and are excluded
  // from the sitemap until SEO launch is intentionally re-enabled.
  return [
    { url: `${SITE_URL}/hoe-het-werkt`,              lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/faq`,                         lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/voor-masseurs`,               lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/voor-masseurs/aanmelden`,     lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/over-ons`,                    lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`,                     lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacybeleid`,               lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITE_URL}/algemene-voorwaarden`,        lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];
}
