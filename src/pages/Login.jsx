import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resendConfirmation, signIn } from '../lib/auth';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';

export default function Login() {
  const { user, loading, isAdmin, isVerified, error: accountError, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  if (!loading && user && !accountError)
    return (
      <Navigate to={isAdmin ? '/admin/verification' : isVerified ? '/shelf' : '/pending'} replace />
    );
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setUnconfirmed(false);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message);
      setUnconfirmed(err.code === 'email_not_confirmed');
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError('');
    try {
      await resendConfirmation(email);
      setNotice('Confirmation email requested. Check your inbox and spam folder.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-page page-section">
      <h1>Welcome back</h1>
      <p>Log in with your BulSU student email.</p>
      <form className="form-stack" onSubmit={submit}>
        <Field
          label="BulSU email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="checkbox-label">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Show password
        </label>
        <Button type="submit" disabled={busy || loading}>
          {busy ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
      {accountError && (
        <div role="alert">
          <p>{accountError}</p>
          <Button onClick={refresh}>Retry loading account</Button>
        </div>
      )}
      {unconfirmed && (
        <Button variant="secondary" onClick={resend} disabled={busy}>
          Resend confirmation email
        </Button>
      )}
      {notice && <p role="status">{notice}</p>}
      <p>
        New to Borrowhood? <Link to="/signup">Sign up</Link>
      </p>
    </section>
  );
}
