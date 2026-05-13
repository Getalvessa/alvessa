import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { MapPin, ShieldCheck, CreditCard, CheckCircle } from 'lucide-react';
import { buildMetadata, SITE_URL } from '@/lib/metadata';
import { JsonLd } from '@/components/seo/json-ld';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoMassageUtrecht' });
  return buildMetadata({
    locale,
    path: 'massage-aan-huis-utrecht',
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

export default async function MassageAanHuisUtrechtPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'seoMassageUtrecht' });

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ['faq1', 'faq2', 'faq3', 'faq4'].map((n) => ({
      '@type': 'Question',
      name: t(`${n}Q` as Parameters<typeof t>[0]),
      acceptedAnswer: { '@type': 'Answer', text: t(`${n}A` as Parameters<typeof t>[0]) },
    })),
  };

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Zenzo',
    url: `${SITE_URL}/massage-aan-huis-utrecht`,
    email: 'hallo@zenzo.nl',
    image: `${SITE_URL}/og-image.png`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Utrecht',
      addressRegion: 'Utrecht',
      addressCountry: 'NL',
    },
    areaServed: [
      { '@type': 'City', name: 'Utrecht' },
      { '@type': 'Place', name: 'Utrecht Centrum' },
      { '@type': 'Place', name: 'Utrecht Oost' },
      { '@type': 'Place', name: 'Leidsche Rijn' },
    ],
    serviceType: 'Massage aan huis',
    priceRange: '€€',
  };

  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <JsonLd data={faqSchema} />
      <PageContent />
    </>
  );
}

function PageContent() {
  const t = useTranslations('seoMassageUtrecht');

  const benefits = [
    { icon: MapPin,       titleKey: 'benefit1Title' as const, descKey: 'benefit1Body' as const },
    { icon: ShieldCheck,  titleKey: 'benefit2Title' as const, descKey: 'benefit2Body' as const },
    { icon: CreditCard,   titleKey: 'benefit3Title' as const, descKey: 'benefit3Body' as const },
  ];

  const areas = [
    { nameKey: 'area1' as const, descKey: 'area1Desc' as const },
    { nameKey: 'area2' as const, descKey: 'area2Desc' as const },
    { nameKey: 'area3' as const, descKey: 'area3Desc' as const },
  ];

  const trusts = ['trust1', 'trust2', 'trust3', 'trust4'] as const;
  const faqs   = ['faq1', 'faq2', 'faq3', 'faq4'] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Hero */}
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('h1')}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t('intro')}</p>

      {/* CTA */}
      <div className="mt-8">
        <Link
          href="/aanbod"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground px-8 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          {t('ctaButton')}
        </Link>
      </div>

      {/* Benefits */}
      <section className="mt-14">
        <h2 className="mb-6 text-xl font-semibold text-foreground">{t('benefitsTitle')}</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {benefits.map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="rounded-xl border border-border p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/5">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">{t(titleKey)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Service areas */}
      <section className="mt-14">
        <h2 className="mb-2 text-xl font-semibold text-foreground">{t('areasTitle')}</h2>
        <p className="mb-5 text-sm text-muted-foreground">{t('areasBody')}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {areas.map(({ nameKey, descKey }) => (
            <div key={nameKey} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {t(nameKey)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section className="mt-14 rounded-xl bg-muted/40 px-6 py-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">{t('trustTitle')}</h2>
        <ul className="space-y-2">
          {trusts.map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 shrink-0 text-foreground" />
              {t(key)}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="mb-6 text-xl font-semibold text-foreground">{t('faqTitle')}</h2>
        <dl className="divide-y divide-border">
          {faqs.map((n) => (
            <div key={n} className="py-5">
              <dt className="text-sm font-semibold text-foreground">
                {t(`${n}Q` as Parameters<typeof t>[0])}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`${n}A` as Parameters<typeof t>[0])}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Related services */}
      <section className="mt-14">
        <h2 className="mb-4 text-base font-semibold text-foreground">{t('relatedTitle')}</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/sportmassage-utrecht" className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t('relatedSportmassage')}
          </Link>
          <Link href="/deep-tissue-massage-utrecht" className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t('relatedDeepTissue')}
          </Link>
          <Link href="/hotel-massage-utrecht" className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t('relatedHotel')}
          </Link>
        </div>
      </section>
    </div>
  );
}
