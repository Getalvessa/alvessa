'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveProfileAction, type ProfileData } from './actions';

export default function ProfileForm({ initial }: { initial: ProfileData }) {
  const t = useTranslations('dashboard.profile');

  const [form, setForm] = useState<ProfileData>(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function handleChange(field: keyof ProfileData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (status !== 'idle') setStatus('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const result = await saveProfileAction(form);
    setStatus(result.error ? 'error' : 'saved');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t('displayNameLabel')}
        </label>
        <input
          type="text"
          value={form.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t('bioLabel')}
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          rows={5}
          placeholder={t('bioPlaceholder')}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t('cityLabel')}
        </label>
        <input
          type="text"
          value={form.city}
          onChange={(e) => handleChange('city', e.target.value)}
          required
          placeholder={t('cityPlaceholder')}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
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
