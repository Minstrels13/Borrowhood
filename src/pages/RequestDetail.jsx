import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useRequest from '../hooks/useRequest';
import useManilaToday from '../hooks/useManilaToday';
import { formatDate, inclusiveDays, requestStatus } from '../lib/dates';
import { transitionRequest } from '../lib/requests';
import ActionPanel from '../components/requests/ActionPanel';
import LifecycleTracker from '../components/requests/LifecycleTracker';
import ConditionRecord from '../components/requests/ConditionRecord';
import RequestActionModal from '../components/modals/RequestActionModal';
import ProfilePhoto from '../components/ui/ProfilePhoto';
import StatusChip from '../components/ui/StatusChip';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { request, loading, error, refresh } = useRequest(id);
  const today = useManilaToday();
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const notify = useToast();
  const navigate = useNavigate();
  if (!request)
    return (
      <section className="container page-section">
        {loading ? (
          <p role="status">Loading request…</p>
        ) : error ? (
          <>
            <h1>Unable to load request</h1>
            <p role="alert">{error}</p>
            <Button onClick={refresh}>Try again</Button>
          </>
        ) : (
          <>
            <h1>Request unavailable</h1>
            <p>This request does not exist or you are not one of its participants.</p>
            <Button to="/activity?tab=borrowing">My Activity</Button>
          </>
        )}
      </section>
    );
  async function saved(completedAction) {
    setAction(null);
    notify(
      {
        approve: 'Request approved.',
        decline: 'Request declined.',
        cancel: 'Request cancelled.',
        handover: 'Handover confirmed.',
        return: 'Return confirmed.',
      }[completedAction],
    );
    if (completedAction === 'cancel') navigate(`/items/${request.item_id}`);
    else await refresh();
  }
  async function perform(nextAction) {
    setActionError('');
    if (nextAction !== 'approve') {
      setAction(nextAction);
      return;
    }
    if (busy || loading) return;
    setBusy(true);
    try {
      await transitionRequest(id, 'approve');
      await saved('approve');
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const isOwner = request.owner_id === user.id;
  const duration = inclusiveDays(request.start_date, request.end_date);
  return (
    <section className="container page-section request-detail">
      <Link to={`/activity?tab=${isOwner ? 'lending' : 'borrowing'}`}>My Activity</Link>
      <header className="section-heading">
        <div>
          <h1>Request {request.reference}</h1>
          <h2>{request.item.title}</h2>
          <p>
            {formatDate(request.start_date)} to {formatDate(request.end_date)} ({duration}{' '}
            {duration === 1 ? 'day' : 'days'}) ·{' '}
            {request.item.listing_type === 'rent'
              ? `For rent · ${request.item.price_label}`
              : 'Free'}
          </p>
        </div>
        <StatusChip status={requestStatus(request, today)} />
      </header>
      <LifecycleTracker request={request} />
      {error && (
        <div role="alert">
          <p>Unable to refresh: {error}</p>
          <Button variant="secondary" onClick={refresh}>
            Try again
          </Button>
        </div>
      )}
      {loading && <p role="status">Refreshing request…</p>}
      <div className="request-layout">
        <ActionPanel
          request={request}
          isOwner={isOwner}
          today={today}
          busy={busy || loading || Boolean(error)}
          onAction={perform}
          error={actionError}
        />
        <div className="request-participants">
          {[
            ['Owner', request.owner],
            ['Borrower', request.borrower],
          ].map(([label, participant]) => (
            <section className="notice-card" key={participant.id}>
              <h2>
                {label}
                {participant.id === user.id ? ' (you)' : ''}
              </h2>
              <div className="owner-summary">
                <ProfilePhoto path={participant.photo_path} name={participant.full_name} />
                <strong className="request-participant-name">{participant.full_name}</strong>
              </div>
              <p>{participant.course_year_section}</p>
            </section>
          ))}
        </div>
        <section className="request-message">
          <h2>Message from the borrower</h2>
          <p className="preserve-lines">{request.message || 'No message provided.'}</p>
        </section>
        <section className="request-meetup">
          <h2>Meetup</h2>
          <p className="preserve-lines">
            {request.item.meetup_note || 'Discuss a public meetup spot with the owner in person.'}
          </p>
          <p className="small muted">Payment, if any, is settled in person.</p>
          <Button to={`/items/${request.item_id}`} variant="secondary">
            View item listing
          </Button>
        </section>
        <section className="request-conditions">
          <h2>Condition records</h2>
          <div className="condition-records">
            <ConditionRecord request={request} event="handover" />
            <ConditionRecord request={request} event="return" />
          </div>
        </section>
      </div>
      {action && (
        <RequestActionModal
          request={request}
          action={action}
          onClose={() => setAction(null)}
          onSaved={saved}
        />
      )}
    </section>
  );
}
