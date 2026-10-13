import Modal from './Modal';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function VerifiedOnlyModal({ open, onClose }) {
  const { user } = useAuth();
  return (
    <Modal open={open} onClose={onClose} title="Verified students only">
      <p>
        {user
          ? 'Complete your email, photo and admin review before posting, requesting or commenting.'
          : 'Sign up with your BulSU email and complete verification to post, request, and comment.'}
      </p>
      <div className="actions">
        {user ? (
          <Button to="/pending" onClick={onClose}>
            Check verification status
          </Button>
        ) : (
          <>
            <Button to="/signup" onClick={onClose}>
              Sign up
            </Button>
            <Button variant="secondary" to="/login" onClick={onClose}>
              Log in
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
