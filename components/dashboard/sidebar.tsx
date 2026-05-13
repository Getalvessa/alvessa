'use client';

import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { logoutAction } from '@/app/[locale]/inloggen/actions';

type NavItem = { key: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { key: 'overview',     href: '/dashboard' },
  { key: 'bookings',     href: '/dashboard/boekingen' },
  { key: 'availability', href: '/dashboard/beschikbaarheid' },
  { key: 'services',     href: '/dashboard/diensten' },
  { key: 'profile',      href: '/dashboard/profiel' },
  { key: 'earnings',     href: '/dashboard/inkomsten' },
];

export default function DashboardSidebar({ displayName }: { displayName: string }) {
  const t = useTranslations('dashboard.nav');
  const tNav = useTranslations('nav');
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0">
      <div className="sticky top-24 flex flex-col gap-1">
        <p className="mb-3 truncate px-3 text-sm font-semibold text-foreground">{displayName}</p>
        {NAV_ITEMS.map(({ key, href }) => {
          const active =
            key === 'overview'
              ? pathname === '/dashboard'
              : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {t(key)}
            </Link>
          );
        })}
        <div className="mt-4 border-t border-border pt-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {tNav('logout')}
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
