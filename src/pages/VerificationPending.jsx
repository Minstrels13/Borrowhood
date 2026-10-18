import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut, resendConfirmation } from '../lib/auth';
import { submitProfile } from '../lib/profiles';
import EditProfileModal from '../components/modals/EditProfileModal';
import AuthLayout from '../components/layout/AuthLayout';
import VerificationPanel from '../components/ui/VerificationPanel';

export default function VerificationPending() {
  const { user, profile, confirmed, isVerified, isAdmin, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    typeof location.state?.from === 'string' &&
    /^\/(?!\/)/.test(location.state.from) &&
    !/^\/(login|signup|pending)(?:[/?#]|$)/.test(location.state.from)
      ? location.state.from
      : '/shelf';
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (isAdmin) return <Navigate to="/admin/verification" replace />;
  if (isVerified) return <Navigate to={from} replace />;
  const rejected = profile?.verification_status === 'rejected';
  const submitted = Boolean(profile?.submitted_at) && !rejected;
  async function action(task) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout className="pending-page">
      <h1 className="sr-only">Verify your account</h1>
      <VerificationPanel
        confirmed={confirmed}
        hasPhoto={Boolean(profile?.photo_path)}
        rejected={rejected}
        submitted={submitted}
        email={user.email}
        rejectionReason={profile?.rejection_reason}
        busy={busy}
        error={error}
        notice={notice}
        onEdit={() => setEditing(true)}
        onResend={() => action(async () => {
          await resendConfirmation(user.email);
          setNotice('Confirmation email requested.');
        })}
        onSubmit={() => action(async () => {
          await submitProfile();
          await refresh();
        })}
        onCheck={() => action(refresh)}
        onLogout={() => action(async () => {
          await signOut();
          navigate('/');
        })}
      />
      <EditProfileModal open={editing} onClose={() => setEditing(false)} resubmit />
    </AuthLayout>
  );
}
