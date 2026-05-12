import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <PageHeader />
      <QAList />
      <StillHaveQuestions />
    </div>
  );
}

function PageHeader() {
  const t = useTranslations('faq');
  return (
    <div className="mb-10">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('pageTitle')}
      </h1>
      <p className="mt-3 text-muted-foreground">{t('pageSubtitle')}</p>
    </div>
  );
}

function QAList() {
  const t = useTranslations('faq');
  const pairs = [
    { q: 'q1', a: 'a1' },
    { q: 'q2', a: 'a2' },
    { q: 'q3', a: 'a3' },
    { q: 'q4', a: 'a4' },
    { q: 'q5', a: 'a5' },
    { q: 'q6', a: 'a6' },
    { q: 'q7', a: 'a7' },
  ] as const;

  return (
    <dl className="divide-y divide-border">
      {pairs.map(({ q, a }) => (
        <div key={q} className="py-6">
          <dt className="text-base font-semibold text-foreground">{t(q)}</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(a)}</dd>
        </div>
      ))}
    </dl>
  );
}

function StillHaveQuestions() {
  const t = useTranslations('faq');
  return (
    <div className="mt-12 rounded-xl border border-border p-6 text-center">
      <p className="font-semibold text-foreground">{t('stillTitle')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('stillBody')}</p>
      <Link
        href="/contact"
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
      >
        {t('contactLink')}
      </Link>
    </div>
  );
}
