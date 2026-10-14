import { useState } from 'react';
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
}) {
  const today = useManilaToday();
  const [month, setMonth] = useState(() => today.slice(0, 7));
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
  const error =
    dates.start && dates.end ? rangeError(dates.start, dates.end, maximum, blocked, today) : '';
  return (
    <div className="calendar">
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
              type="button"
              className={`calendar__day${unavailable ? ' calendar__day--blocked' : ''}${selected ? ' calendar__day--selected' : ''}`}
              disabled={disabled || unavailable || day < today}
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
        <span className="calendar__legend-selected">Your dates</span>
      </div>
      <p className="small" aria-live="polite">
        {dates.start && dates.end
          ? `${formatDate(dates.start)} to ${formatDate(dates.end)} (${inclusiveDays(dates.start, dates.end)} days)`
          : dates.start
            ? `From ${formatDate(dates.start)}. Choose a return date.`
            : 'Choose a start date, then a return date.'}
      </p>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
