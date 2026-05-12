'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { registerAction } from './actions';

export function RegisterForm() {
  const t = useTranslations('auth');
  const [state, action, isPending] = useActionState(registerAction, { error: null });

  // Email confirmation pending
  if (state.email) {
    return (
      <div className="text-center">
        <div className="mb-4 text-4xl">📬</div>
        <h1 className="mb-2 text-xl font-bold text-foreground">{t('checkEmail')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('checkEmailDesc', { email: state.email })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-foreground">{t('registerTitle')}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {t('registerSubtitle')}{' '}
        <Link href="/inloggen" className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
          {t('registerLoginLink')}
        </Link>
      </p>

      <form action={action} className="space-y-4">
        {state.error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t(state.error as Parameters<typeof t>[0])}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            {t('nameLabel')}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder={t('namePlaceholder')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t('emailLabel')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t('emailPlaceholder')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            {t('passwordLabel')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={t('passwordPlaceholder')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
        >
          {isPending ? t('registering') : t('registerButton')}
        </button>
      </form>
    </div>
  );
}
