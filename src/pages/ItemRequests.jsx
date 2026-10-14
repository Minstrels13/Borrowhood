import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useItemRequests from '../hooks/useItemRequests';
import useManilaToday from '../hooks/useManilaToday';
import { formatDate, formatTimestamp, inclusiveDays, requestStatus } from '../lib/dates';
import { transitionRequest } from '../lib/requests';
import Button from '../components/ui/Button';
import ProfilePhoto from '../components/ui/ProfilePhoto';
import StatusChip from '../components/ui/StatusChip';
import { useToast } from '../components/ui/Toast';
import RequestActionModal from '../components/modals/RequestActionModal';
import useUnsavedChanges from '../hooks/useUnsavedChanges';

export default function ItemRequests() {
  const { id } = useParams();
  const { user } = useAuth();
  return <OwnerRequests key={`${id}:${user.id}`} id={id} userId={user.id} />;
}

function OwnerRequests({ id, userId }) {
  const [filter, setFilter] = useState('requested');
  const list = useItemRequests(id, userId, filter);
  const [busy, setBusy] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [actionError, setActionError] = useState('');
  const today = useManilaToday();
  const notify = useToast();
  const saving = useUnsavedChanges(false, Boolean(busy));

  async function approve(request) {
    if (busy || list.loading || list.error) return;
    setBusy(request.id);
    setActionError('');
    try {
      await transitionRequest(request.id, 'approve');
      saving.saved();
      notify('Request approved. Overlapping pending requests were declined.');
    } catch (error) {
      setActionError(error.message);
    } finally {
      await list.refresh();
      setBusy(null);
    }
  }

  async function declined() {
    setDeclining(null);
    notify('Request declined.');
    await list.refresh();
  }

  if (!list.item)
    return (
      <section className="container page-section">
        {list.loading ? (
          <p role="status">Loading item requests…</p>
        ) : (
          <>
            <h1>Unable to load item requests</h1>
            <p role="alert">{list.error || 'Only the item owner can view these requests.'}</p>
            <div className="actions">
              <Button onClick={list.refresh}>Try again</Button>
              <Button to="/activity" variant="secondary">
                My Activity
              </Button>
            </div>
          </>
        )}
      </section>
    );

  const disabled = Boolean(busy || list.loading || list.error || declining);
  return (
    <section className="container page-section item-requests">
      <Link to={`/items/${id}`}>Back to item</Link>
      <header className="section-heading">
        <div>
          <h1>Item requests</h1>
          <h2>{list.item.title}</h2>
          <p className="muted">
            {list.pending_count} pending {list.pending_count === 1 ? 'request' : 'requests'}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={list.refresh}
          disabled={Boolean(busy || list.loading || declining)}
        >
          Refresh requests
        </Button>
      </header>
      <p className="notice-card">
        Approving a request reserves its dates. Other pending requests that overlap those dates will
        automatically be declined. Requests for other dates stay pending.
      </p>
      <div className="actions" role="group" aria-label="Filter requests">
        {[
          ['requested', 'Pending'],
          ['all', 'All requests'],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={filter === value ? 'primary' : 'secondary'}
            aria-pressed={filter === value}
            disabled={Boolean(busy || list.loading || declining)}
            onClick={() => {
              setFilter(value);
              setActionError('');
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {actionError && (
        <p role="alert" className="field__error">
          {actionError}
        </p>
      )}
      {list.error && (
        <p role="alert">
          Unable to refresh requests: {list.error}. Use Refresh requests to try again.
        </p>
      )}
      {list.loading && <p role="status">Loading requests…</p>}
      {!list.loading && !list.error && !list.requests.length && (
        <div className="notice-card">
          <h2>{filter === 'requested' ? 'No pending requests' : 'No requests yet'}</h2>
          <p>
            {filter === 'requested'
              ? 'You’re all caught up. Check All requests for previous activity.'
              : 'Requests from borrowers will appear here.'}
          </p>
        </div>
      )}
      <ul
        className="item-request-list"
        aria-label="Requests for this item"
        aria-busy={list.loading}
      >
        {list.requests.map((request) => {
          const duration = inclusiveDays(request.start_date, request.end_date);
          return (
            <li className="item-request-card" key={request.id}>
              <div className="item-request-card__heading">
                <div className="owner-summary">
                  <ProfilePhoto
                    path={request.borrower.photo_path}
                    name={request.borrower.full_name}
                  />
                  <div>
                    <h2>{request.borrower.full_name}</h2>
                    <p className="small muted">
                      {request.reference} · Sent {formatTimestamp(request.created_at)}
                    </p>
                  </div>
                </div>
                <StatusChip status={requestStatus(request, today)} />
              </div>
              <p>
                <strong>
                  {formatDate(request.start_date)} – {formatDate(request.end_date)}
                </strong>{' '}
                · {duration} {duration === 1 ? 'day' : 'days'}
              </p>
              <p className="item-request-card__message preserve-lines">
                {request.message || 'No message provided.'}
              </p>
              {request.status === 'declined' && (
                <p className="muted">Reason: {request.decline_reason}</p>
              )}
              <div className="actions">
                {request.status === 'requested' && (
                  <>
                    <Button
                      disabled={disabled}
                      onClick={() => approve(request)}
                      aria-label={`Approve ${request.reference}`}
                    >
                      {busy === request.id ? 'Approving…' : 'Approve'}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={disabled}
                      onClick={() => {
                        setDeclining(request);
                        setActionError('');
                      }}
                      aria-label={`Decline ${request.reference}`}
                    >
                      Decline
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  to={`/requests/${request.id}`}
                  aria-label={`View request ${request.reference}`}
                >
                  View request
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {list.requests.length < list.total && (
        <Button variant="secondary" disabled={disabled} onClick={list.loadMore}>
          Load more requests
        </Button>
      )}
      {declining && (
        <RequestActionModal
          request={declining}
          action="decline"
          onClose={() => setDeclining(null)}
          onSaved={declined}
        />
      )}
    </section>
  );
}
