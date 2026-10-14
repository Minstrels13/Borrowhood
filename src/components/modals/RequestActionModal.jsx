import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import { formatTimestamp } from '../../lib/dates';
import { uploadConditionPhoto, removeConditionPhoto, transitionRequest } from '../../lib/requests';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

const titles = {
  decline: 'Decline this request?',
  cancel: 'Cancel your request?',
  handover: 'Confirm handover',
  return: 'Confirm return',
};
export const conditions = { good: 'Good', minor_wear: 'Minor wear', damaged: 'Damaged' };

export default function RequestActionModal({ request, action, onClose, onSaved }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [condition, setCondition] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recordsCondition = action === 'handover' || action === 'return';
  const draft = useUnsavedChanges(Boolean(reason || notes || condition || confirmed || file), busy);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choosePhoto(event) {
    const selected = event.target.files[0];
    event.target.value = '';
    if (
      selected &&
      (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) ||
        selected.size > 10 * 1024 * 1024)
    ) {
      setError('Choose a JPEG, PNG or WebP photo smaller than 10 MB.');
      return;
    }
    setError('');
    setFile(selected || null);
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    let uploaded;
    let saved = false;
    try {
      if (file) uploaded = await uploadConditionPhoto(request.owner_id, request.id, action, file);
      await transitionRequest(request.id, action, {
        reason,
        notes,
        condition,
        confirmed,
        photo_path: uploaded || null,
      });
      saved = true;
      draft.saved();
      await onSaved(action);
    } catch (failure) {
      if (uploaded && !saved) {
        try {
          await removeConditionPhoto(uploaded);
        } catch {
          setError(`${failure.message} An unused photo could not be cleaned up.`);
          return;
        }
      }
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      title={titles[action]}
      onClose={() => {
        draft.close(onClose);
      }}
    >
      {action === 'handover' && (
        <p>
          Handing over {request.item.title} to {request.borrower.full_name}.
        </p>
      )}
      {action === 'return' && (
        <div>
          <h3>At handover ({formatTimestamp(request.handed_over_at)})</h3>
          <p className="preserve-lines">{request.handover_notes}</p>
        </div>
      )}
      {action === 'cancel' && (
        <p>The owner can see the cancellation. Any reserved dates will open up again.</p>
      )}
      <form onSubmit={submit}>
        <fieldset className="form-stack post-fields" disabled={busy}>
          <legend className="sr-only">{titles[action]}</legend>
          {action === 'decline' && (
            <Field
              label="Reason"
              required
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          )}
          {action === 'return' && (
            <Field label="Condition now" id="return-condition">
              <select
                id="return-condition"
                required
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
              >
                <option value="">Choose condition</option>
                {Object.entries(conditions).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field
            label={
              action === 'cancel'
                ? 'Reason (optional)'
                : action === 'decline'
                  ? 'Note to borrower (optional)'
                  : 'Condition notes'
            }
            id="condition-notes"
          >
            <textarea
              id="condition-notes"
              rows={3}
              required={action === 'handover'}
              maxLength={recordsCondition ? 1500 : 1000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          {action === 'decline' && (
            <p className="small muted">The borrower will see your reason.</p>
          )}
          {recordsCondition && (
            <>
              <Field
                label="Photo (optional)"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={choosePhoto}
                hint="One photo showing the condition. We resize it for you."
              />
              {preview && (
                <div className="condition-photo-preview">
                  <img src={preview} alt="Selected condition photo" />
                  <Button variant="ghost" onClick={() => setFile(null)}>
                    Remove photo
                  </Button>
                </div>
              )}
            </>
          )}
          {action === 'handover' && (
            <label className="check-option">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              We met in person and the item was handed over.
            </label>
          )}
          {action === 'return' && (
            <p className="small muted">Damaged returns affect the borrower's trust record.</p>
          )}
          {error && (
            <p role="alert" className="field__error">
              {error}
            </p>
          )}
          <div className="actions">
            <Button variant="secondary" onClick={() => draft.close(onClose)}>
              {action === 'cancel' ? 'Keep request' : 'Cancel'}
            </Button>
            <Button type="submit">
              {busy
                ? 'Saving…'
                : action === 'cancel'
                  ? 'Cancel request'
                  : action === 'decline'
                    ? 'Decline request'
                    : titles[action]}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
