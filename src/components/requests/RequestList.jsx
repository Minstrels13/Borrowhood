import { Link } from 'react-router-dom';
import useRequests from '../../hooks/useRequests';
import useManilaToday from '../../hooks/useManilaToday';
import { formatDate, requestStatus } from '../../lib/dates';
import StatusChip from '../ui/StatusChip';
import Button from '../ui/Button';

export default function RequestList({ userId, role }) {
  const { requests, total, loading, error, retry, loadMore } = useRequests(userId, role);
  const today = useManilaToday();
  return (
    <section>
      <h2>{role === 'lending' ? 'Lending' : 'Borrowing'}</h2>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button onClick={retry}>Try again</Button>
        </div>
      )}
      {!loading && !error && !requests.length && (
        <p>
          {role === 'lending'
            ? 'No one has requested your items yet.'
            : 'You have no borrowing requests yet.'}
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
