import ProfilePhoto from './ProfilePhoto';
import Chip from './Chip';
import { formatTimestamp } from '../../lib/dates';

export default function ProfileChangeSummary({ change }) {
  const labels = { pending: 'Awaiting review', approved: 'Approved', rejected: 'Rejected' };
  return (
    <div className="profile-change-summary">
      <div className="section-heading">
        <Chip label={labels[change.status]} tone={change.status === 'rejected' ? 'danger' : change.status === 'pending' ? 'clay' : 'info'} />
        <p className="small muted">Submitted {formatTimestamp(change.created_at)}</p>
      </div>
      <div className="profile-change-comparison">
        <div><h3>Previously approved</h3><ProfilePhoto path={change.previous_photo_path} name={change.previous_full_name} size="lg" /><p>{change.previous_full_name}</p></div>
        <div><h3>Requested changes</h3><ProfilePhoto path={change.photo_path} name={change.full_name} size="lg" /><p>{change.full_name}</p></div>
      </div>
      {change.status === 'pending' && <p className="small">The approved name and photo remain visible while these changes are reviewed.</p>}
      {change.status === 'rejected' && <p className="preserve-lines"><strong>Reason:</strong> {change.rejection_reason}</p>}
      {change.reviewed_at && <p className="small muted">Reviewed {formatTimestamp(change.reviewed_at)}</p>}
    </div>
  );
}
