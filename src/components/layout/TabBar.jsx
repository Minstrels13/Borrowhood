import Icon from '../ui/Icon';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VerifiedOnlyModal from '../modals/VerifiedOnlyModal';

export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isVerified } = useAuth();
  const [wall, setWall] = useState(false);
  function open(icon) {
    if (icon === 'browse') navigate('/shelf');
    else if (!isVerified) {
      if (icon === 'profile' && user) navigate('/pending');
      else setWall(true);
    } else if (icon === 'post') navigate('/items/new');
    else if (icon === 'activity') navigate('/activity?tab=requests');
    else navigate('/profile');
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
          <button
            key={icon}
            aria-current={
              (icon === 'browse' && pathname === '/shelf') ||
              (icon === 'post' && (pathname === '/items/new' || pathname.endsWith('/edit'))) ||
              (icon === 'activity' &&
                (pathname === '/activity' ||
                  pathname.startsWith('/requests/') ||
                  pathname.endsWith('/requests'))) ||
              (icon === 'profile' && pathname === '/profile')
                ? 'page'
                : undefined
            }
            onClick={() => open(icon)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <VerifiedOnlyModal open={wall} onClose={() => setWall(false)} />
    </>
  );
}
