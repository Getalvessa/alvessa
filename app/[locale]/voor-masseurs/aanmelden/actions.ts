'use server';

import { createClient } from '@/lib/supabase/server';

export type ApplicationResult = { error: string | null };

export async function submitProviderApplicationAction(
  formData: FormData,
): Promise<ApplicationResult> {
  // Honeypot anti-spam: real users leave this empty
  if (formData.get('_honey')) return { error: null };

  const full_name            = formData.get('full_name')?.toString().trim() ?? '';
  const email                = formData.get('email')?.toString().trim() ?? '';
  const phone                = formData.get('phone')?.toString().trim() ?? '';
  const city                 = formData.get('city')?.toString().trim() || 'Utrecht';
  const service_types        = formData.get('service_types')?.toString().trim() ?? '';
  const works_mobile         = formData.get('works_mobile') === 'true';
  const service_area         = formData.get('service_area')?.toString().trim() || null;
  const experience_years_raw = formData.get('experience_years')?.toString().trim();
  const experience_years     = experience_years_raw
    ? Math.max(0, Math.min(80, parseInt(experience_years_raw, 10) || 0))
    : null;
  const instagram_or_website = formData.get('instagram_or_website')?.toString().trim() || null;
  const message              = formData.get('message')?.toString().trim() || null;

  if (!full_name || full_name.length < 2) return { error: 'required' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'email' };
  if (!phone) return { error: 'required' };
  if (!city) return { error: 'required' };
  if (!service_types) return { error: 'required' };

  const supabase = await createClient();
  const { error } = await supabase.from('provider_applications').insert({
    full_name,
    email,
    phone,
    city,
    service_types,
    works_mobile,
    service_area,
    experience_years,
    instagram_or_website,
    message,
    status: 'pending',
  });

  if (error) return { error: 'server' };
  return { error: null };
}
