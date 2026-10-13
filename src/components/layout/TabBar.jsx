import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VerifiedOnlyModal from '../modals/VerifiedOnlyModal';

export default function TabBar() {
  const notify = useToast();
  const navigate = useNavigate();
  const { user, isVerified } = useAuth();
  const [wall, setWall] = useState(false);
  function open(icon) {
    if (icon === 'browse') navigate('/shelf');
    else if (!isVerified) {
      if (icon === 'profile' && user) navigate('/pending');
      else setWall(true);
    } else if (icon === 'post') navigate('/items/new');
    else if (icon === 'activity') navigate('/activity?tab=listings');
    else
      notify('Full profiles will be available in Phase 5. Use Edit profile on the shelf for now.');
  }
  return (
    <>
      <nav className="tab-bar" aria-label="Mobile navigation">
        {[
          ['browse', 'Browse'],
          ['post', 'Post'],
          ['activity', 'Activity'],
          ['profile', 'Profile'],
        ].map(([icon, label]) => (
          <button key={icon} onClick={() => open(icon)}>
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <VerifiedOnlyModal open={wall} onClose={() => setWall(false)} />
    </>
  );
}
