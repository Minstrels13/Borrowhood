import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useRequest from '../hooks/useRequest';
import useManilaToday from '../hooks/useManilaToday';
import { formatDate, formatTimestamp, inclusiveDays, requestStatus } from '../lib/dates';
import { transitionRequest } from '../lib/requests';
import ActionPanel from '../components/requests/ActionPanel';
import LifecycleTracker from '../components/requests/LifecycleTracker';
import ConditionRecord from '../components/requests/ConditionRecord';
import RequestActionModal from '../components/modals/RequestActionModal';
import ParticipantSummary from '../components/requests/ParticipantSummary';
import { getStudentProfile } from '../lib/profiles';
import useItem from '../hooks/useItem';
import ItemPhoto from '../components/items/ItemPhoto';
import ImagePlaceholder from '../components/ui/ImagePlaceholder';
import Skeleton from '../components/ui/Skeleton';
import { trustLevels } from '../components/ui/TrustBadge';
import StatusChip from '../components/ui/StatusChip';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import RequestReportPanel from '../components/reports/RequestReportPanel';
import RequestThreadPanel from '../components/requests/RequestThreadPanel';

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { request, loading, error, refresh } = useRequest(id);
  const today = useManilaToday();
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [trust, setTrust] = useState({});
  const [trustRevision, setTrustRevision] = useState(0);
  const listing = useItem(request?.item_id);
  const participantKey = request ? [...new Set([request.owner.id, request.borrower.id])].join('|') : '';
  useEffect(() => {
    if (!participantKey) return;
    let active = true;
    const ids = participantKey.split('|');
    setTrust(Object.fromEntries(ids.map((participantId) => [participantId, { loading: true }])));
    // Approved A20: at most two deduplicated authorized reads, with explicit retry only.
    ids.forEach(async (participantId) => {
      try {
        const profile = await getStudentProfile(participantId);
        const level = profile?.trust?.level;
        if (!trustLevels[level]) throw new Error('Trust record unavailable.');
        if (active) setTrust((previous) => ({ ...previous, [participantId]: { level } }));
      } catch {
        if (active) setTrust((previous) => ({ ...previous, [participantId]: { error: true } }));
      }
    });
    return () => { active = false; };
  }, [participantKey, trustRevision, request?.returned_at]);
  const notify = useToast();
  const navigate = useNavigate();
  const saving = useUnsavedChanges(false, busy);
  if (!request)
    return (
      <section className="container page-section">
        {loading ? (
          <><p className="sr-only" role="status">Loading request…</p><Skeleton variant="text" lines={3} /><div className="request-loading"><Skeleton variant="card" lines={4} /><Skeleton variant="text" lines={4} /></div></>
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
            <Button to="/activity?tab=requests">My Activity</Button>
          </>
        )}
      </section>
    );
  async function saved(completedAction) {
    setAction(null);
    notify(
      {
        approve: 'Request approved. Overlapping pending requests were declined.',
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
      saving.saved();
      await saved('approve');
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const isOwner = request.owner_id === user.id;
  const duration = inclusiveDays(request.start_date, request.end_date);
  const status = requestStatus(request, today);
  const terminal = status === 'declined' || status === 'cancelled';
  const photoPath = listing.item?.item_photos?.[0]?.storage_path;
  const activityTab = ['approved', 'handed_over'].includes(request.status)
    ? 'borrowing'
    : request.status === 'requested'
      ? 'requests'
      : 'requests&view=past';
  return (
    <>
    <section className={`container page-section request-detail request-detail--${status}`}>
      <nav className="request-breadcrumb" aria-label="Breadcrumb">
      <Link to={isOwner ? `/items/${request.item_id}/requests` : `/activity?tab=${activityTab}`}>
        {isOwner ? 'Item requests' : 'My Activity'}
      </Link>
      <span aria-hidden="true">›</span><span aria-current="page">Request {request.reference}</span>
      </nav>
      <header className="request-heading">
        <div className="request-heading__photo">
          {photoPath ? <ItemPhoto path={photoPath} alt={request.item.title} retryable={false} /> : <ImagePlaceholder icon="landscape" label={listing.loading ? 'Loading item photo' : 'Item photo unavailable'} />}
        </div>
        <div>
          <h1>{request.item.title}<span className="sr-only"> — Request {request.reference}</span></h1>
          <p>
            {formatDate(request.start_date)} to {formatDate(request.end_date)} ({duration}{' '}
            {duration === 1 ? 'day' : 'days'}) ·{' '}
            {request.item.listing_type === 'rent'
              ? `For rent · ${request.item.price_label}`
              : 'Free'}
          </p>
        </div>
        <div className="request-heading__status"><StatusChip status={status} /><p>Request {request.reference}</p></div>
      </header>
      <div className="request-refresh">
      <Button variant="secondary" onClick={refresh} disabled={busy || loading || Boolean(action)}>
        Refresh status
      </Button>
      </div>
      {terminal ? (
        <section className="request-terminal" aria-label="Request outcome">
          <h2>Request {status}</h2>
          {status === 'declined' ? <><p className="preserve-lines">Reason: {request.decline_reason}</p>{request.decline_note && <p className="preserve-lines">{request.decline_note}</p>}{request.declined_at && <p>{formatTimestamp(request.declined_at)} (Manila)</p>}</> : <><p>{formatTimestamp(request.cancelled_at)} (Manila)</p>{request.cancel_reason && <p className="preserve-lines">{request.cancel_reason}</p>}</>}
        </section>
      ) : <div className="request-progress"><p className="request-progress__other">Other outcomes: Overdue, Declined, Cancelled</p><LifecycleTracker request={request} /></div>}
      {error && (
        <div role="alert">
          <p>Unable to refresh: {error}</p>
          <Button variant="secondary" onClick={refresh}>
            Try again
          </Button>
        </div>
      )}
      {loading && <p role="status">Refreshing request…</p>}
      <RequestReportPanel request={request} disabled={busy || loading || Boolean(error) || Boolean(action)} />
      <div className="request-layout">
        <div className="request-sidebar">
        <ActionPanel
          request={request}
          isOwner={isOwner}
          today={today}
          busy={busy || loading || Boolean(error)}
          saving={busy}
          onAction={perform}
          error={actionError}
        />
        <RequestThreadPanel request={request} onStatusChange={refresh} />
        </div>
        <div className="request-details">
        <div className="request-participants">
          {[
            ['Owner', request.owner],
            ['Borrower', request.borrower],
          ].map(([label, participant]) => (
            <ParticipantSummary key={participant.id} person={participant} label={label}
              isSelf={participant.id === user.id} trust={trust[participant.id]}
              onRetry={() => setTrustRevision((value) => value + 1)} />
          ))}
        </div>
        <section className="request-meetup">
          <h2>Meetup</h2>
          <p className="preserve-lines">
            {request.item.meetup_note || 'Discuss a public meetup spot with the owner in person.'}
          </p>
          <p className="small muted">Payment, if any, is settled in person.</p>
          <Button to={`/items/${request.item_id}`} variant="secondary">
            View item listing
          </Button>
          {isOwner && (
            <Button to={`/items/${request.item_id}/requests`} variant="ghost">
              All requests for this item
            </Button>
          )}
        </section>
        <section className="request-conditions">
          <h2>Condition records</h2>
          <div className="condition-records">
              <ConditionRecord request={request} event="handover" />
              <ConditionRecord request={request} event="return" />
          </div>
        </section>
        </div>
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
    </>
  );
}
