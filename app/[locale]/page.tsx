import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { MapPin, ShieldCheck, CalendarCheck, Search, Calendar, Sparkles } from 'lucide-react';
import { buildMetadata, SITE_URL } from '@/lib/metadata';
import { JsonLd } from '@/components/seo/json-ld';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return buildMetadata({
    locale,
    path: '',
    title: t('defaultTitle'),
    description: t('defaultDescription'),
  });
}

const LOCAL_BUSINESS_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Zenzo',
  description: 'Premium massage aan huis in Utrecht — gecertificeerde masseurs die naar jou toe komen.',
  url: SITE_URL,
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

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <JsonLd data={LOCAL_BUSINESS_SCHEMA} />
      <HeroSection />
      <ValuePropsSection />
      <HowItWorksSection />
      <CtaBannerSection />
    </>
  );
}

function HeroSection() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-36">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--muted))_0%,transparent_70%)]" />

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {t('heroLabel')}
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {t('heroTitle')}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t('heroSubtitle')}
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/aanbod"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground px-8 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
          >
            {t('heroCtaPrimary')}
          </Link>
          <a
            href="#hoe-het-werkt"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-8 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {t('heroCtaSecondary')}
          </a>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {tCommon('siteName')} · Utrecht, Nederland
        </p>
      </div>
    </section>
  );
}

function ValuePropsSection() {
  const t = useTranslations('home');

  const props = [
    {
      icon: MapPin,
      titleKey: 'valueProp1Title' as const,
      descKey: 'valueProp1Desc' as const,
    },
    {
      icon: ShieldCheck,
      titleKey: 'valueProp2Title' as const,
      descKey: 'valueProp2Desc' as const,
    },
    {
      icon: CalendarCheck,
      titleKey: 'valueProp3Title' as const,
      descKey: 'valueProp3Desc' as const,
    },
  ];

  return (
    <section className="border-t border-border bg-muted/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('valuePropTitle')}
        </h2>

        <div className="grid gap-8 sm:grid-cols-3">
          {props.map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5">
                <Icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {t(titleKey)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const t = useTranslations('home');

  const steps = [
    {
      icon: Search,
      numberKey: 'step1Number' as const,
      titleKey: 'step1Title' as const,
      descKey: 'step1Desc' as const,
    },
    {
      icon: Calendar,
      numberKey: 'step2Number' as const,
      titleKey: 'step2Title' as const,
      descKey: 'step2Desc' as const,
    },
    {
      icon: Sparkles,
      numberKey: 'step3Number' as const,
      titleKey: 'step3Title' as const,
      descKey: 'step3Desc' as const,
    },
  ];

  return (
    <section id="hoe-het-werkt" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('howItWorksTitle')}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t('howItWorksSubtitle')}
          </p>
        </div>

        <div className="relative grid gap-8 sm:grid-cols-3">
          {/* connector line — desktop only */}
          <div
            aria-hidden
            className="absolute left-1/6 right-1/6 top-6 hidden border-t-2 border-dashed border-border sm:block"
          />

          {steps.map(({ icon: Icon, numberKey, titleKey, descKey }) => (
            <div key={titleKey} className="relative flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-background text-lg font-bold text-foreground">
                {t(numberKey)}
              </div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center text-muted-foreground">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {t(titleKey)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBannerSection() {
  const t = useTranslations('home');

  return (
    <section className="bg-foreground py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight text-background sm:text-3xl">
          {t('ctaTitle')}
        </h2>
        <p className="mt-4 text-background/70">
          {t('ctaSubtitle')}
        </p>
        <Link
          href="/aanbod"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-background px-8 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
        >
          {t('ctaButton')}
        </Link>
      </div>
    </section>
  );
}
