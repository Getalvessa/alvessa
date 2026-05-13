import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from '@/components/dashboard/sidebar';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/inloggen');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_provider, display_name')
    .eq('id', user.id)
    .single();

  if (!profile?.is_provider) {
    redirect('/mijn-boekingen');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex gap-8 py-10">
        <DashboardSidebar displayName={profile.display_name} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
