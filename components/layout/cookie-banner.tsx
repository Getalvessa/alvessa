'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

const STORAGE_KEY = 'zenzo_cookie_consent';

export default function CookieBanner() {
  const t = useTranslations('cookie');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      Promise.resolve().then(() => setVisible(true));
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  }

  function handleReject() {
    localStorage.setItem(STORAGE_KEY, 'rejected');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{t('title')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('body')}{' '}
            <Link
              href="/privacybeleid"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {t('privacyLinkText')}
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={handleReject}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            {t('reject')}
          </button>
          <button
            onClick={handleAccept}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
          >
            {t('accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
