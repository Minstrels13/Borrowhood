import { useEffect, useId, useRef, useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import Field from '../ui/Field';
import ProfileChangeSummary from '../ui/ProfileChangeSummary';
import { reviewProfileChange } from '../../lib/profiles';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { useAuth } from '../../context/AuthContext';
import Chip from '../ui/Chip';
import { profileChangeDetails } from '../../lib/profileChanges';
import { formatTimestamp } from '../../lib/dates';

export default function ReviewProfileChangeModal({ change, onClose, onReviewed }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [preset, setPreset] = useState('');
  const reasonId = useId();
  const reasonRef = useRef(null);
  const finalReason = [preset, reason.trim()].filter(Boolean).join('\n\n');
  const displayedReasonError = reasonError || (finalReason.length > 1000 ? 'Keep the combined reason under 1000 characters.' : '');
  const draft = useUnsavedChanges(Boolean(change && finalReason), busy);
  useEffect(() => { setReason(''); setPreset(''); setError(''); setReasonError(''); }, [change?.id]);
  async function review(decision) {
    if (busy || change?.status !== 'pending') return;
    if (decision === 'rejected' && (!finalReason || finalReason.length > 1000)) {
      setError('');
      setReasonError(finalReason.length > 1000 ? 'Keep the combined reason under 1000 characters.' : 'Enter a reason so the student knows what to fix.');
      reasonRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    setReasonError('');
    try {
      await reviewProfileChange(change.id, decision, decision === 'rejected' ? finalReason : '');
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
          <Button variant="secondary" disabled={busy || selfReview || !finalReason || finalReason.length > 1000} onClick={() => review('rejected')}>Reject changes</Button>
        </>}
        <Button variant="ghost" disabled={busy} onClick={() => draft.close(onClose)}>{change?.status === 'pending' ? 'Cancel' : 'Close'}</Button>
      </>}>
      {change && <>
        <div className="profile-review-student">
          <strong>{change.previous_full_name}</strong>
          <span>{change.course_year_section}</span><span>{change.email}</span>
          <span>Submitted {formatTimestamp(change.created_at)}</span>
          <Chip label={change.status === 'pending' ? 'Awaiting review' : change.status === 'approved' ? 'Approved' : 'Rejected'} tone={change.status === 'pending' ? 'clay' : change.status === 'rejected' ? 'danger' : 'info'} />
        </div>
        <p>The name should match the student's real name, and the photo should clearly show their face.</p>
        <p className="small">Approval replaces {profileChangeDetails(change).kind === 'name and photo' ? 'the name and photo' : `the ${profileChangeDetails(change).kind} only`}. Course details and borrowing access stay unchanged.</p>
        <ProfileChangeSummary change={change} showStatus={false} />
        {selfReview && change.status === 'pending' && <p role="status">Another admin must review your profile changes.</p>}
        {change.status === 'pending' && <>
          <Field label="Reason preset (optional)">
            {(props) => <select {...props} value={preset} disabled={busy || selfReview} onChange={(event) => { setPreset(event.target.value); setReasonError(''); }}>
              <option value="">Write a reason or choose a preset</option>
              {profileChangeDetails(change).photo && <option>Photo doesn't clearly show your face</option>}
              {profileChangeDetails(change).name && <option>Name doesn't match your student record</option>}
            </select>}
          </Field>
          <Field id={reasonId} label="Reason (needed to reject)" error={displayedReasonError} hint="Add a reason to reject. The student will see this reason. A preset and your note are saved together.">
            <textarea ref={reasonRef} id={reasonId} aria-invalid={Boolean(displayedReasonError) || undefined} aria-describedby={`${reasonId}-hint${displayedReasonError ? ` ${reasonId}-error` : ''}`} value={reason} onChange={(event) => { setReason(event.target.value); setReasonError(''); }} maxLength={1000} rows={3} disabled={busy || selfReview} />
          </Field>
          <p className="small muted">{finalReason.length} / 1000 characters</p>
        </>}
        {error && <p className="field__error" role="alert">{error}</p>}
      </>}
    </Modal>
  );
}
