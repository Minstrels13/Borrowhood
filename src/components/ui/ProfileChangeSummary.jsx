import { useState } from 'react';
import ProfilePhoto from './ProfilePhoto';
import Chip from './Chip';
import Icon from './Icon';
import PhotoViewer from '../modals/PhotoViewer';
import { photoUrl } from '../../lib/profiles';
import { profileChangeDetails, nameDifference } from '../../lib/profileChanges';
import { formatTimestamp } from '../../lib/dates';

export default function ProfileChangeSummary({ change, compact = false, showStatus = true, student = false }) {
  const [viewer, setViewer] = useState(null);
  const details = profileChangeDetails(change);
  const difference = nameDifference(change.previous_full_name, change.full_name);
  const labels = { pending: 'Awaiting review', approved: 'Approved', rejected: 'Rejected' };
  const photos = details.photo ? [
    { storage_path: change.previous_photo_path, alt: `Previously approved photo of ${change.previous_full_name}` },
    { storage_path: change.photo_path, alt: `Requested photo of ${change.full_name}` },
  ] : [{ storage_path: change.previous_photo_path, alt: `Unchanged approved photo of ${change.previous_full_name}` }];
  function picture(index, size) {
    const photo = photos[index];
    return <ProfilePhoto path={photo.storage_path} name={index ? change.full_name : change.previous_full_name}
      alt={photo.alt} size={size} onOpen={(url) => setViewer({ index, url })} />;
  }
  return (
    <div className={`profile-change-summary${compact ? ' profile-change-summary--compact' : ''}`}>
      {showStatus && <div className="section-heading">
        <Chip label={labels[change.status]} tone={change.status === 'rejected' ? 'danger' : change.status === 'pending' ? 'clay' : 'info'} />
        <p className="small muted">Submitted {formatTimestamp(change.created_at)}</p>
      </div>}
      {student && change.status === 'pending' && <p className="profile-change-pending" role="status">Pending review: {details.pending}</p>}
      {!compact && !details.name && <p className="profile-change-unchanged">Unchanged name: <strong>{change.previous_full_name}</strong></p>}
      <div className="profile-change-comparison">
        <div className="profile-change-comparison__card">
          <h3>Previously approved</h3>
          {details.photo && picture(0, 'lg')}
          {details.name && <p className="profile-change-name">{difference.prefix}{difference.removed && <del>{difference.removed}</del>}{difference.suffix}</p>}
        </div>
        <span className="profile-change-comparison__arrow" aria-hidden="true"><Icon name="chevron-down" /></span>
        <div className="profile-change-comparison__card">
          <h3>Requested changes</h3>
          {details.photo && picture(1, 'lg')}
          {details.name && <p className="profile-change-name">{difference.prefix}{difference.added && <mark>{difference.added}</mark>}{difference.suffix}</p>}
        </div>
      </div>
      {!compact && !details.photo && <div className="profile-change-unchanged">{picture(0, 'sm')}<span>Unchanged photo</span></div>}
      {student && change.status === 'pending' && <p className="small">Your approved details and borrowing access stay active while these changes are reviewed.</p>}
      {change.status === 'rejected' && <p className="preserve-lines"><strong>Reason:</strong> {change.rejection_reason}</p>}
      {showStatus && change.reviewed_at && <p className="small muted">Reviewed {formatTimestamp(change.reviewed_at)}</p>}
      {viewer && <PhotoViewer photo={viewer} title="Profile photo comparison" photos={photos} total={photos.length}
        resolvePhoto={photoUrl} onClose={() => setViewer(null)} />}
    </div>
  );
}
