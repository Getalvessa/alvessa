import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zenzo.nl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                                        lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/aanbod`,                            lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/massage-aan-huis-utrecht`,          lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/sportmassage-utrecht`,              lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/deep-tissue-massage-utrecht`,       lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/hotel-massage-utrecht`,             lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/hoe-het-werkt`,                     lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/faq`,                               lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/voor-masseurs`,                     lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/over-ons`,                          lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`,                           lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Direct Supabase client — no cookie context needed for public read
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: providers } = await supabase
    .from('providers')
    .select('slug')
    .eq('is_active', true)
    .eq('is_verified', true);

  const providerPages: MetadataRoute.Sitemap = (providers ?? []).map((p) => ({
    url: `${SITE_URL}/aanbod/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...providerPages];
}
