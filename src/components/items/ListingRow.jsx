import { Link } from 'react-router-dom';
import { Fragment, useId } from 'react';
import ItemPhoto from './ItemPhoto';
import DeleteListingAction, { listingDeleteHelp } from './DeleteListingAction';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';

// Compact listing presentation shared by Activity and profile listings.
export default function ListingRow({ item, editable = false, onDelete }) {
  const counts = item.request_counts;
  const deleteHelpId = useId();
  const deleteHelp = editable && onDelete
    ? counts?.agreement_locked
      ? 'Delete is unavailable: this listing has an approved or ongoing loan. Complete the loan first.'
      : listingDeleteHelp(item)
    : '';
  const Content = editable ? 'div' : Fragment;
  return (
    <article className={`listing-row${editable ? ' listing-row--editable' : ''}`}>
      <Content {...(editable ? { className: 'listing-row__content' } : {})}>
      <div className="listing-row__main">
        <Link className="listing-row__photo" to={`/items/${item.id}`} aria-label={`View ${item.title}`}>
          <ItemPhoto path={item.item_photos?.[0]?.storage_path} alt={item.title} retryable={false} />
        </Link>
        <div>
          <h3><Link to={`/items/${item.id}`}>{item.title}</Link></h3>
          <div className="listing-row__meta">
            <Chip label={item.listing_type === 'rent' ? 'For rent' : 'Free'} tone={item.listing_type === 'rent' ? 'clay' : 'info'} />
            {item.listing_type === 'rent' && <span>{item.price_label}</span>}
            {editable && item.is_active === false && <Chip label="Unlisted" />}
            {!editable && <span>{item.category}</span>}
          </div>
        </div>
      </div>
      {editable && <>
        <div className="listing-row__requests">
          <p className={counts?.active ? 'listing-row__count' : 'listing-row__empty'}>
            {!counts ? 'Request counts unavailable'
              : counts.active ? `${counts.active} active ${counts.active === 1 ? 'request' : 'requests'}` : 'No requests'}
          </p>
          <Button variant="ghost" to={`/items/${item.id}/requests`}>View requests<Icon name="chevron-right" /></Button>
        </div>
        <div className="listing-row__controls">
          <Button variant="secondary" to={`/items/${item.id}/edit`}>Edit listing</Button>
          {onDelete && <DeleteListingAction item={item} onDelete={onDelete} variant="ghost" descriptionId={deleteHelpId} showHelp={false} />}
        </div>
      </>}
      </Content>
      {deleteHelp && <p className="listing-row__note" id={deleteHelpId}><Icon name="info" /><span>{deleteHelp}</span></p>}
    </article>
  );
}
