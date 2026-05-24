import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, MapPin, Star, Building2, Home, Shuffle } from 'lucide-react';
import type { ServiceMode } from '@/lib/types/service-mode';
import { createClient } from '@/lib/supabase/server';
import { buildMetadata, SITE_URL } from '@/lib/metadata';
import { JsonLd } from '@/components/seo/json-ld';

type Props = { params: Promise<{ locale: string; slug: string }> };

// ── Data types ──────────────────────────────────────────────────────────────

type ProviderService = {
  id: string;
  custom_price_cents: number | null;
  is_active: boolean;
  services: {
    id: string;
    name_nl: string;
    name_en: string;
    description_nl: string | null;
    description_en: string | null;
    duration_minutes: number;
    base_price_cents: number;
  } | null;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
};

type ProviderDetail = {
  id: string;
  slug: string;
  bio: string | null;
  city: string;
  avg_rating: number | null;
  total_reviews: number;
  service_area_km: number;
  certifications: unknown;
  service_mode: ServiceMode | null;
  mobile_radius_km: number | null;
  mobile_travel_fee_cents: number | null;
  mobile_notes: string | null;
  studio_city: string | null;
  studio_postcode: string | null;
  studio_notes: string | null;
  profiles: { display_name: string; avatar_url: string | null } | null;
  provider_services: ProviderService[];
};

// ── Data fetching ────────────────────────────────────────────────────────────

async function getProvider(slug: string): Promise<ProviderDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('providers')
    .select(`
      id, slug, bio, city, avg_rating, total_reviews, service_area_km, certifications,
      service_mode, mobile_radius_km, mobile_travel_fee_cents, mobile_notes,
      studio_city, studio_postcode, studio_notes,
      profiles ( display_name, avatar_url ),
      provider_services (
        id, custom_price_cents, is_active,
        services ( id, name_nl, name_en, description_nl, description_en, duration_minutes, base_price_cents )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('is_verified', true)
    .single();

  if (error || !data) return null;
  return data as ProviderDetail;
}

async function getReviews(providerId: string): Promise<Review[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, profiles!reviews_customer_id_fkey ( display_name )')
    .eq('provider_id', providerId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []) as Review[];
}

// ── SEO ─────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) return {};

  const name = provider.profiles?.display_name ?? provider.slug;

  const activeServices = provider.provider_services
    .filter((ps) => ps.is_active && ps.services)
    .slice(0, 2);

  const serviceNames = activeServices
    .map((ps) => (locale === 'nl' ? ps.services!.name_nl : ps.services!.name_en))
    .join(' & ');

  const ratingStr =
    provider.avg_rating !== null ? ` (${provider.avg_rating.toFixed(1)}★)` : '';

  const title = serviceNames
    ? `${name}${ratingStr} — ${serviceNames} aan huis in Utrecht | Alvessa`
    : `${name}${ratingStr} — Massage therapeut in Utrecht | Alvessa`;

  const minPriceCents =
    activeServices.length > 0
      ? Math.min(
          ...activeServices.map(
            (ps) => ps.custom_price_cents ?? ps.services!.base_price_cents,
          ),
        )
      : null;

  const description = provider.bio
    ? `${provider.bio.slice(0, 145).trimEnd()}${provider.bio.length > 145 ? '…' : ''}`
    : [
        `Boek gecertificeerde ${serviceNames || 'massage'} aan huis bij ${name} in ${provider.city}.`,
        minPriceCents ? `Vanaf €${Math.floor(minPriceCents / 100)}.` : '',
        provider.avg_rating && provider.total_reviews > 0
          ? `Beoordeeld ${provider.avg_rating.toFixed(1)}/5 door ${provider.total_reviews} klanten.`
          : '',
      ]
        .filter(Boolean)
        .join(' ');

  return buildMetadata({
    locale,
    path: `aanbod/${slug}`,
    title,
    description,
  });
}

function buildProviderSchema(provider: ProviderDetail, locale: string, slug: string) {
  const displayName = provider.profiles?.display_name ?? provider.slug;
  const pageUrl = `${SITE_URL}/aanbod/${slug}`;

  const offers = provider.provider_services
    .filter((ps) => ps.is_active && ps.services)
    .map((ps) => {
      const svc = ps.services!;
      return {
        '@type': 'Offer',
        name: locale === 'nl' ? svc.name_nl : svc.name_en,
        price: (Math.floor((ps.custom_price_cents ?? svc.base_price_cents) / 100)).toString(),
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      };
    });

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': pageUrl,
    name: displayName,
    url: pageUrl,
    address: {
      '@type': 'PostalAddress',
      addressLocality: provider.city,
      addressCountry: 'NL',
    },
    areaServed: { '@type': 'City', name: provider.city },
    priceRange: '€€',
    offers,
  };

  if (provider.bio) schema['description'] = provider.bio;
  if (provider.profiles?.avatar_url) schema['image'] = provider.profiles.avatar_url;

  if (provider.avg_rating !== null && provider.total_reviews > 0) {
    schema['aggregateRating'] = {
      '@type': 'AggregateRating',
      ratingValue: provider.avg_rating.toFixed(1),
      reviewCount: provider.total_reviews,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return schema;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProviderProfilePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [provider, reviews] = await Promise.all([
    getProvider(slug),
    getProvider(slug).then((p) => (p ? getReviews(p.id) : [])),
  ]);

  if (!provider) notFound();

  const activeServices = provider.provider_services.filter(
    (ps) => ps.is_active && ps.services,
  );

  const providerSchema = buildProviderSchema(provider, locale, slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <JsonLd data={providerSchema} />
      <BackLink />
      <ProviderHeader provider={provider} />
      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          <AboutSection provider={provider} />
          <ServiceModeSection provider={provider} />
          <ServicesSection services={activeServices} locale={locale} providerSlug={provider.slug} />
          <ReviewsSection reviews={reviews} />
        </div>
        <aside className="space-y-6">
          <BookingCta provider={provider} />
        </aside>
      </div>
    </div>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────────

function ServiceModeSection({ provider }: { provider: ProviderDetail }) {
  const t = useTranslations('serviceMode');
  const mode = provider.service_mode;
  if (!mode) return null;

  const iconMap: Record<ServiceMode, React.ReactNode> = {
    studio_only: <Building2 className="h-4 w-4 shrink-0" />,
    mobile_only: <Home className="h-4 w-4 shrink-0" />,
    hybrid:      <Shuffle className="h-4 w-4 shrink-0" />,
  };
  const badgeMap: Record<ServiceMode, string> = {
    studio_only: t('studioOnlyBadge'),
    mobile_only: t('mobileBadge'),
    hybrid:      t('hybridBadge'),
  };

  const showStudio = mode === 'studio_only' || mode === 'hybrid';
  const showMobile = mode === 'mobile_only' || mode === 'hybrid';

  return (
    <section>
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
        {iconMap[mode]}
        {badgeMap[mode]}
      </div>

      <div className="space-y-3 text-sm text-muted-foreground">
        {showStudio && (provider.studio_city || provider.studio_notes) && (
          <div className="rounded-xl border border-border p-4 space-y-1">
            {provider.studio_city && (
              <p>
                <span className="font-medium text-foreground">{t('studioSection')}: </span>
                {[provider.studio_city, provider.studio_postcode].filter(Boolean).join(' ')}
              </p>
            )}
            {provider.studio_notes && (
              <p className="whitespace-pre-line">{provider.studio_notes}</p>
            )}
          </div>
        )}

        {showMobile && (provider.mobile_radius_km || provider.mobile_notes) && (
          <div className="rounded-xl border border-border p-4 space-y-1">
            {provider.mobile_radius_km && (
              <p>
                <span className="font-medium text-foreground">Reisafstand: </span>
                tot {provider.mobile_radius_km} km
                {provider.mobile_travel_fee_cents != null && provider.mobile_travel_fee_cents > 0
                  ? ` · reiskosten €${(provider.mobile_travel_fee_cents / 100).toFixed(2)}`
                  : ' · gratis thuisbezoek'}
              </p>
            )}
            {provider.mobile_notes && (
              <p className="whitespace-pre-line">{provider.mobile_notes}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function BackLink() {
  const t = useTranslations('providers');
  return (
    <Link
      href="/aanbod"
      className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t('backToList')}
    </Link>
  );
}

function ProviderHeader({ provider }: { provider: ProviderDetail }) {
  const t = useTranslations('providers');
  const displayName = provider.profiles?.display_name ?? provider.slug;
  const avatarUrl = provider.profiles?.avatar_url;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      {/* Avatar */}
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName}
          width={96}
          height={96}
          className="h-24 w-24 shrink-0 rounded-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
          {initials}
        </div>
      )}

      {/* Info */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {displayName}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {provider.city} · {t('serviceArea', { km: provider.service_area_km })}
          </span>

          {provider.avg_rating !== null ? (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
              <span className="font-medium text-foreground">
                {provider.avg_rating.toFixed(1)}
              </span>
              <span>({t('reviewCount', { count: provider.total_reviews })})</span>
            </span>
          ) : (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs">
              {t('newProvider')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AboutSection({ provider }: { provider: ProviderDetail }) {
  const t = useTranslations('providers');
  const displayName = provider.profiles?.display_name ?? provider.slug;

  if (!provider.bio) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        {t('aboutTitle', { name: displayName })}
      </h2>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {provider.bio}
      </p>
    </section>
  );
}

function ServicesSection({
  services,
  locale,
  providerSlug,
}: {
  services: ProviderService[];
  locale: string;
  providerSlug: string;
}) {
  const t = useTranslations('providers');

  if (services.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        {t('servicesTitle')}
      </h2>
      <div className="space-y-3">
        {services.map((ps) => {
          if (!ps.services) return null;
          const svc = ps.services;
          const name = locale === 'nl' ? svc.name_nl : svc.name_en;
          const description =
            locale === 'nl' ? svc.description_nl : svc.description_en;
          const price = ps.custom_price_cents ?? svc.base_price_cents;

          return (
            <div
              key={ps.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-border p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('duration', { minutes: svc.duration_minutes })}
                  </span>
                </div>
                {description && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-base font-semibold text-foreground">
                  €{Math.floor(price / 100)}
                </span>
                <Link
                  href={`/aanbod/${providerSlug}/boeken`}
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  {t('bookService')}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewsSection({ reviews }: { reviews: Review[] }) {
  const t = useTranslations('providers');

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        {t('reviewsTitle')}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('reviewsEmpty')}</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const name = review.profiles?.display_name ?? '—';
  const date = new Date(review.created_at).toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < review.rating ? 'fill-foreground text-foreground' : 'text-border'}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      {review.comment && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {review.comment}
        </p>
      )}
      <p className="mt-2 text-xs font-medium text-foreground">{name}</p>
    </div>
  );
}

function BookingCta({ provider }: { provider: ProviderDetail }) {
  const t = useTranslations('providers');
  const tCommon = useTranslations('common');
  const displayName = provider.profiles?.display_name ?? provider.slug;

  return (
    <div className="sticky top-24 rounded-xl border border-border p-5">
      <p className="text-sm text-muted-foreground">
        {t('aboutTitle', { name: displayName })}
      </p>

      {provider.avg_rating !== null && (
        <div className="mt-2 flex items-center gap-1">
          <Star className="h-4 w-4 fill-foreground text-foreground" />
          <span className="text-sm font-medium text-foreground">
            {provider.avg_rating.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">
            · {t('reviewCount', { count: provider.total_reviews })}
          </span>
        </div>
      )}

      <Link
        href={`/aanbod/${provider.slug}/boeken`}
        className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
      >
        {tCommon('bookNow')}
      </Link>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {provider.city} · {t('serviceArea', { km: provider.service_area_km })}
      </p>
    </div>
  );
}
