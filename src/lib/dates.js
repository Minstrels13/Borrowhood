const dayMilliseconds = 86400000;
const timezone = 'Asia/Manila';

export function manilaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function dateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : NaN;
}

export function inclusiveDays(start, end) {
  return Math.round((dateValue(end) - dateValue(start)) / dayMilliseconds) + 1;
}

export function formatDate(value) {
  const timestamp = dateValue(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(timestamp)
    : 'Unknown date';
}

export function formatTimestamp(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function rangeError(start, end, maximum, blocked = [], today = manilaToday()) {
  if (!Number.isFinite(dateValue(start)) || !Number.isFinite(dateValue(end)))
    return 'Choose both a start and return date.';
  if (start < today) return 'Choose a start date today or later.';
  if (end < start) return 'The return date must be on or after the start date.';
  if (inclusiveDays(start, end) > maximum)
    return `Choose up to ${maximum} days, including the start and return dates.`;
  if (blocked.some((range) => start <= range.end_date && end >= range.start_date))
    return 'Some of these dates are unavailable. Choose another range.';
  return '';
}

export function requestStatus(request, today = manilaToday()) {
  return request.status === 'handed_over' && request.end_date < today ? 'overdue' : request.status;
}

export function daysLate(request, today = manilaToday()) {
  return Math.max(0, inclusiveDays(request.end_date, today) - 1);
}

export function returnedLate(request) {
  return Boolean(
    request.returned_at && manilaToday(new Date(request.returned_at)) > request.end_date,
  );
}
