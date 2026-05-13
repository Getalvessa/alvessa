'use server';

import { createClient } from '@/lib/supabase/server';

export type ProfileData = {
  displayName: string;
  bio: string;
  city: string;
};

export async function saveProfileAction(
  data: ProfileData,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const [{ error: profileError }, { error: providerError }] = await Promise.all([
    supabase
      .from('profiles')
      .update({ display_name: data.displayName.trim() })
      .eq('id', user.id),
    supabase
      .from('providers')
      .update({ bio: data.bio.trim(), city: data.city.trim() })
      .eq('profile_id', user.id),
  ]);

  if (profileError) return { error: profileError.message };
  if (providerError) return { error: providerError.message };

  return { error: null };
}
