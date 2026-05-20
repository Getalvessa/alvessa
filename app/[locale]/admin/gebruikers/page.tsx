import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.users' });
  return { title: `${t('title')} — Admin — Alvessa` };
}

type UserRow = {
  id: string;
  display_name: string;
  is_customer: boolean;
  is_provider: boolean;
  is_admin: boolean;
  created_at: string;
  email?: string;
};

async function getAllUsers(): Promise<UserRow[]> {
  // Use service-role client to join auth.users for email addresses.
  // The profiles table does not store email (that's in auth.users).
  // Admin viewing user email is a legitimate admin operation.
  const supabase = createServiceRoleClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, is_customer, is_provider, is_admin, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (!profiles) return [];

  // Fetch emails from auth.users for each profile
  const usersWithEmail: UserRow[] = await Promise.all(
    profiles.map(async (p) => {
      const { data: authUser } = await supabase.auth.admin.getUserById(p.id);
      return {
        ...p,
        email: authUser?.user?.email,
      };
    }),
  );

  return usersWithEmail;
}

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const users = await getAllUsers();

  return <PageContent users={users} locale={locale} />;
}

function PageContent({
  users,
  locale,
}: {
  users: UserRow[];
  locale: string;
}) {
  const t = useTranslations('admin.users');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {[t('colName'), t('colEmail'), t('colRoles'), t('colCreated')].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const roles = [
                  u.is_customer && t('roleCustomer'),
                  u.is_provider && t('roleProvider'),
                  u.is_admin    && t('roleAdmin'),
                ].filter(Boolean).join(', ');

                const date = new Date(u.created_at).toLocaleDateString(
                  locale === 'nl' ? 'nl-NL' : 'en-GB',
                  { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Amsterdam' },
                );

                return (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{u.display_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{roles}</td>
                    <td className="px-4 py-3 text-muted-foreground">{date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
