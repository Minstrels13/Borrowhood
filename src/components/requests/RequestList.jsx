import { Link, useSearchParams } from 'react-router-dom';
import { Fragment } from 'react';
import useRequests from '../../hooks/useRequests';
import useManilaToday from '../../hooks/useManilaToday';
import { daysLate, formatDate, requestStatus } from '../../lib/dates';
import StatusChip from '../ui/StatusChip';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';

export default function RequestList({ userId, role }) {
  const [params, setParams] = useSearchParams();
  const history = params.get('view') === 'past';
  function setHistory(value) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set('view', 'past');
      else next.delete('view');
      return next;
    });
  }
  const view = role === 'requests' && history ? 'history' : role;
  return (
    <ActivityRequests
      key={`${userId}:${view}`}
      userId={userId}
      role={role}
      view={view}
      history={history}
      setHistory={setHistory}
    />
  );
}

function ActivityRequests({ userId, role, view, history, setHistory }) {
  const { requests, total, loading, error, retry, loadMore } = useRequests(userId, view);
  const today = useManilaToday();
  // Group only records supplied by the existing active-lending query.
  const orderedRequests = role === 'lending'
    ? [...requests.filter((request) => request.status === 'approved'), ...requests.filter((request) => request.status !== 'approved')]
    : requests;
  return (
    <section className="activity-requests">
      <div className="section-heading activity-requests__heading">
      <h2>{role === 'requests' ? 'Requests' : role === 'lending' ? 'Lending' : 'Borrowing'}</h2>
      <Button variant="secondary" disabled={loading} onClick={retry}>
        Refresh activity
      </Button>
      </div>
      <p className="muted">
        {role === 'requests'
          ? history
            ? 'Your declined, cancelled and completed requests.'
            : 'Requests you sent that are waiting for the owner’s approval.'
          : 'Approved and ongoing loans, including overdue items.'}
      </p>
      {role === 'requests' && (
        <div className="actions" role="group" aria-label="Request filter">
          <Button
            variant={history ? 'secondary' : 'primary'}
            aria-pressed={!history}
            onClick={() => setHistory(false)}
          >
            Pending
          </Button>
          <Button
            variant={history ? 'primary' : 'secondary'}
            aria-pressed={history}
            onClick={() => setHistory(true)}
          >
            Past requests
          </Button>
        </div>
      )}
      {role === 'lending' && (
        <p className="activity-notice">
          To review pending requests, open an item in{' '}
          <Link to="/activity?tab=listings">My listings</Link> and select View requests.
        </p>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button onClick={retry}>Try again</Button>
        </div>
      )}
      {!loading && !error && !requests.length && (
        <p className="activity-empty">
          {role === 'requests'
            ? history
              ? 'You have no past requests yet.'
              : 'You have no pending requests.'
            : role === 'lending'
              ? 'You have no active lending loans.'
              : 'You have no active borrowing loans.'}
        </p>
      )}
      <div className="request-list">
        {orderedRequests.map((request, index) => {
          const status = requestStatus(request, today);
          const needsAction = role === 'lending' && status === 'approved';
          const actionLabel = needsAction ? 'Confirm handover' : role === 'lending' && ['handed_over', 'overdue'].includes(status) ? 'Confirm return' : 'View request';
          const startsGroup = role === 'lending' && (index === 0 || (orderedRequests[index - 1].status === 'approved') !== (request.status === 'approved'));
          const helper = status === 'overdue' ? `${daysLate(request, today)} ${daysLate(request, today) === 1 ? 'day' : 'days'} late`
            : status === 'requested' ? 'Waiting for the owner'
            : status === 'approved' ? `Meetup date: ${formatDate(request.start_date)}`
            : status === 'handed_over' ? `Due ${formatDate(request.end_date)}` : '';
          return (
          <Fragment key={request.id}>
          {startsGroup && <p className="activity-group-label">{needsAction ? 'Needs your action' : 'In progress'}</p>}
          <article className={`activity-row${needsAction ? ' activity-row--attention' : ''}${status === 'overdue' ? ' activity-row--overdue' : ''}`} key={request.id}>
            <div>
              <h3>
                <Link to={`/requests/${request.id}`}>
                  {request.item?.title || 'View request'} · {request.reference}
                </Link>
              </h3>
              <p>
                {formatDate(request.start_date)} to {formatDate(request.end_date)}
              </p>
              {request.item && (
                <p className="small">
                  {request.item.listing_type === 'rent'
                    ? `For rent · ${request.item.price_label}`
                    : 'Free'}
                </p>
              )}
            </div>
            <div className="activity-row__state">
              <StatusChip status={status} />
              {needsAction && <strong>Needs your action</strong>}
              {helper && <p>{helper}</p>}
            </div>
            <Button to={`/requests/${request.id}`} variant={needsAction ? 'primary' : 'secondary'}>
              {actionLabel}
            </Button>
          </article>
          </Fragment>
        );})}
      </div>
      {loading && <><p role="status">Loading requests…</p><div className="activity-loading"><Skeleton variant="text" lines={3} /><Skeleton variant="text" lines={3} /></div></>}
      {requests.length < total && (
        <div className="actions">
          <Button variant="secondary" disabled={loading} onClick={loadMore}>
            Load more requests
          </Button>
        </div>
      )}
    </section>
  );
}
