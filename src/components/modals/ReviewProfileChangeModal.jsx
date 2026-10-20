import { useEffect, useId, useRef, useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import ProfileChangeSummary from '../ui/ProfileChangeSummary';
import { reviewProfileChange } from '../../lib/profiles';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { useAuth } from '../../context/AuthContext';

export default function ReviewProfileChangeModal({ change, onClose, onReviewed }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reasonError, setReasonError] = useState('');
  const reasonId = useId();
  const reasonRef = useRef(null);
  const draft = useUnsavedChanges(Boolean(change && reason), busy);
  useEffect(() => { setReason(''); setError(''); setReasonError(''); }, [change?.id]);
  async function review(decision) {
    if (busy || change?.status !== 'pending') return;
    if (decision === 'rejected' && !reason.trim()) {
      setError('');
      setReasonError('Enter a reason so the student knows what to fix.');
      reasonRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    setReasonError('');
    try {
      await reviewProfileChange(change.id, decision, reason);
      draft.saved();
      onReviewed(decision);
      onClose();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const selfReview = change?.student_id === user?.id;
  return (
    <Modal open={Boolean(change)} title="Review profile changes" size="profile" className="profile-change-review"
      onClose={() => draft.close(onClose)}
      footer={<>
        {change?.status === 'pending' && <>
          <Button busy={busy} disabled={busy || selfReview} onClick={() => review('approved')}>Approve changes</Button>
          <Button variant="secondary" disabled={busy || selfReview} onClick={() => review('rejected')}>Reject changes</Button>
        </>}
        <Button variant="secondary" disabled={busy} onClick={() => draft.close(onClose)}>{change?.status === 'pending' ? 'Cancel' : 'Close'}</Button>
      </>}>
      {change && <>
        <p>{change.email}</p>
        <p className="small">Approval replaces only the name and photo. Course details and borrowing access stay unchanged.</p>
        <ProfileChangeSummary change={change} />
        {selfReview && change.status === 'pending' && <p role="status">Another admin must review your profile changes.</p>}
        {change.status === 'pending' && <Field id={reasonId} label="Reason for rejection" error={reasonError} hint="Required only when rejecting. The student will see this reason.">
          <textarea ref={reasonRef} id={reasonId} aria-invalid={Boolean(reasonError) || undefined} aria-describedby={`${reasonId}-hint${reasonError ? ` ${reasonId}-error` : ''}`} value={reason} onChange={(event) => { setReason(event.target.value); setReasonError(''); }} maxLength={1000} rows={3} disabled={busy || selfReview} />
        </Field>}
        {error && <p className="field__error" role="alert">{error}</p>}
      </>}
    </Modal>
  );
}
