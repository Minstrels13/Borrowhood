import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import useAvailability from '../../hooks/useAvailability';
import useManilaToday from '../../hooks/useManilaToday';
import { createRequest, getLatestItemRequest } from '../../lib/requests';
import { canRequestAgain } from '../../lib/requestStates';
import { formatDate, inclusiveDays, rangeError } from '../../lib/dates';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import ItemPhoto from '../items/ItemPhoto';

export default function RequestBorrowModal({ item, initialDates, onClose }) {
  const [dates, setDates] = useState(initialDates);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const formId = useId();
  const helperId = useId();
  const availability = useAvailability(item.id);
  const today = useManilaToday();
  const navigate = useNavigate();
  const notify = useToast();
  const { user } = useAuth();
  const draft = useUnsavedChanges(
    Boolean(message) || dates.start !== initialDates.start || dates.end !== initialDates.end,
    busy,
  );
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
      draft.saved();
      navigate(`/requests/${id}`);
    } catch (failure) {
      if (user?.id) {
        try {
          const latest = await getLatestItemRequest(item.id, user.id);
          if (!canRequestAgain(latest)) {
            notify('You already sent a request. Opening it now.');
            draft.saved();
            navigate(`/requests/${latest.id}`);
            return;
          }
        } catch {
          if (
            failure.code === '23505' &&
            failure.message === 'You already sent a borrow request for this item.'
          ) {
            setError(
              'You already sent a request. Close this form and retry the request check on the item page.',
            );
            return;
          }
        }
      }
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      title="Request to borrow"
      size="form"
      className="borrow-request-form"
      onClose={() => {
        draft.close(onClose);
      }}
      footer={<>
        <Button type="submit" form={formId} busy={busy}
          disabled={availability.loading || Boolean(availability.error) || Boolean(validation)}>
          {busy ? 'Sending…' : 'Send request'}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => draft.close(onClose)}>Cancel</Button>
      </>}
    >
      <div className="transaction-summary">
      <ItemPhoto path={item.item_photos?.[0]?.storage_path} alt={item.title} retryable={false} />
      <div>
      <h3>{item.title}</h3>
      <p>
        Owner: {item.owner?.full_name || 'Listing owner'} ·{' '}
        {item.listing_type === 'rent' ? item.price_label : 'Free'}
      </p>
      </div>
      </div>
      <form id={formId} onSubmit={submit} aria-busy={busy}>
        <fieldset className="form-stack post-fields" disabled={busy}>
          <legend className="sr-only">Request details</legend>
          <div className="form-columns borrow-request-form__dates">
            <Field
              label="From"
              aria-describedby={helperId}
              type="date"
              required
              min={today}
              value={dates.start}
              onChange={(event) => setDates({ start: event.target.value, end: '' })}
            />
            <Field
              label="To"
              aria-describedby={helperId}
              type="date"
              required
              min={dates.start || today}
              value={dates.end}
              onChange={(event) =>
                setDates((previous) => ({ ...previous, end: event.target.value }))
              }
            />
          </div>
          <p className="small muted" id={helperId}>
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
          <div className="transaction-note">
          <p>
            Meetup: {item.meetup_note || 'Discuss a public meetup spot with the owner in person.'}
          </p>
          <p className="small muted">Payment, if any, is settled in person.</p>
          </div>
          {error && (
            <p role="alert" className="field__error">
              {error}
            </p>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
