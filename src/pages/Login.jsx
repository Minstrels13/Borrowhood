import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resendConfirmation, signIn, isStudentEmail } from '../lib/auth';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import { validateLogin } from '../lib/authValidation';

export default function Login() {
  const location = useLocation();
  const [params] = useSearchParams();
  const confirmationExpired = params.get('confirmation') === 'expired';
  const from =
    typeof location.state?.from === 'string' &&
    /^\/(?!\/)/.test(location.state.from) &&
    !/^\/(login|signup|pending)(?:[/?#]|$)/.test(location.state.from)
      ? location.state.from
      : '/shelf';
  const { user, loading, isAdmin, isVerified, error: accountError, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [touched, setTouched] = useState({});
  const fieldErrors = validateLogin({ email, password });
  const errorRef = useRef(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  if (!loading && user && !accountError)
    return (
      <Navigate
        to={isAdmin ? '/admin/verification' : isVerified ? from : '/pending'}
        state={{ from }}
        replace
      />
    );
  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setUnconfirmed(false);
    setTouched({ email: true, password: true });
    const firstError = Object.keys(fieldErrors)[0];
    if (firstError) {
      document.getElementById(`login-${firstError}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(
        err.code === 'invalid_credentials'
          ? 'The email or password is incorrect. Check your student email and try your password again.'
          : err.code === 'email_not_confirmed'
            ? 'Confirm your email before logging in. Check your inbox or request a new confirmation email.'
            : err.message,
      );
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
      {confirmationExpired && (
        <p role="alert" className="notice-card">
          This email confirmation link is invalid or has expired. Enter your student email below to
          request a new link, or log in if you already confirmed your email.
        </p>
      )}
      <form className="form-stack" onSubmit={submit} noValidate>
        <Field
          label="BulSU email"
          id="login-email"
          error={touched.email ? fieldErrors.email : undefined}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
            setUnconfirmed(false);
          }}
        />
        <Field
          label="Password"
          id="login-password"
          error={touched.password ? fieldErrors.password : undefined}
          onBlur={() => setTouched((current) => ({ ...current, password: true }))}
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
        />
        <label className="checkbox-label">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Show password
        </label>
        {error && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="auth-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || loading}>
          {busy ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      {accountError && (
        <div role="alert">
          <p>{accountError}</p>
          <Button onClick={refresh}>Retry loading account</Button>
        </div>
      )}
      {(unconfirmed || confirmationExpired) && (
        <Button variant="secondary" onClick={resend} disabled={busy || !isStudentEmail(email)}>
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
