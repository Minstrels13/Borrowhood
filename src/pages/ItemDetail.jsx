import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useItem from '../hooks/useItem';
import ItemPhoto from '../components/items/ItemPhoto';
import OwnerSummary from '../components/items/OwnerSummary';
import Button from '../components/ui/Button';
import VerifiedOnlyModal from '../components/modals/VerifiedOnlyModal';
import PhotoViewer from '../components/modals/PhotoViewer';
import RequestBorrowModal from '../components/modals/RequestBorrowModal';
import AvailabilityCalendar from '../components/items/AvailabilityCalendar';
import useAvailability from '../hooks/useAvailability';
import useItemRequest from '../hooks/useItemRequest';
import { canRequestAgain } from '../lib/requestStates';
import CommentList from '../components/items/CommentList';
import DeleteItemModal from '../components/modals/DeleteItemModal';
import DeleteListingAction from '../components/items/DeleteListingAction';

export default function ItemDetail() {
  const { id } = useParams();
  const { user, isVerified } = useAuth();
  const { item, loading, error, retry } = useItem(id, isVerified);
  const [selected, setSelected] = useState(0);
  const [wall, setWall] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dates, setDates] = useState({ start: '', end: '' });
  const availability = useAvailability(id);
  const ownItem = Boolean(user && item?.owner_id === user.id);
  const existing = useItemRequest(item?.id, isVerified && !ownItem ? user?.id : null);
  const navigate = useNavigate();
  if (loading)
    return (
      <p className="container page-section" role="status">
        Loading item…
      </p>
    );
  if (error)
    return (
      <section className="container page-section">
        <h1>Unable to load this item</h1>
        <p role="alert">{error}</p>
        <Button onClick={retry}>Try again</Button>
      </section>
    );
  if (!item)
    return (
      <section className="container page-section">
        <h1>Item unavailable</h1>
        <p>This listing may have been removed or is no longer public.</p>
        <Button to="/shelf">Browse other items</Button>
      </section>
    );
  async function openRequest() {
    if (!isVerified) {
      setWall(true);
      return;
    }
    const latest = await existing.refresh();
    if (latest.error || latest.cancelled) return;
    if (!canRequestAgain(latest.request)) navigate(`/requests/${latest.request.id}`);
    else setRequestOpen(true);
  }
  const alreadyRequested = !canRequestAgain(existing.request);
  const requestButton = ownItem ? (
    <div className="actions detail-owner-actions">
      <Button to={`/items/${id}/requests`}>View requests</Button>
      <Button variant="secondary" to={`/items/${id}/edit`}>
        Edit listing
      </Button>
    </div>
  ) : alreadyRequested ? (
    <Button to={`/requests/${existing.request.id}`}>View your request</Button>
  ) : (
    <Button
      onClick={openRequest}
      disabled={isVerified && (existing.loading || Boolean(existing.error))}
    >
      {isVerified && existing.loading ? 'Checking your request…' : 'Request to borrow'}
    </Button>
  );
  return (
    <section className="container page-section item-detail">
      <p>
        <Link to="/shelf">The Shelf</Link> / {item.title}
      </p>
      <div className="detail-layout">
        <div className="detail-gallery">
          <ItemPhoto
            path={item.item_photos[selected]?.storage_path || item.item_photos[0]?.storage_path}
            alt={item.title}
            onOpen={(url) => setExpandedPhoto({ url, index: selected })}
          />
          {item.item_photos.length > 1 && (
            <div className="photo-thumbnails" aria-label="Item photos">
              {item.item_photos.map((photo, index) => (
                <Button
                  key={photo.id}
                  variant={selected === index ? 'primary' : 'secondary'}
                  aria-pressed={selected === index}
                  aria-label={`View photo ${index + 1}`}
                  onClick={() => setSelected(index)}
                >
                  <ItemPhoto
                    path={photo.storage_path}
                    alt={`Photo ${index + 1} of ${item.title}`}
                    retryable={false}
                  />
                </Button>
              ))}
            </div>
          )}
        </div>
        <aside className="detail-summary notice-card">
          <div className="detail-identity">
            <h1>{item.title}</h1>
            <p className="item-labels">
              <span className="chip">{item.category}</span>
              <span className="chip">{item.listing_type === 'rent' ? 'For rent' : 'Free'}</span>
            </p>
            {item.listing_type === 'rent' && <p>{item.price_label}</p>}
            <OwnerSummary owner={item.owner} showProfile />
          </div>
          <div className="detail-availability">
            <h2>Availability</h2>
            <p>
              Up to {item.max_borrow_days} day{item.max_borrow_days === 1 ? '' : 's'} per borrow.
            </p>
            {availability.loading ? (
              <p role="status">Loading availability…</p>
            ) : availability.error ? (
              <div role="alert">
                <p>Unable to load availability.</p>
                <Button variant="secondary" onClick={availability.retry}>
                  Try again
                </Button>
              </div>
            ) : (
              <AvailabilityCalendar
                blocked={availability.blocked}
                dates={dates}
                onChange={setDates}
                maximum={item.max_borrow_days}
                readOnly={ownItem}
              />
            )}
            <div className="detail-desktop-action">{requestButton}</div>
            {ownItem && <DeleteListingAction item={item} onDelete={() => setDeleteOpen(true)} />}
            {!ownItem && alreadyRequested && (
              <p role="status">You have already sent a borrow request for this item.</p>
            )}
            {!ownItem && existing.error && (
              <div role="alert">
                <p>Unable to check your request. Please try again.</p>
                <Button variant="secondary" onClick={existing.refresh}>
                  Retry request check
                </Button>
              </div>
            )}
            <p className="small muted">Payment, if any, is settled in person.</p>
          </div>
        </aside>
        <div className="detail-description">
          <h2>About this item</h2>
          <p className="preserve-lines">
            {item.description || 'No additional description provided.'}
          </p>
          <h3>Condition</h3>
          <p className="preserve-lines">{item.condition_note}</p>
          <h3>Meetup</h3>
          <p className="preserve-lines">
            {item.meetup_note || 'Discuss a public meetup spot with the owner in person.'}
          </p>
        </div>
        <div className="detail-comments">
          <CommentList key={id} itemId={id} />
        </div>
      </div>
      <div className="detail-mobile-action">{requestButton}</div>
      <VerifiedOnlyModal open={wall} onClose={() => setWall(false)} returnTo={`/items/${id}`} />
      {ownItem && deleteOpen && (
        <DeleteItemModal
          item={item}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => navigate('/activity?tab=listings', { replace: true })}
        />
      )}
      {requestOpen && (
        <RequestBorrowModal
          item={item}
          initialDates={dates}
          onClose={() => setRequestOpen(false)}
        />
      )}
      {expandedPhoto && (
        <PhotoViewer
          photo={expandedPhoto}
          title={item.title}
          total={item.item_photos.length}
          photos={item.item_photos}
          onClose={() => setExpandedPhoto(null)}
        />
      )}
    </section>
  );
}
