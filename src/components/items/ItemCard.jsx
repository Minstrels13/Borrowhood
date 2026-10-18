import { Link } from 'react-router-dom';
import ItemPhoto from './ItemPhoto';
import OwnerSummary from './OwnerSummary';
import Button from '../ui/Button';
import DeleteListingAction from './DeleteListingAction';

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
        <p className="item-card__category">
          {item.category || 'Category'} ·{' '}
          <span className={item.is_active === false ? 'item-card__unavailable' : item.available_now === false ? 'item-card__reserved' : 'item-card__available'}>
          {item.is_active === false
            ? 'Unavailable'
            : item.available_now === false
              ? 'Reserved today'
              : 'Available'}
          </span>
        </p>
        <p className="item-card__price">
          <strong>{item.listing_type === 'rent' ? 'For rent' : 'Free'}</strong>
          {item.listing_type === 'rent' && item.price_label && <> · {item.price_label}</>}
        </p>
        <OwnerSummary owner={item.owner} interactive={!preview} />
        {editable && (
          <div className="item-card__management">
            <div className="actions">
              <Button to={`/items/${item.id}/requests`}>
                View requests
                {item.request_counts?.pending ? ` (${item.request_counts.pending})` : ''}
              </Button>
              <Button variant="secondary" to={`/items/${item.id}/edit`}>
                Edit listing
              </Button>
            </div>
            {onDelete && <DeleteListingAction item={item} onDelete={onDelete} />}
          </div>
        )}
      </div>
    </article>
  );
}
