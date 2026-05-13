'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  approveProviderAction,
  deactivateProviderAction,
  activateProviderAction,
} from './actions';

type ProviderRow = {
  id: string;
  slug: string;
  city: string;
  is_verified: boolean;
  is_active: boolean;
  profile: { display_name: string } | null;
};

export default function ProvidersTable({ providers }: { providers: ProviderRow[] }) {
  const t = useTranslations('admin.providers');
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  async function handle(
    id: string,
    action: (id: string) => Promise<{ error: string | null }>,
    successMsg: string,
  ) {
    setBusy(id);
    const { error } = await action(id);
    setFeedback((prev) => ({ ...prev, [id]: error ? t('actionError') : successMsg }));
    setBusy(null);
  }

  if (providers.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {[t('colName'), t('colSlug'), t('colCity'), t('colStatus'), t('colActions')].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => {
            const statusLabel = !p.is_active
              ? t('statusInactive')
              : p.is_verified
              ? t('statusVerified')
              : t('statusPending');

            const statusColor = !p.is_active
              ? 'bg-muted text-muted-foreground'
              : p.is_verified
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';

            return (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">
                  {p.profile?.display_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.city}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {!p.is_verified && p.is_active && (
                      <button
                        disabled={busy === p.id}
                        onClick={() => handle(p.id, approveProviderAction, t('approveSuccess'))}
                        className="rounded-lg bg-foreground px-3 py-1 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                      >
                        {t('actionApprove')}
                      </button>
                    )}
                    {p.is_active ? (
                      <button
                        disabled={busy === p.id}
                        onClick={() => handle(p.id, deactivateProviderAction, t('deactivateSuccess'))}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        {t('actionDeactivate')}
                      </button>
                    ) : (
                      <button
                        disabled={busy === p.id}
                        onClick={() => handle(p.id, activateProviderAction, t('approveSuccess'))}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        {t('actionActivate')}
                      </button>
                    )}
                    {feedback[p.id] && (
                      <span className="text-xs text-muted-foreground">{feedback[p.id]}</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
