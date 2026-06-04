'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { approveApplicationAction, rejectApplicationAction } from './actions';
import type { ApplicationRow } from './page';

type FeedbackEntry = { message: string; showDashboardLink?: boolean };

export default function ApplicationsList({ applications }: { applications: ApplicationRow[] }) {
  const t = useTranslations('admin.providers');
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, FeedbackEntry>>({});

  const visible = applications.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('applicationsEmpty')}</p>;
  }

  async function handleApprove(app: ApplicationRow) {
    setBusy(app.id);
    try {
      const result = await approveApplicationAction(app.id);
      if (result.error) {
        setFeedback((prev) => ({ ...prev, [app.id]: { message: t('appActionError') } }));
        return;
      }
      const msg = result.userFound
        ? result.providerCreated
          ? t('appApproveSuccessLinked')
          : t('appApproveSuccess')
        : t('appApproveSuccessNoUser');
      if (!result.userFound) {
        setFeedback((prev) => ({ ...prev, [app.id]: { message: msg } }));
        // No account registered yet — clear the message after 5 s so admin can retry.
        setTimeout(
          () => setFeedback((prev) => { const next = { ...prev }; delete next[app.id]; return next; }),
          5000,
        );
        return;
      }
      setFeedback((prev) => ({ ...prev, [app.id]: { message: msg, showDashboardLink: true } }));
      setTimeout(() => {
        setDismissed((prev) => new Set(prev).add(app.id));
        router.refresh();
      }, 5000);
    } catch {
      setFeedback((prev) => ({ ...prev, [app.id]: { message: t('appActionError') } }));
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(app: ApplicationRow) {
    setBusy(`reject-${app.id}`);
    try {
      const { error } = await rejectApplicationAction(app.id);
      if (error) {
        setFeedback((prev) => ({ ...prev, [app.id]: { message: t('appActionError') } }));
        return;
      }
      setFeedback((prev) => ({ ...prev, [app.id]: { message: t('appRejectSuccess') } }));
      setDismissed((prev) => new Set(prev).add(app.id));
      router.refresh();
    } catch {
      setFeedback((prev) => ({ ...prev, [app.id]: { message: t('appActionError') } }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColName')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColEmail')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColPhone')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColCity')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColServices')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColExperience')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColDate')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColActions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visible.map((app) => {
            const isApproving = busy === app.id;
            const isRejecting = busy === `reject-${app.id}`;
            const isBusy = isApproving || isRejecting;
            const entry = feedback[app.id];

            return (
              <tr key={app.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">{app.full_name}</td>
                <td className="px-4 py-3 text-foreground">{app.email}</td>
                <td className="px-4 py-3 text-foreground">{app.phone}</td>
                <td className="px-4 py-3 text-foreground">{app.city}</td>
                <td className="max-w-[180px] truncate px-4 py-3 text-foreground">{app.service_types}</td>
                <td className="px-4 py-3 text-foreground">{app.experience_years ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(app.created_at).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  {entry ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{entry.message}</span>
                      {entry.showDashboardLink && (
                        <Link
                          href="/dashboard"
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          {t('appOpenDashboard')}
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        disabled={isBusy}
                        onClick={() => handleApprove(app)}
                        className="rounded-lg bg-foreground px-2.5 py-1 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                      >
                        {isApproving ? '…' : t('appActionApprove')}
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={() => handleReject(app)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        {isRejecting ? '…' : t('appActionReject')}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
