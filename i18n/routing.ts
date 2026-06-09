import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['nl', 'en'],
  defaultLocale: 'nl',
  // nl has no URL prefix (e.g. /aanbod), en has /en prefix (e.g. /en/aanbod)
  localePrefix: 'as-needed',
  // Never infer locale from Accept-Language — Dutch is always the default
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
