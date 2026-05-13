import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from './profile-form';
import type { ProfileData } from './actions';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard.profile' });
  return { title: `${t('title')} — Zenzo` };
}

async function getProfileData(): Promise<ProfileData | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: provider }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('providers').select('bio, city').eq('profile_id', user.id).single(),
  ]);

  if (!profile || !provider) return null;

  return {
    displayName: profile.display_name,
    bio:         provider.bio ?? '',
    city:        provider.city,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await getProfileData();

  return <PageContent data={data} />;
}

function PageContent({ data }: { data: ProfileData | null }) {
  const t = useTranslations('dashboard.profile');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
      {data && <ProfileForm initial={data} />}
    </div>
  );
}
