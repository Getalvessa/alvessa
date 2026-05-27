import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Clock, FileText, Banknote, CheckCircle } from 'lucide-react';
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
    </div>
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
