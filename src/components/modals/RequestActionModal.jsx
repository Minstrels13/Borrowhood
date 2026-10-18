import { useEffect, useId, useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import { formatTimestamp } from '../../lib/dates';
import { uploadConditionPhoto, removeConditionPhoto, transitionRequest } from '../../lib/requests';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import PhotoUpload from '../ui/PhotoUpload';
import ItemPhoto from '../items/ItemPhoto';

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
  const formId = useId();
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
      size={action === 'cancel' ? 'compact' : action === 'decline' ? 'prompt' : action === 'return' ? 'form' : 'default'}
      className={`request-action-form request-action-form--${action}`}
      onClose={() => {
        draft.close(onClose);
      }}
      footer={<>
        <Button type="submit" form={formId} busy={busy}>
          {busy ? 'Saving…' : action === 'cancel' ? 'Cancel request' : action === 'decline' ? 'Decline request' : titles[action]}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => draft.close(onClose)}>
          {action === 'cancel' ? 'Keep request' : action === 'decline' ? 'Back' : 'Cancel'}
        </Button>
      </>}
    >
      {action === 'handover' && (
        <p className="transaction-note">
          Handing over {request.item.title} to {request.borrower.full_name}.
        </p>
      )}
      {action === 'return' && (
        <div className="transaction-note">
          <h3>At handover ({formatTimestamp(request.handed_over_at)})</h3>
          <p className="preserve-lines">{request.handover_notes}</p>
        </div>
      )}
      {action === 'cancel' && (
        <p>The owner can see the cancellation. Any reserved dates will open up again.</p>
      )}
      <form id={formId} onSubmit={submit} aria-busy={busy}>
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
            <fieldset className="segmented-control segmented-control--three">
              <legend>Condition now <span className="field__required">(required)</span></legend>
                {Object.entries(conditions).map(([value, label]) => (
                  <label className="check-option" key={value}>
                    <input type="radio" name="return-condition" required value={value}
                      checked={condition === value} onChange={(event) => setCondition(event.target.value)} />
                    {label}
                  </label>
                ))}
            </fieldset>
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
              <PhotoUpload
                variant={action === 'return' ? 'button' : 'slots'}
                label="Photo (optional)"
                limit={1}
                count={file ? 1 : 0}
                disabled={busy}
                onChange={choosePhoto}
                hint="One photo showing the condition. JPEG, PNG or WebP, smaller than 10 MB. We resize it for you."
              >
              {preview && (
                <div className="condition-photo-preview">
                  <ItemPhoto src={preview} alt="Selected condition photo" retryable={false} />
                  <Button variant="ghost" onClick={() => setFile(null)}>
                    Remove photo
                  </Button>
                </div>
              )}
              </PhotoUpload>
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
            <p className="transaction-note small"><span className="badge-warning" aria-hidden="true">! </span>Damaged returns affect the borrower's trust record.</p>
          )}
          {error && (
            <p role="alert" className="field__error">
              {error}
            </p>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
