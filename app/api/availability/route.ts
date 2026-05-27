import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Amsterdam is UTC+2 (CEST, summer) — fixed offset for MVP.
// Phase 8: replace with proper IANA timezone handling.
const TZ_OFFSET_H = 2;

/** Convert an Amsterdam local date + HH:MM to a UTC ISO string. */
function toUTC(date: string, localHHMM: string): Date {
  const [h, m] = localHHMM.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - TZ_OFFSET_H, m));
}

/** Convert a UTC Date to an Amsterdam local HH:MM string. */
function toLocalHHMM(utc: Date): string {
  const h = (utc.getUTCHours() + TZ_OFFSET_H) % 24;
  const m = utc.getUTCMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function overlaps(
  slotStart: Date,
  durationMin: number,
  bookings: Array<{ scheduled_at: string; end_at: string }>,
): boolean {
  const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);
  return bookings.some((b) => {
    const bStart = new Date(b.scheduled_at);
    const bEnd = new Date(b.end_at);
    return slotStart < bEnd && slotEnd > bStart;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('provider_id');
  const date = searchParams.get('date');        // YYYY-MM-DD (Amsterdam local)
  const duration = parseInt(searchParams.get('duration') ?? '60', 10);

  if (!providerId || !date || isNaN(duration)) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const supabase = await createClient();

  // Day of week: 0=Sun … 6=Sat (matches PostgreSQL EXTRACT(DOW))
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();

  // 1. Weekly schedule for this day
  const { data: schedule } = await supabase
    .from('availability_schedules')
    .select('start_time, end_time')
    .eq('provider_id', providerId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .maybeSingle();

  if (!schedule) return NextResponse.json({ slots: [] });

  // 2. Exception for this date
  const { data: exception } = await supabase
    .from('availability_exceptions')
    .select('is_blocked, start_time, end_time')
    .eq('provider_id', providerId)
    .eq('exception_date', date)
    .maybeSingle();

  if (exception?.is_blocked) return NextResponse.json({ slots: [] });

  const startHHMM = (exception?.start_time ?? schedule.start_time).slice(0, 5);
  const endHHMM = (exception?.end_time ?? schedule.end_time).slice(0, 5);

  // 3. Existing confirmed bookings that day (UTC range)
  // Uses service_role to bypass RLS — the user-scoped client only sees the caller's own
  // bookings, which would leave other customers' confirmed slots invisible and show false
  // availability. Only scheduled_at and end_at are selected; no PII is exposed.
  const dayStartUTC = toUTC(date, '00:00').toISOString();
  const dayEndUTC = toUTC(date, '23:59').toISOString();

  const { data: existingBookings } = await createServiceRoleClient()
    .from('bookings')
    .select('scheduled_at, end_at')
    .eq('provider_id', providerId)
    .eq('status', 'confirmed')
    .gte('scheduled_at', dayStartUTC)
    .lte('scheduled_at', dayEndUTC);

  // 4. Generate slots in 30-min intervals within the window
  const windowStart = toUTC(date, startHHMM);
  const windowEnd = toUTC(date, endHHMM);
  const slots: string[] = [];
  const now = new Date();

  for (
    let current = new Date(windowStart);
    current.getTime() + duration * 60_000 <= windowEnd.getTime();
    current = new Date(current.getTime() + 30 * 60_000)
  ) {
    // Skip slots in the past (plus 2h buffer)
    if (current.getTime() < now.getTime() + 2 * 3_600_000) continue;

    if (!overlaps(current, duration, existingBookings ?? [])) {
      slots.push(toLocalHHMM(current)); // return as Amsterdam local HH:MM
    }
  }

  return NextResponse.json({ slots });
}
