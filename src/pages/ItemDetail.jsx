import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useItem from '../hooks/useItem';
import ItemPhoto from '../components/items/ItemPhoto';
import OwnerSummary from '../components/items/OwnerSummary';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import Skeleton from '../components/ui/Skeleton';
import { brand } from '../config/brand';
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
      <section className="container page-section item-detail item-detail--loading" aria-busy="true">
        <p className="sr-only" role="status">Loading item…</p>
        <div className="detail-loading-layout"><Skeleton variant="card" lines={3} /><Skeleton variant="text" lines={6} /></div>
      </section>
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
  const selectedIndex = Math.min(selected, Math.max(0, item.item_photos.length - 1));
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
      size="large"
      onClick={openRequest}
      disabled={isVerified && (existing.loading || Boolean(existing.error))}
    >
      {isVerified && existing.loading ? 'Checking your request…' : 'Request to borrow'}
    </Button>
  );
  return (
    <>
    <section className={`container page-section item-detail${isVerified ? ' item-detail--verified' : ''}`}>
      <nav className="item-breadcrumb" aria-label="Breadcrumb">
        <Link to="/shelf">The Shelf</Link><span aria-hidden="true">›</span><span aria-current="page">{item.title}</span>
      </nav>
      <div className="detail-layout">
        <div className="detail-gallery">
          <div className="detail-gallery__main">
          <ItemPhoto
            loading="eager"
            path={item.item_photos[selectedIndex]?.storage_path}
            alt={item.title}
            onOpen={(url) => setExpandedPhoto({ url, index: selectedIndex })}
          />
          {item.item_photos.length > 0 && <span className="detail-photo-count">{selectedIndex + 1} / {item.item_photos.length}<span className="detail-photo-count__hint"> · Click to enlarge</span></span>}
          </div>
          {item.item_photos.length > 1 && (
            <div className="photo-thumbnails" aria-label="Item photos">
              {item.item_photos.map((photo, index) => (
                <Button
                  key={photo.id}
                  variant={selectedIndex === index ? 'primary' : 'secondary'}
                  aria-pressed={selectedIndex === index}
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
            <div className="item-labels">
              <Chip label={item.category} />
              <Chip label={item.listing_type === 'rent' ? 'For rent' : 'Free'} tone="info" />
            </div>
            {item.listing_type === 'rent' && <p>{item.price_label}</p>}
            <OwnerSummary owner={item.owner} showProfile />
          </div>
          <div className="detail-availability">
            <h2>Availability</h2>
            <p>
              Up to {item.max_borrow_days} day{item.max_borrow_days === 1 ? '' : 's'} per borrow.
            </p>
            {availability.loading ? (
              <><Skeleton variant="text" lines={6} /><p className="sr-only" role="status">Loading availability…</p></>
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
          <dl className="detail-facts">
            <div><dt>Condition</dt><dd className="preserve-lines">{item.condition_note}</dd></div>
            <div><dt>Meetup</dt><dd className="preserve-lines">{item.meetup_note || 'Discuss a public meetup spot with the owner in person.'}</dd></div>
          </dl>
        </div>
        <div className="detail-comments">
          <CommentList key={id} itemId={id} ownerId={item.owner_id} />
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
    <footer className="item-detail-footer">{brand.name} | {brand.project}</footer>
    </>
  );
}
