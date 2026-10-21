import { useId } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

export function listingDeleteHelp(item) {
  const counts = item.request_counts;
  return !counts
    ? 'Unable to check deletion eligibility. Refresh the page to try again.'
    : counts.agreement_locked
      ? 'This listing has an approved or ongoing loan. Complete the loan before deleting.'
      : counts.pending
        ? 'Deleting this listing will automatically decline its pending requests.'
        : '';
}

export default function DeleteListingAction({ item, onDelete, variant = 'danger-secondary', descriptionId, showHelp = true }) {
  const generatedId = useId();
  const helpId = descriptionId || generatedId;
  const counts = item.request_counts;
  const blocked = !counts || Boolean(counts.agreement_locked);
  const help = listingDeleteHelp(item);

  return (
    <div className="listing-delete">
      <Button
        variant={variant}
        disabled={blocked}
        onClick={() => onDelete(item)}
        aria-describedby={help ? helpId : undefined}
      >
        <Icon name="trash" />
        Delete listing
      </Button>
      {showHelp && help && <p id={helpId}>{help}</p>}
    </div>
  );
}
