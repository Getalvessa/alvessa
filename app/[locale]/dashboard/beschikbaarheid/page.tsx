import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import AvailabilityForm from './availability-form';
import type { DaySchedule } from './actions';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard.availability' });
  return { title: `${t('title')} — Alvessa` };
}

async function getSchedules(): Promise<DaySchedule[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!provider) return [];

  const { data } = await supabase
    .from('availability_schedules')
    .select('day_of_week, start_time, end_time, is_active')
    .eq('provider_id', provider.id);

  return (data ?? []).map((row) => ({
    dayOfWeek: row.day_of_week,
    isActive:  row.is_active,
    startTime: row.start_time.slice(0, 5),
    endTime:   row.end_time.slice(0, 5),
  }));
}

export default async function AvailabilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const schedules = await getSchedules();

  return <PageContent schedules={schedules} />;
}

function PageContent({ schedules }: { schedules: DaySchedule[] }) {
  const t = useTranslations('dashboard.availability');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <AvailabilityForm initialSchedules={schedules} />
    </div>
  );
}
