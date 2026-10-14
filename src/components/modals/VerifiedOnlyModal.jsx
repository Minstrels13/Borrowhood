import Modal from './Modal';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function VerifiedOnlyModal({ open, onClose, purpose, returnTo }) {
  const { user } = useAuth();
  return (
    <Modal open={open} onClose={onClose} title="Verified students only">
      <p>
        {purpose === 'profile'
          ? 'Log in with a verified student account to view full profiles, courses and condition history.'
          : user
            ? 'Complete your email, photo and admin review before posting, requesting or commenting.'
            : 'Sign up with your BulSU email and complete verification to post, request, and comment.'}
      </p>
      <div className="actions">
        {user ? (
          <Button to="/pending" state={{ from: returnTo }} onClick={onClose}>
            Check verification status
          </Button>
        ) : (
          <>
            <Button to="/signup" onClick={onClose}>
              Sign up
            </Button>
            <Button variant="secondary" to="/login" state={{ from: returnTo }} onClick={onClose}>
              Log in
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
