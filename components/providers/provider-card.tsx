import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Star, MapPin } from 'lucide-react';

type ProviderService = {
  custom_price_cents: number | null;
  is_active: boolean;
  services: { base_price_cents: number } | null;
};

export type ProviderCardData = {
  id: string;
  slug: string;
  bio: string | null;
  city: string;
  avg_rating: number | null;
  total_reviews: number;
  service_area_km: number;
  profiles: { display_name: string; avatar_url: string | null } | null;
  provider_services: ProviderService[];
};

function getMinPriceCents(services: ProviderService[]): number | null {
  const prices = services
    .filter((ps) => ps.is_active && ps.services)
    .map((ps) => ps.custom_price_cents ?? ps.services!.base_price_cents);
  return prices.length > 0 ? Math.min(...prices) : null;
}

function formatEuros(cents: number): string {
  return `€${Math.floor(cents / 100)}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ProviderCard({ provider }: { provider: ProviderCardData }) {
  const t = useTranslations('providers');

  const displayName = provider.profiles?.display_name ?? '—';
  const initials = getInitials(displayName);
  const avatarUrl = provider.profiles?.avatar_url;
  const bioExcerpt = provider.bio ? provider.bio.slice(0, 110).trimEnd() + (provider.bio.length > 110 ? '…' : '') : null;
  const minPrice = getMinPriceCents(provider.provider_services);

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-background transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4 p-5">
        {/* Avatar */}
        <div className="shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {displayName}
          </h3>

          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{provider.city}</span>
          </div>

          {/* Rating */}
          <div className="mt-2 flex items-center gap-1.5">
            {provider.avg_rating !== null ? (
              <>
                <Star className="h-4 w-4 fill-foreground text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {provider.avg_rating.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({t('reviewCount', { count: provider.total_reviews })})
                </span>
              </>
            ) : (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {t('newProvider')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {bioExcerpt && (
        <p className="px-5 text-sm leading-relaxed text-muted-foreground">
          {bioExcerpt}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-border px-5 py-4">
        <span className="text-sm font-medium text-foreground">
          {minPrice !== null
            ? t('fromPrice', { price: formatEuros(minPrice) })
            : '—'}
        </span>
        <Link
          href={`/aanbod/${provider.slug}`}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          {t('viewProfile')}
        </Link>
      </div>
    </article>
  );
}
