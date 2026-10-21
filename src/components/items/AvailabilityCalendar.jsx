import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';
import { dateValue, formatDate, inclusiveDays, rangeError } from '../../lib/dates';
import useManilaToday from '../../hooks/useManilaToday';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AvailabilityCalendar({
  blocked,
  dates,
  onChange,
  maximum,
  disabled = false,
  readOnly = false,
  readOnlyHint = 'Reserved dates are unavailable. Review incoming requests using View requests.',
}) {
  const today = useManilaToday();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [focused, setFocused] = useState(today);
  const dayButtons = useRef(new Map());
  const moveFocus = useRef(false);
  useEffect(() => {
    if (moveFocus.current) {
      dayButtons.current.get(focused)?.focus();
      moveFocus.current = false;
    }
  }, [focused, month]);
  const first = new Date(`${month}-01T00:00:00Z`);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const heading = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(first);
  function move(offset) {
    const next = new Date(dateValue(`${month}-01`));
    next.setUTCMonth(next.getUTCMonth() + offset);
    setMonth(next.toISOString().slice(0, 7));
  }
  function select(day) {
    if (dates.start && !dates.end && day >= dates.start) onChange({ start: dates.start, end: day });
    else onChange({ start: day, end: '' });
  }
  function unavailableDay(day) {
    return blocked.some((range) => day >= range.start_date && day <= range.end_date);
  }
  const firstEnabled = Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`)
    .find((day) => day >= today && !unavailableDay(day));
  const tabStop = focused.startsWith(month) && focused >= today && !unavailableDay(focused) ? focused : firstEnabled;
  function keyboard(event, day) {
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const weekday = new Date(dateValue(day)).getUTCDay();
    const offset = event.key === 'Home' ? -weekday : event.key === 'End' ? 6 - weekday : offsets[event.key];
    if (offset === undefined || readOnly || disabled) return;
    event.preventDefault();
    const next = new Date(dateValue(day));
    next.setUTCDate(next.getUTCDate() + offset);
    let value = next.toISOString().slice(0, 10);
    const direction = offset < 0 ? -1 : 1;
    // Skip disabled dates for keyboard focus only; selection and range rules stay unchanged.
    while (value >= today && unavailableDay(value)) {
      next.setUTCDate(next.getUTCDate() + direction);
      value = next.toISOString().slice(0, 10);
    }
    if (value < today) return;
    moveFocus.current = true;
    setFocused(value);
    setMonth(value.slice(0, 7));
  }
  const error =
    dates.start && dates.end ? rangeError(dates.start, dates.end, maximum, blocked, today) : '';
  return (
    <div className={readOnly ? 'calendar calendar--readonly' : 'calendar'}>
      <div className="calendar__heading">
        <Button
          variant="ghost"
          aria-label="Previous month"
          onClick={() => move(-1)}
          disabled={month <= today.slice(0, 7)}
        >
          ‹
        </Button>
        <h3 aria-live="polite">{heading}</h3>
        <Button variant="ghost" aria-label="Next month" onClick={() => move(1)}>
          ›
        </Button>
      </div>
      <div className="calendar__grid" aria-label={heading} role="group">
        {weekdays.map((day) => (
          <span className="calendar__weekday" key={day} aria-label={day}>
            {day.slice(0, 1)}
          </span>
        ))}
        {Array.from({ length: first.getUTCDay() }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const day = `${month}-${String(index + 1).padStart(2, '0')}`;
          const unavailable = blocked.some(
            (range) => day >= range.start_date && day <= range.end_date,
          );
          const selected =
            day === dates.start || (dates.end && day >= dates.start && day <= dates.end);
          return (
            <button
              key={day}
              ref={(node) => { if (node) dayButtons.current.set(day, node); else dayButtons.current.delete(day); }}
              tabIndex={day === tabStop ? 0 : -1}
              onFocus={() => setFocused(day)}
              onKeyDown={(event) => keyboard(event, day)}
              type="button"
              className={`calendar__day${unavailable ? ' calendar__day--blocked' : ''}${selected ? ' calendar__day--selected' : ''}`}
              disabled={readOnly || disabled || unavailable || day < today}
              aria-label={`${formatDate(day)}${unavailable ? ', unavailable' : day < today ? ', past' : ', available'}`}
              aria-pressed={Boolean(selected)}
              aria-current={day === today ? 'date' : undefined}
              onClick={() => select(day)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div className="calendar__legend small">
        <span>Available</span>
        <span className="calendar__legend-blocked">Unavailable</span>
        {!readOnly && <span className="calendar__legend-selected">Your dates</span>}
      </div>
      <p className={`small calendar__summary${dates.start && dates.end ? ' calendar__summary--selected' : ''}`} aria-live="polite">
        {readOnly
          ? readOnlyHint
          : dates.start && dates.end
            ? `${formatDate(dates.start)} to ${formatDate(dates.end)} (${inclusiveDays(dates.start, dates.end)} days)`
            : dates.start
              ? `From ${formatDate(dates.start)}. Choose a return date.`
              : 'Choose a start date, then a return date.'}
      </p>
      {error && (
        <p className="field__error" role="alert">
          <span aria-hidden="true">! </span>
          {error}
        </p>
      )}
    </div>
  );
}
