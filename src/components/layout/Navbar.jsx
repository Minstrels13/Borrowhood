import { Link, useNavigate } from 'react-router-dom';
import Logo from '../ui/Logo';
import { brand } from '../../config/brand';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../lib/auth';
import { useState } from 'react';
import VerifiedOnlyModal from '../modals/VerifiedOnlyModal';
import { useDraftNavigation } from '../../context/DraftContext';

export default function Navbar({ role: previewRole }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const notify = useToast();
  const [wall, setWall] = useState(false);
  const confirmNavigation = useDraftNavigation();
  const role = previewRole || (auth.isAdmin ? 'admin' : auth.user ? 'student' : 'guest');
  async function logout() {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      notify(error.message);
    }
  }
  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link
          to={role === 'guest' ? '/' : '/shelf'}
          className="brand-link"
          aria-label={`${brand.name} home`}
        >
          <Logo />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {role === 'admin' ? (
            <>
              <Button variant="ghost" to="/admin/verification">
                Verification
              </Button>
              <Button variant="ghost" to="/shelf">
                Back to shelf
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" to="/shelf">
                Browse
              </Button>
              {role !== 'guest' && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => (auth.isVerified ? navigate('/items/new') : setWall(true))}
                  >
                    Post an item
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      auth.isVerified ? navigate('/activity?tab=requests') : setWall(true)
                    }
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
              <Button variant="ghost" to="/login">
                Log in
              </Button>
              <Button to="/signup">Sign up</Button>
            </>
          ) : (
            <>
              <Link
                className="icon-button"
                aria-label="Open account"
                to={
                  auth.isVerified
                    ? '/profile'
                    : role === 'admin'
                      ? '/admin/verification'
                      : '/pending'
                }
              >
                <Avatar />
              </Link>
              <Button variant="ghost" onClick={() => confirmNavigation(logout)}>
                Log out
              </Button>
            </>
          )}
        </nav>
      </div>
      <VerifiedOnlyModal open={wall} onClose={() => setWall(false)} />
    </header>
  );
}
