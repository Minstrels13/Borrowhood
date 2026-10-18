import { useEffect, useId, useState } from 'react';
import Modal from './Modal';
import Field from '../ui/Field';
import Button from '../ui/Button';
import { reviewStudent } from '../../lib/profiles';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import ProfilePhoto from '../ui/ProfilePhoto';

export default function RejectVerificationModal({ student, onClose, onReviewed }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const formId = useId();
  const noteId = useId();
  const draft = useUnsavedChanges(Boolean(student && (reason || note)), busy);
  useEffect(() => {
    setReason('');
    setNote('');
    setError('');
  }, [student?.id]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await reviewStudent(student.id, 'rejected', reason, note);
      draft.saved();
      onReviewed();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={Boolean(student)}
      onClose={() => {
        draft.close(onClose);
      }}
      title="Reject this student?"
      size="reject"
      className="reject-verification"
      footer={<>
        <Button type="submit" form={formId} busy={busy}>{busy ? 'Rejecting…' : 'Reject student'}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => draft.close(onClose)}>Cancel</Button>
      </>}
    >
      <div className="transaction-summary reject-verification__student">
        <ProfilePhoto path={student?.photo_path} name={student?.full_name} />
        <div><strong>{student?.full_name}</strong><p>{student?.email}</p></div>
      </div>
      <form id={formId} className="form-stack" onSubmit={submit} aria-busy={busy}>
        <fieldset className="form-stack post-fields" disabled={busy}>
          <legend className="sr-only">Verification rejection</legend>
          <Field
            label="Reason for rejection"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            hint="The student will see this reason and can fix their details."
          />
          <Field
            label="Admin note (optional)"
            id={noteId}
            hint="Visible only to admins."
          >
            <textarea id={noteId} aria-describedby={`${noteId}-hint`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3} />
          </Field>
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
