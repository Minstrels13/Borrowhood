import { useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { deleteItem } from '../../lib/items';
import { useToast } from '../ui/Toast';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

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
      notify('Listing deleted. Request and condition history are retained.');
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
    >
      <p>
        <strong>{item.title}</strong> will leave the Shelf and your listings. Existing request and
        condition records stay available.
      </p>
      <p>Listings with pending, approved or ongoing requests cannot be deleted.</p>
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
      <div className="actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Keep listing
        </Button>
        <Button disabled={busy} onClick={remove}>
          {busy ? 'Deleting…' : 'Delete listing'}
        </Button>
      </div>
    </Modal>
  );
}
