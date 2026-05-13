import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProvidersTable from './providers-table';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.providers' });
  return { title: `${t('title')} — Admin — Zenzo` };
}

type ProviderRow = {
  id: string;
  slug: string;
  city: string;
  is_verified: boolean;
  is_active: boolean;
  profile: { display_name: string } | null;
};

async function getAllProviders(): Promise<ProviderRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('providers')
    .select(`id, slug, city, is_verified, is_active, profile:profiles!providers_profile_id_fkey(display_name)`)
    .order('created_at', { ascending: false });

  return (data ?? []) as unknown as ProviderRow[];
}

export default async function AdminProvidersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const providers = await getAllProviders();

  return <PageContent providers={providers} />;
}

function PageContent({ providers }: { providers: ProviderRow[] }) {
  const t = useTranslations('admin.providers');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
      <ProvidersTable providers={providers} />
    </div>
  );
}
