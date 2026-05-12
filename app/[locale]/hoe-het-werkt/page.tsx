import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Search, Calendar, Sparkles } from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'howItWorks' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <PageHeader />
      <StepsSection />
      <WhatToExpectSection />
      <CtaSection />
    </div>
  );
}

function PageHeader() {
  const t = useTranslations('howItWorks');
  return (
    <div className="mb-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('pageTitle')}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{t('pageSubtitle')}</p>
    </div>
  );
}

function StepsSection() {
  const t = useTranslations('howItWorks');
  const steps = [
    { icon: Search, number: '1', titleKey: 'step1Title' as const, bodyKey: 'step1Body' as const },
    { icon: Calendar, number: '2', titleKey: 'step2Title' as const, bodyKey: 'step2Body' as const },
    { icon: Sparkles, number: '3', titleKey: 'step3Title' as const, bodyKey: 'step3Body' as const },
  ];

  return (
    <div className="space-y-10">
      {steps.map(({ icon: Icon, number, titleKey, bodyKey }) => (
        <div key={number} className="flex gap-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-lg font-bold text-foreground">
            {number}
          </div>
          <div className="pt-1">
            <div className="mb-1 flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">{t(titleKey)}</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{t(bodyKey)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function WhatToExpectSection() {
  const t = useTranslations('howItWorks');
  const items = ['expect1', 'expect2', 'expect3', 'expect4'] as const;

  return (
    <div className="mt-14 rounded-xl border border-border bg-muted/40 p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">{t('expectTitle')}</h2>
      <ul className="space-y-2">
        {items.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 text-foreground">✓</span>
            {t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CtaSection() {
  const t = useTranslations('howItWorks');
  return (
    <div className="mt-14 text-center">
      <Link
        href="/aanbod"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-8 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
      >
        {t('ctaButton')}
      </Link>
    </div>
  );
}
