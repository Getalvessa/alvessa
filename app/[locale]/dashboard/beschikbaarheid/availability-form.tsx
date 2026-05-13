'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveAvailabilityAction, type DaySchedule } from './actions';

// Display order: Mon → Sun
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_START = '09:00';
const DEFAULT_END   = '17:00';

type Props = {
  initialSchedules: DaySchedule[];
};

export default function AvailabilityForm({ initialSchedules }: Props) {
  const t = useTranslations('dashboard.availability');

  const [schedules, setSchedules] = useState<DaySchedule[]>(() =>
    DAY_ORDER.map((dow) => {
      const existing = initialSchedules.find((s) => s.dayOfWeek === dow);
      return (
        existing ?? {
          dayOfWeek: dow,
          isActive:  false,
          startTime: DEFAULT_START,
          endTime:   DEFAULT_END,
        }
      );
    }),
  );

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function update(dayOfWeek: number, patch: Partial<DaySchedule>) {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, ...patch } : s)),
    );
    if (status !== 'idle') setStatus('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const result = await saveAvailabilityAction(schedules);
    setStatus(result.error ? 'error' : 'saved');
  }

  const dayLabel = (dow: number) =>
    t(`day${dow}` as 'day0' | 'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'day6');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        {schedules.map((s) => (
          <div
            key={s.dayOfWeek}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4"
          >
            <label className="flex w-32 shrink-0 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={s.isActive}
                onChange={(e) => update(s.dayOfWeek, { isActive: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-foreground"
              />
              <span className="text-sm font-medium text-foreground">{dayLabel(s.dayOfWeek)}</span>
            </label>

            {s.isActive && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">{t('from')}</label>
                  <input
                    type="time"
                    value={s.startTime}
                    onChange={(e) => update(s.dayOfWeek, { startTime: e.target.value })}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">{t('until')}</label>
                  <input
                    type="time"
                    value={s.endTime}
                    onChange={(e) => update(s.dayOfWeek, { endTime: e.target.value })}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    required
                  />
                </div>
              </div>
            )}

            {!s.isActive && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        ))}
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
