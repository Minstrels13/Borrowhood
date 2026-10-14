import ProfilePhoto from '../ui/ProfilePhoto';
import TrustBadge from '../ui/TrustBadge';
import VerifiedOnlyModal from '../modals/VerifiedOnlyModal';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function OwnerSummary({ owner, showProfile = false, interactive = true }) {
  const { isVerified } = useAuth();
  const navigate = useNavigate();
  const [wall, setWall] = useState(false);
  if (!owner) return <p className="muted">Owner details unavailable.</p>;
  return (
    <div className="owner-summary">
      <ProfilePhoto
        path={owner.photo_path}
        name={owner.full_name}
        size={showProfile ? 'md' : 'sm'}
      />
      {interactive ? (
        <button
          type="button"
          className={showProfile ? 'owner-summary__name' : 'owner-summary__link'}
          aria-label={`View ${owner.full_name}'s profile`}
          onClick={() => {
            if (!isVerified) setWall(true);
            else navigate(`/users/${owner.id}`);
          }}
        >
          {owner.full_name}
        </button>
      ) : (
        <span>{owner.full_name}</span>
      )}
      <TrustBadge level={owner.trust_level} />
      <VerifiedOnlyModal
        open={wall}
        onClose={() => setWall(false)}
        purpose="profile"
        returnTo={`/users/${owner.id}`}
      />
    </div>
  );
}
