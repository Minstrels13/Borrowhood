import { Link, useSearchParams } from 'react-router-dom';
import useRequests from '../../hooks/useRequests';
import useManilaToday from '../../hooks/useManilaToday';
import { formatDate, requestStatus } from '../../lib/dates';
import StatusChip from '../ui/StatusChip';
import Button from '../ui/Button';

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
  return (
    <section>
      <h2>{role === 'requests' ? 'Requests' : role === 'lending' ? 'Lending' : 'Borrowing'}</h2>
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
        <p>
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
        <p>
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
        {requests.map((request) => (
          <article className="notice-card request-list__row" key={request.id}>
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
            <StatusChip status={requestStatus(request, today)} />
            <Button to={`/requests/${request.id}`} variant="secondary">
              View request
            </Button>
          </article>
        ))}
      </div>
      {loading && <p role="status">Loading requests…</p>}
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
