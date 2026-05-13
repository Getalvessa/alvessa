'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveServicesAction, type ServiceSetting } from './actions';

type ServiceRow = {
  id: string;
  nameNl: string;
  nameEn: string;
  basePriceCents: number;
  durationMinutes: number;
  isEnabled: boolean;
  customPriceCents: number | null;
};

type Props = {
  initialServices: ServiceRow[];
  locale: string;
};

export default function ServicesForm({ initialServices, locale }: Props) {
  const t = useTranslations('dashboard.services');

  const [services, setServices] = useState<ServiceRow[]>(initialServices);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function toggleService(id: string, enabled: boolean) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: enabled } : s)),
    );
    if (status !== 'idle') setStatus('idle');
  }

  function setCustomPrice(id: string, value: string) {
    const cents = value === '' ? null : Math.round(parseFloat(value) * 100);
    setServices((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, customPriceCents: isNaN(cents as number) ? null : cents } : s,
      ),
    );
    if (status !== 'idle') setStatus('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const settings: ServiceSetting[] = services.map((s) => ({
      serviceId:        s.id,
      isEnabled:        s.isEnabled,
      customPriceCents: s.customPriceCents,
    }));
    const result = await saveServicesAction(settings);
    setStatus(result.error ? 'error' : 'saved');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        {services.map((s) => {
          const name = locale === 'nl' ? s.nameNl : s.nameEn;
          const basePriceFormatted = `€${Math.floor(s.basePriceCents / 100)}`;
          const customPriceValue =
            s.customPriceCents !== null
              ? String(s.customPriceCents / 100)
              : '';

          return (
            <div key={s.id} className="rounded-xl border border-border p-4 space-y-3">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <div>
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t('duration', { minutes: s.durationMinutes })}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t('basePrice', { price: basePriceFormatted })}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={s.isEnabled}
                  onChange={(e) => toggleService(s.id, e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-foreground"
                />
              </label>

              {s.isEnabled && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    {t('customPriceLabel')}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">€</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={customPriceValue}
                      placeholder={t('customPricePlaceholder')}
                      onChange={(e) => setCustomPrice(s.id, e.target.value)}
                      className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {status === 'saving' ? t('saving') : t('saveButton')}
        </button>
        {status === 'saved' && (
          <p className="text-sm text-green-600 dark:text-green-400">{t('savedSuccess')}</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600 dark:text-red-400">{t('saveError')}</p>
        )}
      </div>
    </form>
  );
}
