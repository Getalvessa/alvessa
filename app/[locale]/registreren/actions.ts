'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AuthState } from '@/app/[locale]/inloggen/actions';

function mapError(message: string): string {
  if (message.toLowerCase().includes('already registered')) return 'errorEmailTaken';
  if (message.toLowerCase().includes('password')) return 'errorWeakPassword';
  return 'errorGeneric';
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = (formData.get('name') as string).trim();
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) return { error: mapError(error.message) };

  // Email confirmation required — show check-email screen
  if (!data.session) return { error: null, email };

  redirect('/mijn-boekingen');
}
