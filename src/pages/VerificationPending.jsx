import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut, resendConfirmation } from '../lib/auth';
import { submitProfile } from '../lib/profiles';
import Button from '../components/ui/Button';
import EditProfileModal from '../components/modals/EditProfileModal';
export default function VerificationPending() {
  const { user, profile, confirmed, isVerified, isAdmin, refresh } = useAuth(); const navigate = useNavigate();
  const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  if (isAdmin) return <Navigate to="/admin/verification" replace />;
  if (isVerified) return <Navigate to="/shelf" replace />;
  const rejected = profile?.verification_status === 'rejected';
  const submitted = Boolean(profile?.submitted_at) && !rejected;
  async function action(task) {
    setBusy(true); setError(''); setNotice('');
    try { await task(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="auth-page pending-page page-section"><h1>Verify your account</h1><ol className="verification-steps" aria-label="Verification progress">{['Email','Photo','Admin review','Verified'].map((label, i) => <li key={label} className={(i === 0 && confirmed) || (i === 1 && profile?.photo_path) ? 'is-complete' : ''}><span>{i + 1}</span>{label}</li>)}</ol><div className="notice-card">{!confirmed ? <><h2>Confirm your email</h2><p>Open the link sent to {user.email}. Once confirmed, log in to add your profile photo.</p><Button disabled={busy} onClick={() => action(async () => { await resendConfirmation(user.email); setNotice('Confirmation email requested.'); })}>Resend confirmation email</Button></> : rejected ? <><h2>Your account needs an update</h2><p className="preserve-lines">{profile.rejection_reason}</p><Button onClick={() => setEditing(true)}>Update details and resubmit</Button></> : !profile?.photo_path ? <><h2>Add your profile photo</h2><p>Email confirmed. Add a clear photo so students can recognize you when meeting up, then submit your account for admin review.</p><Button onClick={() => setEditing(true)}>Add your profile photo</Button></> : !submitted ? <><h2>Submit your details</h2><p>Your photo is ready. Submit your details for admin review.</p><div className="actions"><Button onClick={() => action(async () => { await submitProfile(); await refresh(); })} disabled={busy}>Submit for admin review</Button><Button variant="secondary" onClick={() => setEditing(true)}>Update details</Button></div></> : <><h2>Awaiting admin review</h2><p>Email confirmed. An admin is reviewing your account.</p><Button variant="secondary" onClick={() => setEditing(true)}>Update details and resubmit</Button></> }</div>{error && <p role="alert" className="field__error">{error}</p>}{notice && <p role="status">{notice}</p>}<div className="actions"><Button variant="secondary" onClick={() => action(refresh)} disabled={busy}>Check status</Button><Button variant="ghost" to="/shelf">Browse the shelf</Button><Button variant="ghost" disabled={busy} onClick={() => action(async () => { await signOut(); navigate('/'); })}>Log out</Button></div><EditProfileModal open={editing} onClose={() => setEditing(false)} resubmit /></section>;
}
