'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

type FilterMode = 'all' | 'studio' | 'home';

export function ServiceModeFilter({ current }: { current: FilterMode }) {
  const t = useTranslations('serviceMode');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(mode: FilterMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === 'all') {
      params.delete('mode');
    } else {
      params.set('mode', mode);
    }
    const qs = params.toString();
    router.push(pathname + (qs ? `?${qs}` : ''));
  }

  const options: { value: FilterMode; label: string }[] = [
    { value: 'all',    label: t('filterAll') },
    { value: 'studio', label: t('filterStudio') },
    { value: 'home',   label: t('filterMobile') },
  ];

  return (
    <div className="flex gap-2">
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setFilter(value)}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            current === value
              ? 'border-foreground bg-foreground text-background'
              : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
