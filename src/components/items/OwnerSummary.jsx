import ProfilePhoto from '../ui/ProfilePhoto';
import TrustBadge from '../ui/TrustBadge';
import VerifiedOnlyModal from '../modals/VerifiedOnlyModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';
import { useState } from 'react';

export default function OwnerSummary({ owner, showProfile = false }) {
  const { isVerified } = useAuth();
  const notify = useToast();
  const [wall, setWall] = useState(false);
  if (!owner) return <p className="muted">Owner details unavailable.</p>;
  return (
    <div className="owner-summary">
      <ProfilePhoto path={owner.photo_path} name={owner.full_name} size={showProfile ? 'md' : 'sm'} />
      {showProfile ? (
        <button
          type="button"
          className="owner-summary__name"
          aria-label={`View ${owner.full_name}'s profile`}
          onClick={() => {
            if (!isVerified) setWall(true);
            else notify('Full profiles will be available in Phase 5.');
          }}
        >
          {owner.full_name}
        </button>
      ) : (
        <span>{owner.full_name}</span>
      )}
      <TrustBadge level={owner.trust_level} />
      <VerifiedOnlyModal open={wall} onClose={() => setWall(false)} />
    </div>
  );
}
