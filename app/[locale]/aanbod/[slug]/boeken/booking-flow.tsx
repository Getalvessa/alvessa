'use client';

import { useState, useEffect, useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { createBooking } from './actions';

// Amsterdam UTC+2 (CEST) — fixed offset for MVP
const TZ_OFFSET_H = 2;

type Service = {
  id: string;
  custom_price_cents: number | null;
  services: {
    id: string;
    name_nl: string;
    name_en: string;
    duration_minutes: number;
    base_price_cents: number;
  } | null;
};

type Provider = {
  id: string;
  slug: string;
  city: string;
  profiles: { display_name: string } | null;
  provider_services: Service[];
};

function getPrice(svc: Service): number {
  return svc.custom_price_cents ?? svc.services!.base_price_cents;
}

/** "HH:MM" (Amsterdam local) + YYYY-MM-DD → UTC ISO string */
function toUTCiso(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - TZ_OFFSET_H, m)).toISOString();
}

function formatDate(date: string, locale: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    locale === 'nl' ? 'nl-NL' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  const t = useTranslations('booking');
  return (
    <div className="mb-8 flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold
              ${i + 1 < step ? 'bg-foreground text-background'
              : i + 1 === step ? 'border-2 border-foreground text-foreground'
              : 'border border-border text-muted-foreground'}`}
          >
            {i + 1 < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < total - 1 && <div className="h-px w-8 bg-border" />}
        </div>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        {t('step', { current: step, total })}
      </span>
    </div>
  );
}

// ── Step 1: Service selection ─────────────────────────────────────────────────

function ServiceStep({
  services, locale, selected, onSelect, onNext,
}: {
  services: Service[];
  locale: string;
  selected: Service | null;
  onSelect: (s: Service) => void;
  onNext: () => void;
}) {
  const t = useTranslations('booking');
  const tProviders = useTranslations('providers');

  return (
    <div>
      <h2 className="mb-5 text-xl font-semibold text-foreground">{t('step1Title')}</h2>
      <div className="space-y-3">
        {services.map((svc) => {
          const name = locale === 'nl' ? svc.services!.name_nl : svc.services!.name_en;
          const price = getPrice(svc);
          const isSelected = selected?.id === svc.id;

          return (
            <button
              key={svc.id}
              type="button"
              onClick={() => onSelect(svc)}
              className={`w-full rounded-xl border p-4 text-left transition-colors
                ${isSelected ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{name}</span>
                <span className="text-sm font-semibold text-foreground">€{Math.floor(price / 100)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {tProviders('duration', { minutes: svc.services!.duration_minutes })}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!selected}
        onClick={onNext}
        className="mt-6 w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
      >
        {t('next')}
      </button>
    </div>
  );
}

// ── Step 2: Date & time ───────────────────────────────────────────────────────

function DateTimeStep({
  providerId, duration, locale, date, slot,
  onDateChange, onSlotChange, onNext, onBack,
}: {
  providerId: string;
  duration: number;
  locale: string;
  date: string;
  slot: string;
  onDateChange: (d: string) => void;
  onSlotChange: (s: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const t = useTranslations('booking');
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setFetched(false);
    onSlotChange('');
    fetch(`/api/availability?provider_id=${providerId}&date=${date}&duration=${duration}`)
      .then((r) => r.json())
      .then(({ slots: s }) => { setSlots(s ?? []); setFetched(true); })
      .finally(() => setLoading(false));
  }, [date, providerId, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h2 className="mb-5 text-xl font-semibold text-foreground">{t('step2Title')}</h2>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{t('dateLabel')}</label>
        <input
          type="date"
          value={date}
          min={today}
          max={maxDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>

      {date && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-medium text-foreground">{t('timeLabel')}</p>
          {loading && <p className="text-sm text-muted-foreground">{t('loadingSlots')}</p>}
          {fetched && slots.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('noSlots')}</p>
          )}
          {slots.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSlotChange(s)}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors
                    ${slot === s ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/40'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted">
          {t('back')}
        </button>
        <button type="button" disabled={!date || !slot} onClick={onNext}
          className="flex-1 rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-40">
          {t('next')}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Address ───────────────────────────────────────────────────────────

function AddressStep({
  city, addressLine, addressNotes,
  onAddressLine, onAddressNotes, onNext, onBack,
}: {
  city: string;
  addressLine: string;
  addressNotes: string;
  onAddressLine: (v: string) => void;
  onAddressNotes: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const t = useTranslations('booking');

  return (
    <div>
      <h2 className="mb-5 text-xl font-semibold text-foreground">{t('step3Title')}</h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('addressLineLabel')}</label>
          <input
            type="text"
            value={addressLine}
            onChange={(e) => onAddressLine(e.target.value)}
            placeholder={t('addressLinePlaceholder')}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('addressCityLabel')}</label>
          <input
            type="text"
            value={city}
            readOnly
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('notesLabel')}</label>
          <textarea
            value={addressNotes}
            onChange={(e) => onAddressNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted">
          {t('back')}
        </button>
        <button type="button" disabled={!addressLine.trim()} onClick={onNext}
          className="flex-1 rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-40">
          {t('next')}
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Confirm ───────────────────────────────────────────────────────────

function ConfirmStep({
  provider, service, date, slot, addressLine, city, addressNotes, locale,
  formAction, isPending, error, onBack,
}: {
  provider: Provider;
  service: Service;
  date: string;
  slot: string;
  addressLine: string;
  city: string;
  addressNotes: string;
  locale: string;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const t = useTranslations('booking');
  const tAuth = useTranslations('auth');

  const name      = locale === 'nl' ? service.services!.name_nl : service.services!.name_en;
  const price     = getPrice(service);
  const scheduled = toUTCiso(date, slot);
  const displayDate = formatDate(date, locale);

  const rows = [
    { label: t('summaryService'), value: `${name} · ${service.services!.duration_minutes} min` },
    { label: t('summaryDate'),    value: displayDate },
    { label: t('summaryTime'),    value: slot },
    { label: t('summaryAddress'), value: `${addressLine}, ${city}` },
    { label: t('summaryPrice'),   value: `€${Math.floor(price / 100)}` },
  ];

  return (
    <div>
      <h2 className="mb-5 text-xl font-semibold text-foreground">{t('step4Title')}</h2>

      <dl className="mb-6 divide-y divide-border rounded-xl border border-border">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between px-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error === 'loginRequired' ? tAuth('errorGeneric') : t(error as Parameters<typeof t>[0])}
        </p>
      )}

      <form action={formAction}>
        <input type="hidden" name="provider_id"            value={provider.id} />
        <input type="hidden" name="provider_service_id"    value={service.id} />
        <input type="hidden" name="scheduled_at"           value={scheduled} />
        <input type="hidden" name="duration_minutes"       value={service.services!.duration_minutes} />
        <input type="hidden" name="address_line"           value={addressLine} />
        <input type="hidden" name="address_city"           value={city} />
        <input type="hidden" name="address_notes"          value={addressNotes} />
        <input type="hidden" name="total_cents"            value={price} />
        <input type="hidden" name="service_name_nl"        value={service.services!.name_nl} />
        <input type="hidden" name="service_name_en"        value={service.services!.name_en} />
        <input type="hidden" name="service_price_cents"    value={price} />
        <input type="hidden" name="provider_display_name"  value={provider.profiles?.display_name ?? provider.slug} />
        <input type="hidden" name="provider_slug"          value={provider.slug} />
        <input type="hidden" name="locale"                 value={locale} />

        <div className="flex gap-3">
          <button type="button" onClick={onBack}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            {t('back')}
          </button>
          <button type="submit" disabled={isPending}
            className="flex-1 rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60">
            {isPending ? t('submitting') : t('confirmButton')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Redirecting screen ────────────────────────────────────────────────────────

function RedirectingScreen() {
  const t = useTranslations('booking');
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <Loader2 className="mb-4 h-10 w-10 animate-spin text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{t('redirectingToPayment')}</p>
    </div>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export function BookingFlow({
  provider, locale, cancelled,
}: {
  provider: Provider;
  locale: string;
  cancelled?: boolean;
}) {
  const t = useTranslations('booking');

  const [step, setStep]                 = useState(1);
  const [service, setService]           = useState<Service | null>(null);
  const [date, setDate]                 = useState('');
  const [slot, setSlot]                 = useState('');
  const [addressLine, setAddressLine]   = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [redirecting, setRedirecting]   = useState(false);

  const [bookingState, formAction, isPending] = useActionState(createBooking, { error: null });

  useEffect(() => {
    if (bookingState.checkoutUrl) {
      setRedirecting(true);
      window.location.href = bookingState.checkoutUrl;
    }
  }, [bookingState.checkoutUrl]);

  if (redirecting) return <RedirectingScreen />;

  const city = provider.city;

  return (
    <div>
      <Link
        href={`/aanbod/${provider.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToProfile')}
      </Link>

      {cancelled && (
        <div className="mb-6 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {t('cancelledNotice')}
        </div>
      )}

      <StepIndicator step={step} total={4} />

      {step === 1 && (
        <ServiceStep
          services={provider.provider_services}
          locale={locale}
          selected={service}
          onSelect={setService}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && service && (
        <DateTimeStep
          providerId={provider.id}
          duration={service.services!.duration_minutes}
          locale={locale}
          date={date}
          slot={slot}
          onDateChange={setDate}
          onSlotChange={setSlot}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <AddressStep
          city={city}
          addressLine={addressLine}
          addressNotes={addressNotes}
          onAddressLine={setAddressLine}
          onAddressNotes={setAddressNotes}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && service && (
        <ConfirmStep
          provider={provider}
          service={service}
          date={date}
          slot={slot}
          addressLine={addressLine}
          city={city}
          addressNotes={addressNotes}
          locale={locale}
          formAction={formAction}
          isPending={isPending}
          error={bookingState.error}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}
