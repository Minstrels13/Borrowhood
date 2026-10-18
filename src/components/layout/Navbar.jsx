import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Logo from '../ui/Logo';
import { brand } from '../../config/brand';
import { navigationArea } from '../../config/navigation';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Chip from '../ui/Chip';
import ProfilePhoto from '../ui/ProfilePhoto';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../lib/auth';
import VerifiedOnlyModal from '../modals/VerifiedOnlyModal';
import { useDraftNavigation } from '../../context/DraftContext';

export default function Navbar({ role: previewRole, context, activePath }) {
  const auth = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const notify = useToast();
  const [wall, setWall] = useState(false);
  const account = useRef(null);
  const confirmNavigation = useDraftNavigation();
  // Role specimens change presentation only; all actions retain real auth guards.
  const role = previewRole || (
    auth.isAdmin ? 'admin' : auth.isVerified ? 'verified' : auth.user ? 'unverified' : 'guest'
  );
  const currentPath = previewRole && activePath ? activePath : pathname;
  const area = navigationArea(currentPath);
  const accountTo = role === 'admin'
    ? '/admin/verification'
    : role === 'unverified' ? '/pending' : '/profile';
  useEffect(() => {
    function dismiss(event) {
      // A draft dialog must be able to restore focus to its disclosure trigger.
      if (document.querySelector('dialog[open]')) return;
      if (account.current && !account.current.contains(event.target)) account.current.open = false;
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  useEffect(() => {
    if (account.current) account.current.open = false;
  }, [pathname]);
  async function logout() {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      notify(error.message);
    }
  }
  function closeAccount() {
    if (account.current) account.current.open = false;
  }
  function guardedNavigate(to) {
    if (auth.isVerified) navigate(to);
    else setWall(true);
  }
  function confirmLogout() {
    // Leave the disclosure open if a dirty-draft confirmation is cancelled.
    confirmNavigation(() => {
      closeAccount();
      return logout();
    });
  }
  function accountKeyDown(event) {
    if (event.key === 'Escape' && account.current?.open) {
      event.preventDefault();
      closeAccount();
      account.current.querySelector('summary').focus();
    }
  }
  return (
    <header className={`navbar ${context ? 'navbar--context' : ''}`}>
      <div className="container navbar__inner">
        <Link
          to={role === 'guest' ? '/' : '/shelf'}
          className="brand-link"
          aria-label={`${brand.name} home`}
        >
          <Logo decorative />
        </Link>
        {context && (
          <div className="mobile-header-context">
            {context.backTo && (
              <Button variant="ghost" className="icon-button" to={context.backTo} aria-label="Go back">
                <Icon name="arrow" />
              </Button>
            )}
            <span className="mobile-header-title">{context.title}</span>
          </div>
        )}
        <nav className="desktop-nav" aria-label="Main navigation">
          {role === 'admin' ? (
            <>
              <Button
                variant="ghost"
                to="/admin/verification"
                aria-current={currentPath === '/admin/verification' ? 'page' : undefined}
              >
                Verification
              </Button>
              <Link className="navbar__link" to="/shelf">
                Back to shelf
              </Link>
            </>
          ) : role === 'guest' && currentPath === '/' ? (
            <>
              <a className="navbar__link" href="#how-it-works">How it works</a>
              <a className="navbar__link" href="#features">Features</a>
              <a className="navbar__link" href="#faq">FAQ</a>
            </>
          ) : (
            <>
              <Button variant="ghost" to="/shelf" aria-current={area === 'browse' ? 'page' : undefined}>
                Browse
              </Button>
              {role !== 'guest' && (
                <>
                  <Button
                    variant="ghost"
                    aria-current={area === 'post' ? 'page' : undefined}
                    onClick={() => guardedNavigate('/items/new')}
                  >
                    Post an item
                  </Button>
                  <Button
                    variant="ghost"
                    aria-current={area === 'activity' ? 'page' : undefined}
                    onClick={() => guardedNavigate('/activity?tab=requests')}
                  >
                    My Activity
                  </Button>
                </>
              )}
            </>
          )}
        </nav>
        <nav className="account-nav" aria-label="Account">
          {role === 'guest' ? (
            <>
              <Button variant="ghost" to="/login">Log in</Button>
              <Button to="/signup">Sign up</Button>
            </>
          ) : (
            <>
              {role === 'unverified' && (
                <Chip label="Pending verification" tone="clay" className="navbar__status" />
              )}
              {role === 'admin' && <Chip label="Admin" tone="info" className="navbar__status" />}
              <details className="account-disclosure" ref={account} onKeyDown={accountKeyDown}>
                <summary className="icon-button" aria-label="Open account menu">
                  <ProfilePhoto
                    inline
                    decorative
                    path={previewRole ? undefined : auth.profile?.photo_path}
                    name={auth.profile?.full_name}
                    size="sm"
                  />
                  <Icon name="chevron-down" />
                </summary>
                <div className="account-disclosure__panel">
                  <Button variant="ghost" to={accountTo} onClick={closeAccount}>
                    {role === 'admin' ? 'Verification queue' : role === 'unverified' ? 'Verification status' : 'My profile'}
                  </Button>
                  <Button variant="ghost" disabled={Boolean(previewRole)} onClick={confirmLogout}>
                    Log out
                  </Button>
                </div>
              </details>
            </>
          )}
        </nav>
      </div>
      <VerifiedOnlyModal open={wall} onClose={() => setWall(false)} />
    </header>
  );
}
