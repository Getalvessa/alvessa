'use server';

import { createClient } from '@/lib/supabase/server';

export type DaySchedule = {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
};

export async function saveAvailabilityAction(
  schedules: DaySchedule[],
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  if (!provider) return { error: 'Provider not found' };

  const rows = schedules.map((s) => ({
    provider_id: provider.id,
    day_of_week: s.dayOfWeek,
    start_time:  s.startTime,
    end_time:    s.endTime,
    is_active:   s.isActive,
  }));

  const { error } = await supabase
    .from('availability_schedules')
    .upsert(rows, { onConflict: 'provider_id,day_of_week' });

  if (error) return { error: error.message };
  return { error: null };
}
