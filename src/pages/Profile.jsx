import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStudentProfile, getProfileHistory } from '../lib/profiles';
import { daysLate, formatDate, formatTimestamp, manilaToday } from '../lib/dates';
import useItems from '../hooks/useItems';
import usePagedResource from '../hooks/usePagedResource';
import ListingRow from '../components/items/ListingRow';
import Chip from '../components/ui/Chip';
import Skeleton from '../components/ui/Skeleton';
import { signOut } from '../lib/auth';
import { useToast } from '../components/ui/Toast';
import { useDraftNavigation } from '../context/DraftContext';
import ProfilePhoto from '../components/ui/ProfilePhoto';
import TrustBadge from '../components/ui/TrustBadge';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import EditProfileModal from '../components/modals/EditProfileModal';
import { conditions } from '../components/modals/RequestActionModal';

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const target = id || user.id;
  return <StudentProfile key={`${user.id}:${target}`} id={target} own={target === user.id} />;
}

function StudentProfile({ id, own }) {
  const navigate = useNavigate();
  const notify = useToast();
  const confirmNavigation = useDraftNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'history' ? 'history' : 'listings';
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getStudentProfile(id)
      .then((value) => {
        if (active) setProfile(value);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  function logout() {
    confirmNavigation(async () => {
      try {
        await signOut();
        navigate('/');
      } catch (failure) {
        notify(failure.message);
      }
    });
  }
  if (!profile)
    return (
      <section className="container page-section">
        {loading ? (
          <><p role="status">Loading profile…</p><div className="profile-loading"><Skeleton variant="avatar" /><Skeleton variant="text" lines={5} /></div></>
        ) : (
          <>
            <h1>Profile unavailable</h1>
            <p role={error ? 'alert' : undefined}>
              {error || 'This student’s profile is unavailable.'}
            </p>
            <div className="actions">
              <Button onClick={() => setRevision((value) => value + 1)}>Try again</Button>
              <Button variant="secondary" to="/shelf">
                Back to shelf
              </Button>
            </div>
          </>
        )}
      </section>
    );
  const trust = profile.trust;
  return (
    <>
    <section className="container page-section profile-layout profile-page">
      <aside className="notice-card profile-identity">
        <ProfilePhoto path={profile.photo_path} name={profile.full_name} size="lg" />
        <h1>{profile.full_name}</h1>
        <p>{profile.course_year_section}</p>
        <Chip label="Verified BulSU student" tone="info" />
        <p className="small muted">
          Member since {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(profile.created_at))}
        </p>
        {own && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        )}
      </aside>
      <div className="profile-content">
        <section className="notice-card trust-record">
          <div className="section-heading">
            <h2>Trust record</h2>
            <Button
              variant="secondary"
              disabled={loading || editing}
              onClick={() => setRevision((value) => value + 1)}
            >
              Refresh profile
            </Button>
          </div>
          <div className="trust-record__summary">
          <p>
            <strong className="trust-score">{trust.score}</strong> out of 100
          </p>
          <TrustBadge level={trust.level} />
          </div>
          <dl className="trust-counters">
            {[
              ['On-time returns', trust.on_time],
              ['Late returns', trust.late],
              ['Condition issues', trust.damaged],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <progress max="100" value={trust.score} aria-label="Trust score" />
          <p className="small muted">
            {trust.completed
              ? 'Based on completed borrows: 8 points deducted for each late return and 15 for each damaged return. Minor wear has no penalty.'
              : 'No completed borrows yet. A new student starts at 100.'}
          </p>
        </section>
        {error && <p role="alert">Unable to refresh profile: {error}</p>}
        <div className="profile-sections">
        <Tabs
          label="Profile sections"
          tabs={[
            { value: 'listings', label: 'Listings' },
            { value: 'history', label: 'Condition history' },
          ]}
          value={tab}
          onChange={(value) => setParams({ tab: value })}
        >
          {tab === 'history' ? (
            <ProfileHistory key={`${id}:${revision}`} id={id} />
          ) : (
            <ProfileListings key={`${id}:${revision}`} id={id} />
          )}
        </Tabs>
        </div>
        {own && <Button className="profile-logout" variant="secondary" onClick={logout}>Log out</Button>}
      </div>
      <EditProfileModal
        open={editing}
        onClose={() => {
          setEditing(false);
          setRevision((value) => value + 1);
        }}
      />
    </section>
    </>
  );
}

function ProfileListings({ id }) {
  const list = useItems({ ownerId: id });
  return (
    <section className="profile-listings">
      <h2 className="sr-only">Listings</h2>
      {list.error && (
        <div role="alert">
          <p>{list.error}</p>
          <Button onClick={list.retry}>Try again</Button>
        </div>
      )}
      {!list.loading && !list.error && !list.items.length && <p>No listings yet.</p>}
      <div className="listing-rows">
        {list.items.map((item) => (
          <ListingRow key={item.id} item={item} />
        ))}
      </div>
      {list.loading && <><p role="status">Loading listings…</p><Skeleton variant="text" lines={3} /></>}
      {list.items.length < list.total && (
        <Button variant="secondary" disabled={list.loading} onClick={list.loadMore}>
          Load more listings
        </Button>
      )}
    </section>
  );
}

function ProfileHistory({ id }) {
  const fetchPage = useCallback((offset) => getProfileHistory(id, offset), [id]);
  const list = usePagedResource(fetchPage);
  return (
    <section className="profile-history">
      <h2 className="sr-only">Condition history</h2>
      <p className="muted">
        Completed borrows and loans. Only borrowing outcomes affect this student's trust record.
      </p>
      {list.error && (
        <div role="alert">
          <p>{list.error}</p>
          <Button onClick={list.refresh}>Try again</Button>
        </div>
      )}
      {!list.loading && !list.error && !list.entries.length && <p>No completed activity yet.</p>}
      <ul className="history-list">
        {list.entries.map((entry, index) => (
          <li className="profile-history-row" key={`${entry.returned_at}:${index}`}>
            <div className="profile-history-row__main">
            <h3>{entry.title}</h3>
            <p>
              {entry.role === 'borrowed' ? 'Borrowed from' : 'Lent to'} {entry.other_name} ·{' '}
              {formatDate(entry.start_date)} to {formatDate(entry.end_date)}
            </p>
            <p className="small muted">Returned {formatTimestamp(entry.returned_at)} (Manila)</p>
            </div>
            <div className="profile-history-row__outcome">
              <span className={entry.late ? 'profile-history-row__late' : undefined}>
                {entry.late ? `Returned ${daysLate(entry, manilaToday(new Date(entry.returned_at)))} ${daysLate(entry, manilaToday(new Date(entry.returned_at))) === 1 ? 'day' : 'days'} late` : 'Returned on time'}
              </span>
              <Chip label={conditions[entry.condition]} tone={entry.condition === 'damaged' ? 'danger' : entry.condition === 'minor_wear' ? 'clay' : 'info'} />
            </div>
            {entry.request_id && (
              <Button variant="secondary" to={`/requests/${entry.request_id}`}>
                View condition records
              </Button>
            )}
          </li>
        ))}
      </ul>
      {list.loading && <><p role="status">Loading history…</p><Skeleton variant="text" lines={4} /></>}
      {list.entries.length < list.total && (
        <Button variant="secondary" disabled={list.loading} onClick={list.loadMore}>
          Load more history
        </Button>
      )}
    </section>
  );
}
