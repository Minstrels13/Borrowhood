import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStudentProfile, getProfileHistory } from '../lib/profiles';
import { formatDate, formatTimestamp, manilaToday } from '../lib/dates';
import useItems from '../hooks/useItems';
import usePagedResource from '../hooks/usePagedResource';
import ItemCard from '../components/items/ItemCard';
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
  if (!profile)
    return (
      <section className="container page-section">
        {loading ? (
          <p role="status">Loading profile…</p>
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
    <section className="container page-section profile-layout">
      <aside className="notice-card profile-identity">
        <ProfilePhoto path={profile.photo_path} name={profile.full_name} size="lg" />
        <h1>{profile.full_name}</h1>
        <p>{profile.course_year_section}</p>
        <span className="chip">Verified BulSU student</span>
        <p className="small muted">
          Member since {formatDate(manilaToday(new Date(profile.created_at)))}
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
          <p>
            <strong className="trust-score">{trust.score}</strong> out of 100
          </p>
          <TrustBadge level={trust.level} />
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
      <EditProfileModal
        open={editing}
        onClose={() => {
          setEditing(false);
          setRevision((value) => value + 1);
        }}
      />
    </section>
  );
}

function ProfileListings({ id }) {
  const list = useItems({ ownerId: id });
  return (
    <section>
      <h2>Listings</h2>
      {list.error && (
        <div role="alert">
          <p>{list.error}</p>
          <Button onClick={list.retry}>Try again</Button>
        </div>
      )}
      {!list.loading && !list.error && !list.items.length && <p>No listings yet.</p>}
      <div className="item-grid">
        {list.items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
      {list.loading && <p role="status">Loading listings…</p>}
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
    <section>
      <h2>Condition history</h2>
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
          <li className="notice-card" key={`${entry.returned_at}:${index}`}>
            <h3>{entry.title}</h3>
            <p>
              {entry.role === 'borrowed' ? 'Borrowed from' : 'Lent to'} {entry.other_name} ·{' '}
              {formatDate(entry.start_date)} to {formatDate(entry.end_date)}
            </p>
            <p>
              {entry.late ? 'Returned late' : 'Returned on time'} · {conditions[entry.condition]}
            </p>
            <p className="small muted">Returned {formatTimestamp(entry.returned_at)} (Manila)</p>
            {entry.request_id && (
              <Button variant="secondary" to={`/requests/${entry.request_id}`}>
                View condition records
              </Button>
            )}
          </li>
        ))}
      </ul>
      {list.loading && <p role="status">Loading history…</p>}
      {list.entries.length < list.total && (
        <Button variant="secondary" disabled={list.loading} onClick={list.loadMore}>
          Load more history
        </Button>
      )}
    </section>
  );
}
