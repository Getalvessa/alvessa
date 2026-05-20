import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { CheckCircle, MapPin } from 'lucide-react';
import { buildMetadata, SITE_URL } from '@/lib/metadata';
import { JsonLd } from '@/components/seo/json-ld';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seoSportmassage' });
  return buildMetadata({
    locale,
    path: 'sportmassage-utrecht',
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

export default async function SportmassageUtrechtPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'seoSportmassage' });

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ['faq1', 'faq2', 'faq3'].map((n) => ({
      '@type': 'Question',
      name: t(`${n}Q` as Parameters<typeof t>[0]),
      acceptedAnswer: { '@type': 'Answer', text: t(`${n}A` as Parameters<typeof t>[0]) },
    })),
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Sportmassage aan huis Utrecht',
    url: `${SITE_URL}/sportmassage-utrecht`,
    provider: { '@type': 'LocalBusiness', name: 'Alvessa', url: SITE_URL },
    areaServed: 'Utrecht',
    description: t('metaDescription'),
    offers: { '@type': 'Offer', priceCurrency: 'EUR', price: '75' },
  };

  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={faqSchema} />
      <PageContent />
    </>
  );
}

function PageContent() {
  const t = useTranslations('seoSportmassage');

  const forWhom = ['forWhom1', 'forWhom2', 'forWhom3', 'forWhom4'] as const;
  const benefits = ['benefit1', 'benefit2', 'benefit3', 'benefit4'] as const;
  const faqs = ['faq1', 'faq2', 'faq3'] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('h1')}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t('intro')}</p>

      <div className="mt-8">
        <Link
          href="/aanbod"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground px-8 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          {t('ctaButton')}
        </Link>
      </div>

      {/* What is it */}
      <section className="mt-14">
        <h2 className="mb-3 text-xl font-semibold text-foreground">{t('whatTitle')}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('whatBody')}</p>
      </section>

      {/* For whom */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-foreground">{t('forWhomTitle')}</h2>
        <ul className="space-y-2">
          {forWhom.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              {t(key)}
            </li>
          ))}
        </ul>
      </section>

      {/* Benefits */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-foreground">{t('benefitsTitle')}</h2>
        <ul className="space-y-2">
          {benefits.map((key) => (
            <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              {t(key)}
            </li>
          ))}
        </ul>
      </section>

      {/* Areas */}
      <section className="mt-12 rounded-xl border border-border p-5">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
          <MapPin className="h-4 w-4" />
          {t('areasTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('areasBody')}</p>
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

      {/* Related */}
      <section className="mt-14">
        <h2 className="mb-4 text-base font-semibold text-foreground">{t('relatedTitle')}</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/massage-aan-huis-utrecht" className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t('relatedMassageUtrecht')}
          </Link>
          <Link href="/deep-tissue-massage-utrecht" className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t('relatedDeepTissue')}
          </Link>
        </div>
      </section>
    </div>
  );
}
