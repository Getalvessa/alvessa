import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['nl', 'en'],
  defaultLocale: 'nl',
  // nl has no URL prefix (e.g. /aanbieders), en has /en prefix (e.g. /en/providers)
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
