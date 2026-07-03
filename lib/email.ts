import 'server-only';
import { Resend } from 'resend';

// Lazily instantiated so missing RESEND_API_KEY doesn't crash the build.
// At runtime, if the key is absent, send functions will throw and the
// webhook catches that error without breaking payment confirmation.
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

const FROM = `Alvessa <${process.env.EMAIL_FROM ?? 'noreply@alvessa.nl'}>`;
const APP  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://alvessa.nl';

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam',
  });
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    weekday: 'short', day: 'numeric', month: 'short',
    timeZone: 'Europe/Amsterdam',
  });
}

function fmtAmount(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function buildTable(rows: [string, string][]): string {
  return rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 16px;color:#666;font-size:14px;border-bottom:1px solid #f0f0f0;white-space:nowrap;vertical-align:top">${esc(label)}</td>
        <td style="padding:10px 16px;font-size:14px;border-bottom:1px solid #f0f0f0;vertical-align:top">${esc(value)}</td>
      </tr>`)
    .join('');
}

function buildHtml(title: string, intro: string, tableRows: string, ctaUrl: string, ctaLabel: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:560px">
    <tr><td style="background:#111111;padding:20px 28px">
      <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:-0.3px">Alvessa</span>
    </td></tr>
    <tr><td style="padding:28px 28px 12px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#111;font-weight:bold">${esc(title)}</h1>
      <p style="margin:0;color:#555;font-size:15px;line-height:1.5">${intro}</p>
    </td></tr>
    <tr><td style="padding:16px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eeeeee;border-radius:6px;border-collapse:collapse">
        ${tableRows}
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 28px">
      <a href="${ctaUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:11px 22px;border-radius:6px;font-size:14px;font-weight:bold">${ctaLabel}</a>
    </td></tr>
    <tr><td style="padding:0 28px 24px;border-top:1px solid #f0f0f0">
      <p style="margin:16px 0 4px;color:#aaa;font-size:12px">Vragen? Mail naar <a href="mailto:hello@alvessa.nl" style="color:#777">hello@alvessa.nl</a></p>
      <p style="margin:0;color:#aaa;font-size:12px">KvK-nummer: 42069738</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Customer booking confirmation ─────────────────────────────────────────────

export type CustomerConfirmationData = {
  toEmail:        string;
  customerName:   string;
  serviceName:    string;
  scheduledAt:    string;
  durationMinutes: number;
  providerName:   string;
  appointmentType: string;
  addressCity:    string;
  addressLine:    string | null;
  totalCents:     number;
  bookingId:      string;
};

export async function sendCustomerConfirmation(d: CustomerConfirmationData): Promise<void> {
  const date   = fmtDate(d.scheduledAt);
  const isHome = d.appointmentType !== 'in_studio';
  const location = isHome
    ? `Aan huis — ${[d.addressLine, d.addressCity].filter(Boolean).join(', ')}`
    : 'Studio';

  const rows: [string, string][] = [
    ['Dienst',       `${d.serviceName} (${d.durationMinutes} min)`],
    ['Aanbieder',    d.providerName],
    ['Datum & tijd', date],
    ['Locatie',      location],
    ['Betaald',      fmtAmount(d.totalCents)],
    ['Boekingnummer', d.bookingId],
  ];

  const html = buildHtml(
    'Boeking bevestigd',
    `Hoi ${esc(d.customerName)}, je betaling is ontvangen en je afspraak is bevestigd.`,
    buildTable(rows),
    `${APP}/mijn-boekingen`,
    'Bekijk mijn boekingen',
  );

  const text = [
    'Boeking bevestigd — Alvessa',
    '',
    `Hoi ${d.customerName},`,
    'Je betaling is ontvangen en je afspraak is bevestigd.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Boekingen bekijken: ${APP}/mijn-boekingen`,
    '',
    'Vragen? Mail naar hello@alvessa.nl',
    'KvK-nummer: 42069738',
    'Het Alvessa-team',
  ].join('\n');

  const { error } = await getResend().emails.send({
    from: FROM,
    to:   d.toEmail,
    subject: `Boeking bevestigd — ${d.serviceName}`,
    html,
    text,
  });

  if (error) throw new Error(`Resend error (customer): ${error.message}`);
}

// ── Provider new booking notification ─────────────────────────────────────────

export type ProviderNotificationData = {
  toEmail:        string;
  providerName:   string;
  customerName:   string;
  customerEmail:  string;
  customerPhone:  string | null;
  serviceName:    string;
  scheduledAt:    string;
  durationMinutes: number;
  appointmentType: string;
  addressLine:    string | null;
  addressCity:    string;
  addressNotes:   string | null;
  totalCents:     number;
  bookingId:      string;
};

export async function sendProviderNotification(d: ProviderNotificationData): Promise<void> {
  const date   = fmtDate(d.scheduledAt);
  const isHome = d.appointmentType !== 'in_studio';

  const rows: [string, string][] = [
    ['Dienst',       `${d.serviceName} (${d.durationMinutes} min)`],
    ['Datum & tijd', date],
    ['Type',         isHome ? 'Aan huis' : 'Studio'],
  ];
  if (isHome) {
    rows.push(['Adres', [d.addressLine, d.addressCity].filter(Boolean).join(', ')]);
    if (d.addressNotes) rows.push(['Notities', d.addressNotes]);
  }
  rows.push(['Klant',        d.customerName]);
  rows.push(['E-mail klant', d.customerEmail]);
  if (d.customerPhone) rows.push(['Telefoon klant', d.customerPhone]);
  rows.push(['Bedrag',        fmtAmount(d.totalCents)]);
  rows.push(['Boekingnummer', d.bookingId]);

  const html = buildHtml(
    'Nieuwe boeking',
    `Hoi ${esc(d.providerName)}, je hebt een nieuwe bevestigde boeking ontvangen.`,
    buildTable(rows),
    `${APP}/dashboard/boekingen`,
    'Open dashboard',
  );

  const text = [
    'Nieuwe boeking — Alvessa',
    '',
    `Hoi ${d.providerName},`,
    'Je hebt een nieuwe bevestigde boeking ontvangen.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Dashboard: ${APP}/dashboard/boekingen`,
    '',
    'Vragen? Mail naar hello@alvessa.nl',
    'KvK-nummer: 42069738',
    'Het Alvessa-team',
  ].join('\n');

  const { error } = await getResend().emails.send({
    from: FROM,
    to:   d.toEmail,
    subject: `Nieuwe boeking — ${d.serviceName} op ${fmtDateShort(d.scheduledAt)}`,
    html,
    text,
  });

  if (error) throw new Error(`Resend error (provider): ${error.message}`);
}

// ── Operational alert: paid booking cancelled, manual refund required ─────────
// Sent when an admin or provider cancels a booking that was already paid
// ('confirmed' with a payment row). No automatic refund is issued — this alert
// tells the operator to process the refund manually in the Stripe dashboard.
// Recipient is ADMIN_EMAIL (the operational alert mailbox), never EMAIL_FROM.

export type RefundAlertData = {
  bookingId:   string;
  customerId:  string;
  providerId:  string;
  paymentId:   string | null;
  scheduledAt: string;
  cancelledBy: 'admin' | 'provider';
};

export async function sendRefundRequiredAlert(d: RefundAlertData): Promise<void> {
  const recipient = process.env.ADMIN_EMAIL;
  if (!recipient) {
    throw new Error('ADMIN_EMAIL is not set — cannot send manual-refund alert');
  }

  const rows: [string, string][] = [
    ['Action',       'Manual Stripe refund required'],
    ['Booking ID',   d.bookingId],
    ['Customer ID',  d.customerId],
    ['Provider ID',  d.providerId],
    ['Payment ID',   d.paymentId ?? '(no payment row found)'],
    ['Scheduled at', fmtDate(d.scheduledAt)],
    ['Cancelled by', d.cancelledBy],
  ];

  const html = buildHtml(
    'Manual refund required',
    'A paid (confirmed) booking was cancelled. No automatic refund is issued — process the refund manually in the Stripe dashboard.',
    buildTable(rows),
    `${APP}/admin/boekingen`,
    'Open admin bookings',
  );

  const text = [
    'Manual Stripe refund required — Alvessa',
    '',
    'A paid (confirmed) booking was cancelled. Process the refund manually in Stripe.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Admin: ${APP}/admin/boekingen`,
  ].join('\n');

  const { error } = await getResend().emails.send({
    from: FROM,
    to:   recipient,
    subject: `Manual refund required — booking ${d.bookingId}`,
    html,
    text,
  });

  if (error) throw new Error(`Resend error (refund alert): ${error.message}`);
}
