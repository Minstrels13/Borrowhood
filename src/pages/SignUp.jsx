import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import CommunityRulesModal from '../components/modals/CommunityRulesModal';
import { useAuth } from '../context/AuthContext';
import { isStudentEmail, resendConfirmation, signUp } from '../lib/auth';
import useUnsavedChanges from '../hooks/useUnsavedChanges';

export default function SignUp() {
  const { user, loading, isAdmin, isVerified } = useAuth();
  const [form, setForm] = useState({
    name: '',
    course: '',
    email: '',
    password: '',
    confirm: '',
    accepted: false,
  });
  const [rulesOpen, setRulesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState('');
  const draft = useUnsavedChanges(
    !sent &&
      Boolean(
        form.name || form.course || form.email || form.password || form.confirm || form.accepted,
      ),
    busy,
  );
  const change = (key) => (event) =>
    setForm({
      ...form,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });
  if (!loading && user)
    return (
      <Navigate to={isAdmin ? '/admin/verification' : isVerified ? '/shelf' : '/pending'} replace />
    );
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!isStudentEmail(form.email)) {
      setError('Use your @ms.bulsu.edu.ph student email.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Your passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await signUp(form);
      draft.saved();
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await resendConfirmation(form.email);
      setNotice('Confirmation email requested. Check your inbox and spam folder.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-page page-section">
      <h1>{sent ? 'Check your email' : 'Create your account'}</h1>
      {sent ? (
        <>
          <p>
            Open the confirmation link sent to <strong>{form.email}</strong>. After confirmation and
            login, add your profile photo and submit your account for admin review.
          </p>
          <Button onClick={resend} disabled={busy}>
            Resend confirmation email
          </Button>
          <p>
            <Link to="/login">Go to log in</Link>
          </p>
        </>
      ) : (
        <>
          <p>
            Use your BulSU student email. You’ll add a profile photo after confirming your email.
          </p>
          <form className="form-stack" onSubmit={submit}>
            <Field
              label="Full name"
              autoComplete="name"
              value={form.name}
              onChange={change('name')}
              required
              minLength={2}
              maxLength={100}
            />
            <Field
              label="Course, year and section"
              placeholder="Course, year and section"
              value={form.course}
              onChange={change('course')}
              required
              minLength={2}
              maxLength={100}
            />
            <Field
              label="BulSU email"
              type="email"
              autoComplete="email"
              hint="Only @ms.bulsu.edu.ph emails can sign up."
              value={form.email}
              onChange={change('email')}
              required
            />
            <Field
              label="Password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              hint="Use at least 8 characters."
              value={form.password}
              onChange={change('password')}
              required
            />
            <Field
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.confirm}
              onChange={change('confirm')}
              required
            />
            <div className="rules-consent">
              <input
                id="rules-accepted"
                type="checkbox"
                checked={form.accepted}
                onChange={change('accepted')}
                required
              />
              <span>
                <label htmlFor="rules-accepted">I agree to the community rules.</label>{' '}
                <button
                  className="text-button"
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setRulesOpen(true)}
                >
                  Read community rules
                </button>
              </span>
            </div>
            <Button type="submit" disabled={busy || loading}>
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <CommunityRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </section>
  );
}
