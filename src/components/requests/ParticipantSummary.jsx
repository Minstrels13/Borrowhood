import { Link } from 'react-router-dom';
import ProfilePhoto from '../ui/ProfilePhoto';
import TrustBadge from '../ui/TrustBadge';
import Skeleton from '../ui/Skeleton';
import Button from '../ui/Button';

export default function ParticipantSummary({ person, label, isSelf, trust, onRetry }) {
  return (
    <section className="request-person">
      <h2>{label}{isSelf ? ' (you)' : ''}</h2>
      <div className="request-person__identity">
        <ProfilePhoto path={person.photo_path} name={person.full_name} />
        <div>
          <Link className="request-participant-name" to={`/users/${person.id}`}
            aria-label={`View ${person.full_name}'s profile`}>{person.full_name}</Link>
          <p>{person.course_year_section}</p>
        </div>
        <div className="request-person__trust">
          {!trust || trust.loading ? <><Skeleton variant="text" lines={1} /><span className="sr-only" role="status">Loading trust record</span></> : trust.error ? (
            <><p>Trust record unavailable.</p><Button variant="ghost" onClick={onRetry}>Retry trust record</Button></>
          ) : <TrustBadge level={trust.level} />}
        </div>
      </div>
    </section>
  );
}
