'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error: string | null; email?: string };

function mapError(message: string): string {
  if (message.toLowerCase().includes('invalid login')) return 'errorInvalidCredentials';
  if (message.toLowerCase().includes('already registered')) return 'errorEmailTaken';
  if (message.toLowerCase().includes('password')) return 'errorWeakPassword';
  return 'errorGeneric';
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get('email') as string).trim();
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirect_to') as string | null) ?? '/mijn-boekingen';

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: mapError(error.message) };

  redirect(redirectTo);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
