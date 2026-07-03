import type { MetadataRoute } from 'next';

// PRE-LAUNCH FULL HIDDEN (docs/STATE.md → Pre-Launch SEO Strategy, Sprint RC-2C):
// every customer-facing page is noindex, so the sitemap is intentionally empty
// to keep all SEO signals consistent. Restore URLs together with the phased
// index release (Phase 1 `/` → 2 `/aanbod` → 3 `/aanbod/[slug]` → 4 supporting
// pages). Pre-hidden entries for Phase 4 reference:
//   /hoe-het-werkt, /faq, /voor-schoonmakers, /voor-schoonmakers/aanmelden,
//   /over-ons, /contact, /privacybeleid, /algemene-voorwaarden
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
