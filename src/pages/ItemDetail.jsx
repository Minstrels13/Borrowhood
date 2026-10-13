import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useItem from '../hooks/useItem';
import ItemPhoto from '../components/items/ItemPhoto';
import OwnerSummary from '../components/items/OwnerSummary';
import Button from '../components/ui/Button';
import VerifiedOnlyModal from '../components/modals/VerifiedOnlyModal';
import Modal from '../components/modals/Modal';
import { useToast } from '../components/ui/Toast';

export default function ItemDetail() {
  const { id } = useParams();
  const { user, isVerified } = useAuth();
  const { item, loading, error, retry } = useItem(id);
  const [selected, setSelected] = useState(0);
  const [wall, setWall] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const notify = useToast();
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
  const ownItem = user?.id === item.owner_id;
  const requestButton = ownItem ? (
    <Button variant="secondary" to={`/items/${id}/edit`}>
      Edit listing
    </Button>
  ) : (
    <Button
      onClick={() => {
        if (!isVerified) setWall(true);
        else notify('Borrow requests will be available in Phase 4.');
      }}
    >
      Request to borrow
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
            <p className="muted">The booking calendar and requests will be available in Phase 4.</p>
            <div className="detail-desktop-action">{requestButton}</div>
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
          <h2>Questions and comments</h2>
          <p className="muted">Comments will be available in Phase 6.</p>
        </div>
      </div>
      <div className="detail-mobile-action">{requestButton}</div>
      <VerifiedOnlyModal open={wall} onClose={() => setWall(false)} />
      <Modal
        open={Boolean(expandedPhoto)}
        onClose={() => setExpandedPhoto(null)}
        title={`Photo ${(expandedPhoto?.index ?? 0) + 1} of ${item.item_photos.length}`}
        className="image-viewer"
      >
        {expandedPhoto && (
          <img
            className="image-viewer__image"
            src={expandedPhoto.url}
            alt={`Photo ${expandedPhoto.index + 1} of ${item.title}`}
          />
        )}
      </Modal>
    </section>
  );
}
