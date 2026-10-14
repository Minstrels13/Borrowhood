import { Link } from 'react-router-dom';
import ItemPhoto from './ItemPhoto';
import OwnerSummary from './OwnerSummary';
import Button from '../ui/Button';

export default function ItemCard({ item, preview = false, editable = false, onDelete }) {
  const title = item.title || 'Your item title';
  const image = (
    <ItemPhoto
      path={item.item_photos?.[0]?.storage_path}
      src={item.previewPhoto}
      alt={title}
      retryable={preview}
    />
  );
  return (
    <article className="item-card">
      {preview ? (
        image
      ) : (
        <Link className="item-card__image" to={`/items/${item.id}`} aria-label={`View ${title}`}>
          {image}
        </Link>
      )}
      <div className="item-card__body">
        <h3>{preview ? title : <Link to={`/items/${item.id}`}>{title}</Link>}</h3>
        <p className="small muted">
          {item.category || 'Category'} ·{' '}
          {item.is_active === false
            ? 'Unavailable'
            : item.available_now === false
              ? 'Reserved today'
              : 'Available'}
        </p>
        <p>
          <strong>{item.listing_type === 'rent' ? 'For rent' : 'Free'}</strong>
          {item.listing_type === 'rent' && item.price_label && <> · {item.price_label}</>}
        </p>
        <OwnerSummary owner={item.owner} interactive={!preview} />
        {editable && (
          <div>
            <div className="actions">
              <Button to={`/items/${item.id}/requests`}>
                View requests
                {item.request_counts?.pending ? ` (${item.request_counts.pending})` : ''}
              </Button>
              <Button variant="secondary" to={`/items/${item.id}/edit`}>
                Edit listing
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  disabled={Boolean(item.request_counts?.active)}
                  onClick={() => onDelete(item)}
                >
                  Delete listing
                </Button>
              )}
            </div>
            {Boolean(item.request_counts?.active) && (
              <p className="small muted">
                Close pending requests and complete active loans before deleting.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
