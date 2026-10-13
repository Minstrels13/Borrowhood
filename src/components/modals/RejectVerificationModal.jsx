import { useEffect, useState } from 'react';
import Modal from './Modal';
import Field from '../ui/Field';
import Button from '../ui/Button';
import { reviewStudent } from '../../lib/profiles';

export default function RejectVerificationModal({ student, onClose, onReviewed }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
        if (!busy) onClose();
      }}
      title="Reject verification"
    >
      <p>
        {student?.full_name}
        <br />
        {student?.email}
      </p>
      <form className="form-stack" onSubmit={submit}>
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
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          hint="Visible only to admins."
        />
        {error && (
          <p role="alert" className="field__error">
            {error}
          </p>
        )}
        <div className="actions">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Rejecting…' : 'Reject student'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
