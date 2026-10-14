import { Link } from 'react-router-dom';
import ItemPhoto from './ItemPhoto';
import OwnerSummary from './OwnerSummary';
import Button from '../ui/Button';

export default function ItemCard({ item, preview = false, editable = false }) {
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
        <OwnerSummary owner={item.owner} />
        {editable && (
          <Button variant="secondary" to={`/items/${item.id}/edit`}>
            Edit listing
          </Button>
        )}
      </div>
    </article>
  );
}
