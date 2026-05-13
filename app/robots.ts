import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zenzo.nl';

const PRIVATE_PATHS = [
  '/dashboard',
  '/admin',
  '/mijn-boekingen',
  '/boeken',
  '/inloggen',
  '/registreren',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block private paths for both nl (no prefix) and en locales
        disallow: [
          ...PRIVATE_PATHS,
          ...PRIVATE_PATHS.map((p) => `/en${p}`),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
