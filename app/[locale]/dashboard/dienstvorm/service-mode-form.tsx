'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveServiceModeAction, type ServiceModeData } from './actions';
import type { ServiceMode } from '@/lib/types/service-mode';

export default function ServiceModeForm({ initial }: { initial: ServiceModeData }) {
  const t = useTranslations('serviceMode');

  const [form, setForm] = useState<ServiceModeData>(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function setMode(mode: ServiceMode) {
    setForm((prev) => ({ ...prev, service_mode: mode }));
    if (status !== 'idle') setStatus('idle');
  }

  function setField<K extends keyof ServiceModeData>(key: K, value: ServiceModeData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (status !== 'idle') setStatus('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const result = await saveServiceModeAction(form);
    setStatus(result.error ? 'error' : 'saved');
  }

  const showStudio = form.service_mode === 'studio_only' || form.service_mode === 'hybrid';
  const showMobile = form.service_mode === 'mobile_only' || form.service_mode === 'hybrid';

  const modeOptions: { value: ServiceMode; label: string }[] = [
    { value: 'studio_only', label: t('studioOnly') },
    { value: 'mobile_only', label: t('mobileOnly') },
    { value: 'hybrid',      label: t('hybrid') },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      {/* Service mode selector */}
      <div className="space-y-2">
        {modeOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
              form.service_mode === value
                ? 'border-foreground bg-foreground/5'
                : 'border-border hover:border-foreground/30'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                form.service_mode === value
                  ? 'border-foreground bg-foreground'
                  : 'border-border'
              }`}
            >
              {form.service_mode === value && (
                <span className="h-2 w-2 rounded-full bg-background" />
              )}
            </span>
            <span className="text-sm font-medium text-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* Studio fields */}
      {showStudio && (
        <fieldset className="space-y-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">{t('studioSection')}</legend>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{t('studioCityLabel')}</label>
            <input
              type="text"
              value={form.studio_city}
              onChange={(e) => setField('studio_city', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{t('studioPostcodeLabel')}</label>
            <input
              type="text"
              value={form.studio_postcode}
              onChange={(e) => setField('studio_postcode', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{t('studioNotesLabel')}</label>
            <textarea
              value={form.studio_notes}
              onChange={(e) => setField('studio_notes', e.target.value)}
              placeholder={t('studioNotesPlaceholder')}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        </fieldset>
      )}

      {/* Mobile fields */}
      {showMobile && (
        <fieldset className="space-y-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">{t('mobileSection')}</legend>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">{t('mobileRadiusLabel')}</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.mobile_radius_km ?? ''}
                onChange={(e) => setField('mobile_radius_km', e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">{t('mobileTravelFeeLabel')}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.mobile_travel_fee_cents !== null ? (form.mobile_travel_fee_cents / 100).toFixed(2) : ''}
                onChange={(e) => {
                  const euros = parseFloat(e.target.value);
                  setField('mobile_travel_fee_cents', isNaN(euros) ? null : Math.round(euros * 100));
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{t('mobileNotesLabel')}</label>
            <textarea
              value={form.mobile_notes}
              onChange={(e) => setField('mobile_notes', e.target.value)}
              placeholder={t('mobileNotesPlaceholder')}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        </fieldset>
      )}

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
