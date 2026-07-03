'use client';

import { useTransition, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle } from 'lucide-react';
import { submitProviderApplicationAction } from './actions';
import { getRecruitmentCities } from '@/lib/cities';
import { detectCategoryFromFreeText, getCategoryBySlug } from '@/lib/categories';

type Props = {
  /** Pre-selected city slug in the city dropdown. */
  defaultCity?: string;
  /** When set, form copy is fixed to this category instead of free-text detection. */
  categorySlug?: string;
};

export default function ApplicationForm({ defaultCity = 'utrecht', categorySlug }: Props = {}) {
  const t = useTranslations('forProviders');
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedCity, setSelectedCity] = useState(defaultCity);
  const [selectedServiceTypes, setSelectedServiceTypes] = useState('');

  // Applicant free text has no DB record yet — keyword detection here is the
  // sanctioned exception, centralized in lib/categories.ts. Category-specific
  // recruitment pages pin the copy via `categorySlug` instead.
  const applicationCopy = (
    categorySlug
      ? getCategoryBySlug(categorySlug)
      : detectCategoryFromFreeText(selectedServiceTypes)
  ).capabilities.application;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitProviderApplicationAction(formData);
      if (result.error) {
        setServerError(result.error);
      } else {
        setSuccess(true);
        formRef.current?.reset();
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-xl border border-border p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
          <CheckCircle className="h-6 w-6 text-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{t('applySuccessTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('applySuccessBody')}</p>
      </div>
    );
  }

  const errorMsg =
    serverError === 'email'
      ? t('applyErrorEmail')
      : serverError
        ? t('applyErrorServer')
        : null;

  const inputClass =
    'mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  const cityOptions = getRecruitmentCities();

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot — must remain invisible and empty */}
      <input
        type="text"
        name="_honey"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-foreground">
          {t('applyLabelName')} <span className="text-destructive">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          autoComplete="name"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          {t('applyLabelEmail')} <span className="text-destructive">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-foreground">
          {t('applyLabelPhone')} <span className="text-destructive">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium text-foreground">
          {t('applyLabelCity')} <span className="text-destructive">*</span>
        </label>
        <select
          id="city"
          name="city"
          required
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className={inputClass}
        >
          {cityOptions.map((city) => (
            <option key={city.slug} value={city.slug}>
              {city.displayName}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">{t('applyCityHelper')}</p>
      </div>

      <div>
        <label htmlFor="service_types" className="block text-sm font-medium text-foreground">
          {t(applicationCopy.servicesLabelKey)}{' '}
          <span className="text-destructive">*</span>
        </label>
        <input
          id="service_types"
          name="service_types"
          type="text"
          required
          placeholder={t(applicationCopy.servicesPlaceholderKey)}
          onChange={(e) => setSelectedServiceTypes(e.target.value)}
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-foreground">
          {t(applicationCopy.serviceModeLabelKey)}{' '}
          <span className="text-destructive">*</span>
        </legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="service_mode"
              value="studio_only"
              required
              className="h-4 w-4 border-input accent-foreground"
            />
            <span className="text-sm text-foreground">{t('applyServiceModeStudio')}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="service_mode"
              value="mobile_only"
              defaultChecked
              required
              className="h-4 w-4 border-input accent-foreground"
            />
            <span className="text-sm text-foreground">{t('applyServiceModeMobile')}</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="service_mode"
              value="hybrid"
              required
              className="h-4 w-4 border-input accent-foreground"
            />
            <span className="text-sm text-foreground">{t('applyServiceModeHybrid')}</span>
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('applyServiceModeHelper')}</p>
      </fieldset>

      <div>
        <label htmlFor="service_area" className="block text-sm font-medium text-foreground">
          {t('applyLabelArea')}
        </label>
        <input
          id="service_area"
          name="service_area"
          type="text"
          placeholder={t('applyLabelAreaPh')}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="experience_years" className="block text-sm font-medium text-foreground">
          {t(applicationCopy.experienceLabelKey)}
        </label>
        <input
          id="experience_years"
          name="experience_years"
          type="number"
          min="0"
          max="80"
          className="mt-1 block w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="instagram_or_website" className="block text-sm font-medium text-foreground">
          {t('applyLabelWebsite')}
        </label>
        <input
          id="instagram_or_website"
          name="instagram_or_website"
          type="text"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-foreground">
          {t('applyLabelMessage')}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder={t('applyLabelMessagePh')}
          className="mt-1 block w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
      >
        {isPending ? '…' : t('applySubmit')}
      </button>
    </form>
  );
}
