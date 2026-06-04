'use server';

import { createClient } from '@/lib/supabase/server';

export type DaySchedule = {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
};

const TIME_RE = /^\d{2}:\d{2}$/;

function validateSchedules(schedules: DaySchedule[]): string | null {
  if (!Array.isArray(schedules) || schedules.length === 0) return 'No schedules provided';
  for (const s of schedules) {
    if (!Number.isInteger(s.dayOfWeek) || s.dayOfWeek < 0 || s.dayOfWeek > 6) {
      return `Invalid dayOfWeek: ${s.dayOfWeek}`;
    }
    if (!TIME_RE.test(s.startTime) || !TIME_RE.test(s.endTime)) {
      return `Invalid time format for day ${s.dayOfWeek}`;
    }
    if (s.isActive && s.startTime >= s.endTime) {
      return `startTime must be before endTime for day ${s.dayOfWeek}`;
    }
  }
  return null;
}

export async function saveAvailabilityAction(
  schedules: DaySchedule[],
): Promise<{ error: string | null }> {
  const validationError = validateSchedules(schedules);
  if (validationError) return { error: validationError };

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
