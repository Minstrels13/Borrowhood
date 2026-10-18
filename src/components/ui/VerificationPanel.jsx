import Button from './Button';
import VerificationStepper from './VerificationStepper';

// Pure view shared with the development preview; never reads or mutates an account.
export default function VerificationPanel({
  confirmed, hasPhoto, rejected, submitted, email, rejectionReason,
  busy = false, error, notice, preview = false,
  onResend, onEdit, onSubmit, onCheck, onLogout,
}) {
  const unavailable = busy || preview;
  return (
    <div className="verification-card">
      <VerificationStepper confirmed={confirmed} hasPhoto={hasPhoto} rejected={rejected} />
      <div className="verification-card__state">
        {!confirmed ? (
          <>
            <h2>Check your BulSU inbox</h2>
            <p>We sent a confirmation link to <strong className="verification-card__email">{email || 'your BulSU email'}</strong></p>
            <p>Confirm it, add your profile photo, then an admin will review your account.</p>
            <div className="verification-card__actions">
              <Button variant="secondary" size="large" onClick={onResend} disabled={unavailable}>Resend email</Button>
              <Button variant="ghost" size="large" onClick={onLogout} disabled={unavailable}>Log out</Button>
            </div>
            <p className="small muted">Email not there? Check your spam folder or wait a minute before resending.</p>
          </>
        ) : rejected ? (
          <>
            <h2>Your account needs an update</h2>
            {rejectionReason && <p className="auth-error preserve-lines">{rejectionReason}</p>}
            <Button size="large" onClick={onEdit} disabled={unavailable}>Update details and resubmit</Button>
          </>
        ) : !hasPhoto ? (
          <>
            <h2>Add your profile photo</h2>
            <p>Email confirmed. Add a clear photo so students can recognize you when meeting up, then submit your account for admin review.</p>
            <Button size="large" onClick={onEdit} disabled={unavailable}>Add your profile photo</Button>
          </>
        ) : !submitted ? (
          <>
            <h2>Submit your details</h2>
            <p>Your photo is ready. Submit your details for admin review.</p>
            <div className="verification-card__actions">
              <Button size="large" onClick={onSubmit} disabled={unavailable}>Submit for admin review</Button>
              <Button variant="secondary" size="large" onClick={onEdit} disabled={unavailable}>Update details</Button>
            </div>
          </>
        ) : (
          <>
            <h2>Awaiting admin review</h2>
            <p>Email confirmed. An admin is reviewing your account.</p>
            <Button variant="secondary" size="large" onClick={onEdit} disabled={unavailable}>Update details and resubmit</Button>
          </>
        )}
      </div>
      {error && <p role="alert" className="auth-error">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <p className="verification-card__note">You can look around, but posting, requesting, and commenting unlock after verification.</p>
      <div className="verification-card__secondary">
        <Button variant="ghost" to={preview ? undefined : '/shelf'} disabled={preview}>Browse the shelf while you wait</Button>
        <Button variant="secondary" onClick={onCheck} disabled={unavailable} busy={busy} busyLabel="Please wait…">Check status</Button>
        {confirmed && <Button variant="ghost" onClick={onLogout} disabled={unavailable}>Log out</Button>}
      </div>
    </div>
  );
}
