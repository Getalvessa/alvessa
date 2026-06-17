import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Clock, FileText, Banknote, CheckCircle, Award } from 'lucide-react';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forProviders' });
  return buildMetadata({ locale, path: 'voor-masseurs', title: t('metaTitle'), description: t('metaDescription') });
}

export default async function ForProvidersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <PageHeader />
      <FoundingTherapistSection />
      <AmbassadorSection />
      <ReassuranceSection />
      <BenefitsSection />
      <RequirementsSection />
      <HowToApplySection />
      <CtaSection />
    </div>
  );
}

function PageHeader() {
  const t = useTranslations('forProviders');
  return (
    <div className="mb-12">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('pageTitle')}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{t('pageSubtitle')}</p>
      <p className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        {t('cityEvaluationNote')}
      </p>
    </div>
  );
}

function FoundingTherapistSection() {
  const t = useTranslations('forProviders');
  const benefits = [
    'foundingBenefit1',
    'foundingBenefit2',
    'foundingBenefit3',
    'foundingBenefit4',
    'foundingBenefit5',
    'foundingBenefit6',
  ] as const;

  return (
    <section className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 dark:border-amber-700/40 dark:bg-amber-900/10">
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-transparent dark:text-amber-400">
          <Award className="h-3 w-3" />
          {t('foundingTag')}
        </span>
      </div>
      <h2 className="mt-3 text-xl font-bold text-foreground">{t('foundingTitle')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('foundingSubtitle')}</p>
      <ul className="mt-5 space-y-2">
        {benefits.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            {t(key)}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs font-medium text-amber-700 dark:text-amber-400">
        {t('foundingSpots')}
      </p>
      <Link
        href="/voor-masseurs/aanmelden"
        className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-amber-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
      >
        {t('ctaApplyButton')}
      </Link>
    </section>
  );
}

function BenefitsSection() {
  const t = useTranslations('forProviders');
  const benefits = [
    { icon: Clock,    titleKey: 'benefit1Title' as const, descKey: 'benefit1Desc' as const },
    { icon: FileText, titleKey: 'benefit2Title' as const, descKey: 'benefit2Desc' as const },
    { icon: Banknote, titleKey: 'benefit3Title' as const, descKey: 'benefit3Desc' as const },
  ];

  return (
    <section className="mb-12">
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
  );
}

function RequirementsSection() {
  const t = useTranslations('forProviders');
  const reqs = ['req1', 'req2', 'req3', 'req4', 'req5'] as const;

  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-semibold text-foreground">{t('requirementsTitle')}</h2>
      <ul className="space-y-3">
        {reqs.map((key) => (
          <li key={key} className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <span className="text-sm text-muted-foreground">{t(key)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HowToApplySection() {
  const t = useTranslations('forProviders');
  const steps = ['howStep1', 'howStep2', 'howStep3'] as const;

  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-semibold text-foreground">{t('howTitle')}</h2>
      <ol className="space-y-4">
        {steps.map((key, i) => (
          <li key={key} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground">
              {i + 1}
            </span>
            <p className="pt-0.5 text-sm leading-relaxed text-muted-foreground">{t(key)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AmbassadorSection() {
  const t = useTranslations('forProviders');
  const rewards = [
    'ambassadorReward1',
    'ambassadorReward2',
    'ambassadorReward3',
  ] as const;

  return (
    <section className="mb-12 rounded-2xl border border-border bg-muted/30 px-6 py-8">
      <h2 className="text-xl font-bold text-foreground">{t('ambassadorTitle')}</h2>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{t('ambassadorSubtitle')}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('ambassadorDesc')}</p>
      <ul className="mt-4 space-y-2">
        {rewards.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
            {t(key)}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-muted-foreground">{t('ambassadorNote')}</p>
    </section>
  );
}

function ReassuranceSection() {
  const t = useTranslations('forProviders');
  const items = [
    'reassuranceItem1',
    'reassuranceItem2',
    'reassuranceItem3',
    'reassuranceItem4',
    'reassuranceItem5',
    'reassuranceItem6',
    'reassuranceItem7',
    'reassuranceItem8',
    'reassuranceItem9',
  ] as const;

  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-semibold text-foreground">{t('reassuranceTitle')}</h2>
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {items.map((key) => (
          <li key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 shrink-0 text-foreground/60" />
            {t(key)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CtaSection() {
  const t = useTranslations('forProviders');
  return (
    <div className="rounded-xl bg-foreground p-8 text-center">
      <h2 className="text-xl font-bold text-background">{t('ctaTitle')}</h2>
      <p className="mt-2 text-sm text-background/70">{t('ctaBody')}</p>
      <Link
        href="/voor-masseurs/aanmelden"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-background px-8 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
      >
        {t('ctaApplyButton')}
      </Link>
    </div>
  );
}
