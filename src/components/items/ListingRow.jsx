import { Link } from 'react-router-dom';
import ItemPhoto from './ItemPhoto';
import DeleteListingAction from './DeleteListingAction';
import Button from '../ui/Button';
import Chip from '../ui/Chip';

// Compact listing presentation shared by Activity and profile listings.
export default function ListingRow({ item, editable = false, onDelete }) {
  const counts = item.request_counts;
  return (
    <article className="listing-row">
      <div className="listing-row__main">
        <Link className="listing-row__photo" to={`/items/${item.id}`} aria-label={`View ${item.title}`}>
          <ItemPhoto path={item.item_photos?.[0]?.storage_path} alt={item.title} retryable={false} />
        </Link>
        <div>
          <h3><Link to={`/items/${item.id}`}>{item.title}</Link></h3>
          <div className="listing-row__meta">
            <Chip label={item.listing_type === 'rent' ? 'For rent' : 'Free'} tone={item.listing_type === 'rent' ? 'clay' : 'info'} />
            {item.listing_type === 'rent' && <span>{item.price_label}</span>}
            {!editable && <span>{item.category}</span>}
          </div>
        </div>
      </div>
      {editable && <>
        <div className="listing-row__requests">
          <p className={counts?.pending ? 'listing-row__pending' : undefined}>
            {!counts ? 'Request counts unavailable' : counts.pending
              ? `${counts.pending} new ${counts.pending === 1 ? 'request' : 'requests'}`
              : counts.active ? `${counts.active} active ${counts.active === 1 ? 'request' : 'requests'}` : 'No requests'}
          </p>
          <Button variant="ghost" to={`/items/${item.id}/requests`}>View requests</Button>
        </div>
        <div className="listing-row__controls">
          <span className="listing-row__listed">{item.is_active ? 'Listed' : 'Unlisted'}</span>
          <Button variant="secondary" to={`/items/${item.id}/edit`}>Edit listing</Button>
          {onDelete && <DeleteListingAction item={item} onDelete={onDelete} />}
        </div>
      </>}
    </article>
  );
}
