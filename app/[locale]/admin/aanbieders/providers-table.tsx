'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  approveProviderAction,
  deactivateProviderAction,
  activateProviderAction,
  updateProviderTrustAction,
} from './actions';
import type { ProviderRow } from './page';

type ProviderStatus = 'new' | 'trusted' | 'core' | 'restricted' | 'banned';

type TrustEdit = {
  status: ProviderStatus;
  trust_level: number;
  internal_notes: string;
};

const STATUS_COLORS: Record<ProviderStatus, string> = {
  new: 'bg-muted text-muted-foreground',
  trusted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  core: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  restricted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  banned: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function ProvidersTable({ providers }: { providers: ProviderRow[] }) {
  const t = useTranslations('admin.providers');

  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [trustEdits, setTrustEdits] = useState<Record<string, TrustEdit>>(() =>
    Object.fromEntries(
      providers.map((p) => [
        p.id,
        {
          status: p.status,
          trust_level: p.trust_level,
          internal_notes: p.internal_notes ?? '',
        },
      ]),
    ),
  );

  async function handleAction(
    id: string,
    action: (id: string) => Promise<{ error: string | null }>,
    successMsg: string,
  ) {
    setBusy(id);
    const { error } = await action(id);
    setFeedback((prev) => ({ ...prev, [id]: error ? t('actionError') : successMsg }));
    setBusy(null);
  }

  async function handleSaveTrust(p: ProviderRow) {
    const edit = trustEdits[p.id];
    setBusy(`trust-${p.id}`);
    const { error } = await updateProviderTrustAction(p.id, {
      status: edit.status,
      trust_level: edit.trust_level,
      internal_notes: edit.internal_notes || null,
    });
    setFeedback((prev) => ({ ...prev, [`trust-${p.id}`]: error ? t('actionError') : t('trustSaved') }));
    setBusy(null);
  }

  if (providers.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <div className="space-y-4">
      {providers.map((p) => {
        const edit = trustEdits[p.id];
        const total = p.completed + p.cancelled;
        const completionPct = total > 0 ? Math.round((p.completed / total) * 100) : null;
        const cancellationPct = total > 0 ? Math.round((p.cancelled / total) * 100) : null;
        const isBusy = busy === p.id || busy === `trust-${p.id}`;

        return (
          <div key={p.id} className="rounded-xl border border-border bg-card">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-semibold text-foreground">
                  {p.profile?.display_name ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.slug} · {p.city}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 shrink-0">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    !p.is_active
                      ? 'bg-muted text-muted-foreground'
                      : p.is_verified
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}
                >
                  {!p.is_active
                    ? t('statusInactive')
                    : p.is_verified
                      ? t('statusVerified')
                      : t('statusPending')}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}
                >
                  {t(`trustStatus${p.status.charAt(0).toUpperCase()}${p.status.slice(1)}` as Parameters<typeof t>[0])}
                </span>
              </div>
            </div>

            {/* Trust + stats info row */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border px-5 py-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('colTrustLevel')}</p>
                <p className="font-medium">{p.trust_level} / 100</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('colReferredBy')}</p>
                <p className="font-medium">{p.referred_by_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('completedShort')}</p>
                <p className="font-medium">
                  {p.completed}
                  {completionPct !== null && (
                    <span className="ml-1 text-xs text-muted-foreground">({completionPct}%)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('cancelledShort')}</p>
                <p className="font-medium">
                  {p.cancelled}
                  {cancellationPct !== null && (
                    <span className="ml-1 text-xs text-muted-foreground">({cancellationPct}%)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Trust edit form */}
            <div className="border-t border-border px-5 py-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                {/* Status select */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">{t('colTrustStatus')}</label>
                  <select
                    value={edit.status}
                    disabled={isBusy}
                    onChange={(e) =>
                      setTrustEdits((prev) => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], status: e.target.value as ProviderStatus },
                      }))
                    }
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  >
                    {(['new', 'trusted', 'core', 'restricted', 'banned'] as ProviderStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {t(`trustStatus${s.charAt(0).toUpperCase()}${s.slice(1)}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Trust level input */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">{t('colTrustLevel')} (0–100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={edit.trust_level}
                    disabled={isBusy}
                    onChange={(e) =>
                      setTrustEdits((prev) => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], trust_level: Number(e.target.value) },
                      }))
                    }
                    className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Internal notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('colInternalNotes')}</label>
                <textarea
                  rows={2}
                  value={edit.internal_notes}
                  disabled={isBusy}
                  placeholder={t('notesPlaceholder')}
                  onChange={(e) =>
                    setTrustEdits((prev) => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], internal_notes: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </div>
            </div>

            {/* Action footer */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
              {!p.is_verified && p.is_active && (
                <button
                  disabled={isBusy}
                  onClick={() => handleAction(p.id, approveProviderAction, t('approveSuccess'))}
                  className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                >
                  {t('actionApprove')}
                </button>
              )}
              {p.is_active ? (
                <button
                  disabled={isBusy}
                  onClick={() => handleAction(p.id, deactivateProviderAction, t('deactivateSuccess'))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  {t('actionDeactivate')}
                </button>
              ) : (
                <button
                  disabled={isBusy}
                  onClick={() => handleAction(p.id, activateProviderAction, t('approveSuccess'))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  {t('actionActivate')}
                </button>
              )}
              <button
                disabled={isBusy}
                onClick={() => handleSaveTrust(p)}
                className="rounded-lg bg-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/20 disabled:opacity-50"
              >
                {t('actionSaveTrust')}
              </button>

              <div className="ml-auto flex gap-3">
                {feedback[p.id] && (
                  <span className="text-xs text-muted-foreground">{feedback[p.id]}</span>
                )}
                {feedback[`trust-${p.id}`] && (
                  <span className="text-xs text-muted-foreground">{feedback[`trust-${p.id}`]}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
