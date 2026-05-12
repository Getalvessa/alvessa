'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { loginAction } from './actions';

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const t = useTranslations('auth');
  const [state, action, isPending] = useActionState(loginAction, { error: null });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-foreground">{t('loginTitle')}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {t('loginSubtitle')}{' '}
        <Link href="/registreren" className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
          {t('loginRegisterLink')}
        </Link>
      </p>

      <form action={action} className="space-y-4">
        {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}

        {state.error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t(state.error as Parameters<typeof t>[0])}
          </p>
        )}

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
            autoComplete="current-password"
            required
            placeholder={t('passwordPlaceholder')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
        >
          {isPending ? t('loggingIn') : t('loginButton')}
        </button>
      </form>
    </div>
  );
}
