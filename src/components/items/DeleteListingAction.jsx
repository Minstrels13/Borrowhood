import { useId } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

export default function DeleteListingAction({ item, onDelete }) {
  const helpId = useId();
  const counts = item.request_counts;
  const blocked = !counts || Boolean(counts.agreement_locked);
  const help = !counts
    ? 'Unable to check deletion eligibility. Refresh the page to try again.'
    : counts.agreement_locked
      ? 'This listing has an approved or ongoing loan. Complete the loan before deleting.'
      : counts.pending
        ? 'Deleting this listing will automatically decline its pending requests.'
        : '';

  return (
    <div className="listing-delete">
      <Button
        variant="danger-secondary"
        disabled={blocked}
        onClick={() => onDelete(item)}
        aria-describedby={help ? helpId : undefined}
      >
        <Icon name="trash" />
        Delete listing
      </Button>
      {help && <p id={helpId}>{help}</p>}
    </div>
  );
}
