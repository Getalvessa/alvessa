import { getTranslations, setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { Mail } from 'lucide-react';
import { buildMetadata } from '@/lib/metadata';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return buildMetadata({ locale, path: 'contact', title: t('metaTitle'), description: t('metaDescription') });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <PageHeader />
      <ContactCards />
      <ResponseNote />
      <FaqNote />
    </div>
  );
}

function PageHeader() {
  const t = useTranslations('contact');
  return (
    <div className="mb-10">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('pageTitle')}
      </h1>
      <p className="mt-3 text-muted-foreground">{t('pageSubtitle')}</p>
    </div>
  );
}

function ContactCards() {
  const t = useTranslations('contact');
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Mail className="h-4 w-4" />
          {t('generalTitle')}
        </div>
        <a
          href={`mailto:${t('generalEmail')}`}
          className="mt-2 block text-sm text-foreground underline underline-offset-4 hover:no-underline"
        >
          {t('generalEmail')}
        </a>
        <p className="mt-1 text-xs text-muted-foreground">{t('generalNote')}</p>
      </div>

      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Mail className="h-4 w-4" />
          {t('providersTitle')}
        </div>
        <a
          href={`mailto:${t('providersEmail')}`}
          className="mt-2 block text-sm text-foreground underline underline-offset-4 hover:no-underline"
        >
          {t('providersEmail')}
        </a>
        <p className="mt-1 text-xs text-muted-foreground">{t('providersNote')}</p>
      </div>
    </div>
  );
}

function ResponseNote() {
  const t = useTranslations('contact');
  return (
    <div className="mt-8 rounded-xl bg-muted/40 px-5 py-4">
      <p className="text-sm font-medium text-foreground">{t('responseTitle')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('responseBody')}</p>
    </div>
  );
}

function FaqNote() {
  const t = useTranslations('contact');
  return (
    <p className="mt-8 text-center text-sm text-muted-foreground">
      {t('faqNote')}{' '}
      <Link
        href="/faq"
        className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
      >
        {t('faqLink')}
      </Link>
    </p>
  );
}
