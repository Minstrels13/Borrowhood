import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import { useToast } from '../ui/Toast';
import useAvailability from '../../hooks/useAvailability';
import useManilaToday from '../../hooks/useManilaToday';
import { createRequest } from '../../lib/requests';
import { formatDate, inclusiveDays, rangeError } from '../../lib/dates';

export default function RequestBorrowModal({ item, initialDates, onClose }) {
  const [dates, setDates] = useState(initialDates);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const availability = useAvailability(item.id);
  const today = useManilaToday();
  const navigate = useNavigate();
  const notify = useToast();
  const validation = rangeError(
    dates.start,
    dates.end,
    item.max_borrow_days,
    availability.blocked,
    today,
  );
  async function submit(event) {
    event.preventDefault();
    if (busy || availability.loading || availability.error) return;
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const id = await createRequest(item.id, dates, message);
      notify('Request sent. The owner will review it.');
      navigate(`/requests/${id}`);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      title="Request to borrow"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <h3>{item.title}</h3>
      <p>
        Owner: {item.owner?.full_name || 'Listing owner'} ·{' '}
        {item.listing_type === 'rent' ? item.price_label : 'Free'}
      </p>
      <form onSubmit={submit}>
        <fieldset className="form-stack post-fields" disabled={busy}>
          <legend className="sr-only">Request details</legend>
          <div className="form-columns">
            <Field
              label="From"
              type="date"
              required
              min={today}
              value={dates.start}
              onChange={(event) => setDates({ start: event.target.value, end: '' })}
            />
            <Field
              label="To"
              type="date"
              required
              min={dates.start || today}
              value={dates.end}
              onChange={(event) =>
                setDates((previous) => ({ ...previous, end: event.target.value }))
              }
            />
          </div>
          <p className="small">
            {dates.start && dates.end && !validation
              ? `${inclusiveDays(dates.start, dates.end)} days. `
              : ''}
            Maximum {item.max_borrow_days} days, including both dates. Return by the end of the
            return date (Manila time).
          </p>
          {availability.loading && <p role="status">Checking available dates…</p>}
          {availability.error && (
            <div role="alert">
              <p>Unable to check availability: {availability.error}</p>
              <Button variant="secondary" onClick={availability.retry}>
                Try again
              </Button>
            </div>
          )}
          {!availability.loading && !availability.error && availability.blocked.length > 0 && (
            <div className="small">
              <strong>Unavailable</strong>
              <ul>
                {availability.blocked.map((range) => (
                  <li key={`${range.start_date}-${range.end_date}`}>
                    {formatDate(range.start_date)} to {formatDate(range.end_date)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dates.start && dates.end && validation && (
            <p role="alert" className="field__error">
              {validation}
            </p>
          )}
          <Field label="Message to owner (optional)" id="request-message">
            <textarea
              id="request-message"
              rows={3}
              maxLength={1500}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </Field>
          <p>
            Meetup: {item.meetup_note || 'Discuss a public meetup spot with the owner in person.'}
          </p>
          <p className="small muted">Payment, if any, is settled in person.</p>
          {error && (
            <p role="alert" className="field__error">
              {error}
            </p>
          )}
          <div className="actions">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={availability.loading || Boolean(availability.error) || Boolean(validation)}
            >
              {busy ? 'Sending…' : 'Send request'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
