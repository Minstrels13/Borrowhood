import { useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { deleteItem } from '../../lib/items';
import { useToast } from '../ui/Toast';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import Icon from '../ui/Icon';

export default function DeleteItemModal({ item, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const notify = useToast();
  const guard = useUnsavedChanges(false, busy);
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await deleteItem(item.id);
      guard.saved();
      notify('Listing deleted. Your request history is still available.');
      onClose();
      await onDeleted();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      title="Delete this listing?"
      onClose={() => {
        if (!busy) onClose();
      }}
      className="delete-listing-modal"
    >
      <p>
        <strong>{item.title}</strong> will leave the Shelf and your listings. Existing request and
        condition records stay available.
      </p>
      <p>You cannot restore this listing in the app. To list the item again, create a new post.</p>
      <p>
        Any pending requests will be declined with the reason “Listing removed by owner.” Students
        can still view their request history. Approved or ongoing loans prevent deletion.
      </p>
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
      <div className="actions delete-listing-modal__actions" aria-busy={busy}>
        <Button variant="secondary" autoFocus disabled={busy} onClick={onClose}>
          Keep listing
        </Button>
        <Button variant="danger" disabled={busy} onClick={remove}>
          <Icon name="trash" />
          {busy ? 'Deleting…' : 'Delete listing'}
        </Button>
      </div>
    </Modal>
  );
}
