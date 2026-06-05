export type SlotAvailabilityStatus = 'available' | 'almost-full' | 'booked';

export function parseValidDate(value: unknown): Date | null {
  if (value == null) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw || /^invalid\s*date$/i.test(raw) || raw === 'undefined' || raw === 'NaN') {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSlotDateLabel(dateValue: unknown): string | null {
  if (dateValue == null) {
    return null;
  }

  const raw = String(dateValue).trim();
  const datePartMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parsed = datePartMatch
    ? new Date(Number(datePartMatch[1]), Number(datePartMatch[2]) - 1, Number(datePartMatch[3]))
    : parseValidDate(raw);

  if (!parsed) {
    return null;
  }

  const label = parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return /invalid/i.test(label) ? null : label;
}

export function parseTimeParts(timeValue: unknown): { hours: number; minutes: number } | null {
  if (timeValue == null) {
    return null;
  }

  const raw = String(timeValue).trim();
  if (!raw) {
    return null;
  }

  const clockMatch =
    raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/) ??
    raw.match(/[T\s](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/);

  if (clockMatch) {
    const hours = Number(clockMatch[1]);
    const minutes = Number(clockMatch[2]);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  const parsed = parseValidDate(raw);
  if (!parsed) {
    return null;
  }

  return { hours: parsed.getHours(), minutes: parsed.getMinutes() };
}

export function formatTimeDisplay(timeValue: unknown): { time: string; period: string } | null {
  const parts = parseTimeParts(timeValue);
  if (!parts) {
    return null;
  }

  const period = parts.hours >= 12 ? 'PM' : 'AM';
  const hours12 = parts.hours % 12 || 12;
  const time = `${hours12}:${String(parts.minutes).padStart(2, '0')}`;

  return { time, period };
}

export function formatTimeRange(
  startValue: unknown,
  endValue: unknown
): { start: string; end: string; period: string } | null {
  const start = formatTimeDisplay(startValue);
  if (!start) {
    return null;
  }

  const end = formatTimeDisplay(endValue);
  return {
    start: start.time,
    end: end?.time ?? '',
    period: start.period
  };
}

export function getSlotAvailabilityStatus(
  availableCount: number,
  capacity: number
): SlotAvailabilityStatus {
  const available = Math.max(Number(availableCount) || 0, 0);
  const cap = Math.max(Number(capacity) || 0, 0);

  if (available <= 0) {
    return 'booked';
  }

  if (cap > 0 && available / cap <= 0.25) {
    return 'almost-full';
  }

  return 'available';
}
