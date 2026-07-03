/**
 * Central city configuration — single source of truth for which cities are
 * publicly launched vs. only in supply-side (therapist) recruitment.
 *
 * IMPORTANT — two independent visibility axes:
 *   - publicVisible + status='active' → city may appear on PUBLIC user-facing
 *     surfaces (homepage, nav, /aanbod, sitemap, SEO landing pages, metadata).
 *   - recruitmentVisible → city may be mentioned on therapist recruitment pages
 *     (/voor-masseurs) and offered in the application form, even if NOT yet
 *     publicly launched.
 *
 * This is a supply-side recruitment architecture, NOT a public multi-city
 * launch. Keep publicVisible=false until a city is genuinely ready to serve
 * customers. Flipping a single flag here is the intended launch switch.
 *
 * Plain data — safe to import from both server and client components.
 */

export type CityStatus =
  | 'researching'
  | 'supply_testing'
  | 'prelaunch'
  | 'active'
  | 'paused';

export type City = {
  /** Canonical key stored in DB (providers.city / provider_applications.city) */
  slug: string;
  /** Human-readable name, derived for display only — never stored in DB */
  displayName: string;
  status: CityStatus;
  /** May appear on public user-facing surfaces (requires status='active' too) */
  publicVisible: boolean;
  /** May be offered/mentioned in therapist recruitment */
  recruitmentVisible: boolean;
};

export const CITIES: readonly City[] = [
  {
    slug: 'utrecht',
    displayName: 'Utrecht',
    status: 'supply_testing',
    publicVisible: false,
    recruitmentVisible: true,
  },
  {
    slug: 'amsterdam',
    displayName: 'Amsterdam',
    status: 'supply_testing',
    publicVisible: false,
    recruitmentVisible: true,
  },
  {
    slug: 'rotterdam',
    displayName: 'Rotterdam',
    status: 'researching',
    publicVisible: false,
    recruitmentVisible: true,
  },
  {
    slug: 'den-haag',
    displayName: 'Den Haag',
    status: 'researching',
    publicVisible: false,
    recruitmentVisible: true,
  },
  {
    slug: 'groningen',
    displayName: 'Groningen',
    status: 'prelaunch',
    publicVisible: false,
    recruitmentVisible: true,
  },
] as const;

/**
 * Cities allowed on PUBLIC user-facing surfaces.
 * A city is public only when it is both `active` AND `publicVisible`.
 */
export function getPublicCities(): City[] {
  return CITIES.filter((c) => c.status === 'active' && c.publicVisible);
}

/** Slugs of public cities — use to gate provider queries by `city`. */
export function getPublicCitySlugs(): string[] {
  return getPublicCities().map((c) => c.slug);
}

/** Cities that may appear in therapist recruitment (may be non-public). */
export function getRecruitmentCities(): City[] {
  return CITIES.filter((c) => c.recruitmentVisible);
}

/** Slugs offered in the provider application form. */
export function getRecruitmentCitySlugs(): string[] {
  return getRecruitmentCities().map((c) => c.slug);
}

/** True if `slug` matches a recruitment city. */
export function isRecruitmentCitySlug(slug: string): boolean {
  const needle = slug.trim().toLowerCase();
  return getRecruitmentCities().some((c) => c.slug === needle);
}

/**
 * Display name for a stored city slug. Falls back to the raw value so legacy
 * or unexpected data never renders blank.
 */
export function getCityDisplayName(slug: string): string {
  return CITIES.find((c) => c.slug === slug)?.displayName ?? slug;
}
