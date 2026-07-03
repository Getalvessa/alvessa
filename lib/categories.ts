/**
 * Central service-category configuration — single source of truth for
 * category behaviour across the app (mirrors the `lib/cities.ts` pattern).
 *
 * The canonical key is `service_categories.slug` from the database.
 * Runtime category detection MUST use that slug — never service names.
 * The only exception is `recruitmentKeywords`: the provider application
 * form receives free text typed by an applicant (no DB record exists yet),
 * so keyword matching is the only possible detection there.
 *
 * Category-specific UI decisions go through `capabilities.*` — never add
 * `if (slug === 'cleaning')` branches in components. To change behaviour
 * for a category, change its definition here.
 *
 * Plain data — safe to import from both server and client components.
 */

export type CategoryCommission = {
  /**
   * Commission model. Only 'percentage' exists today — extend the union
   * (e.g. 'flat_fee', tiered) when the business needs it.
   */
  model: 'percentage';
  /**
   * Platform take in percent of the booking total (0–100).
   * Both categories are 0 until Stripe Connect payouts ship: today the
   * platform charges no fee, and `bookings.platform_fee_cents` must stay 0.
   * Changing a rate here is the single switch that activates commission.
   */
  ratePercent: number;
};

/**
 * Category-driven UI behaviour. Values are i18n message keys that already
 * exist in `messages/nl.json` / `messages/en.json` — the component picks
 * the key from the active category instead of branching on it.
 */
export type CategoryCapabilities = {
  /** Keys in the `booking` namespace (address step of the booking flow). */
  booking: {
    notesLabelKey: 'notesLabel' | 'notesLabelCleaning';
    notesPlaceholderKey: 'notesPlaceholder' | 'notesPlaceholderCleaning';
  };
  /** Keys in the `forProviders` namespace (provider application form). */
  application: {
    servicesLabelKey: 'applyLabelServices' | 'applyLabelServicesCleaning';
    servicesPlaceholderKey: 'applyLabelServicesPh' | 'applyLabelServicesCleaningPh';
    serviceModeLabelKey: 'applyLabelServiceMode' | 'applyLabelServiceModeCleaning';
    experienceLabelKey: 'applyLabelExperience' | 'applyLabelExperienceCleaning';
  };
};

export type CategoryDefinition = {
  /** Canonical key — must match `service_categories.slug` in the database. */
  slug: string;
  capabilities: CategoryCapabilities;
  commission: CategoryCommission;
  /**
   * Lowercase keywords for detecting this category in applicant free text
   * (provider application form ONLY). Empty for the default category —
   * anything that matches no keywords falls back to it.
   */
  recruitmentKeywords: readonly string[];
};

/** Fallback when a slug is unknown/missing and when free text matches nothing. */
export const DEFAULT_CATEGORY_SLUG = 'massage';

export const CATEGORIES: readonly CategoryDefinition[] = [
  {
    slug: 'massage',
    capabilities: {
      booking: {
        notesLabelKey: 'notesLabel',
        notesPlaceholderKey: 'notesPlaceholder',
      },
      application: {
        servicesLabelKey: 'applyLabelServices',
        servicesPlaceholderKey: 'applyLabelServicesPh',
        serviceModeLabelKey: 'applyLabelServiceMode',
        experienceLabelKey: 'applyLabelExperience',
      },
    },
    commission: { model: 'percentage', ratePercent: 0 },
    recruitmentKeywords: [],
  },
  {
    slug: 'cleaning',
    capabilities: {
      booking: {
        notesLabelKey: 'notesLabelCleaning',
        notesPlaceholderKey: 'notesPlaceholderCleaning',
      },
      application: {
        servicesLabelKey: 'applyLabelServicesCleaning',
        servicesPlaceholderKey: 'applyLabelServicesCleaningPh',
        serviceModeLabelKey: 'applyLabelServiceModeCleaning',
        experienceLabelKey: 'applyLabelExperienceCleaning',
      },
    },
    commission: { model: 'percentage', ratePercent: 0 },
    recruitmentKeywords: [
      'schoonmaak',
      'huishoudelijke hulp',
      'interieurverzorging',
      'cleaning',
    ],
  },
] as const;

const DEFAULT_CATEGORY = CATEGORIES.find((c) => c.slug === DEFAULT_CATEGORY_SLUG)!;

/**
 * Resolve a `service_categories.slug` to its definition.
 * Unknown or missing slugs fall back to the default category so legacy
 * data never breaks rendering.
 */
export function getCategoryBySlug(slug: string | null | undefined): CategoryDefinition {
  if (!slug) return DEFAULT_CATEGORY;
  return CATEGORIES.find((c) => c.slug === slug) ?? DEFAULT_CATEGORY;
}

/**
 * Detect a category from applicant free text (provider application form).
 * This is the ONLY sanctioned keyword-based detection — everything with a
 * DB record must resolve via `getCategoryBySlug` instead.
 */
export function detectCategoryFromFreeText(text: string): CategoryDefinition {
  const haystack = text.toLowerCase();
  return (
    CATEGORIES.find((c) =>
      c.recruitmentKeywords.some((term) => haystack.includes(term)),
    ) ?? DEFAULT_CATEGORY
  );
}

/**
 * Platform commission for a booking, in euro cents.
 * Server-derived only — never accept a fee from client input.
 */
export function calculateCommissionCents(
  priceCents: number,
  category: CategoryDefinition,
): number {
  return Math.round((priceCents * category.commission.ratePercent) / 100);
}
