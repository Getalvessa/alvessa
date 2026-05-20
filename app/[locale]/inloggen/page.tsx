import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { LoginForm } from './login-form';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ redirect_to?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: `${t('loginTitle')} — Alvessa`, robots: { index: false, follow: false } };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { redirect_to } = await searchParams;
  setRequestLocale(locale);
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <LoginForm redirectTo={redirect_to} />
      </div>
    </div>
  );
}
