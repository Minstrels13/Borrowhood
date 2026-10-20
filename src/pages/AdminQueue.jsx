import { useCallback, useEffect, useRef, useState } from 'react';
import { getVerificationQueue, reviewStudent, getProfileChangeQueue } from '../lib/profiles';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Tabs from '../components/ui/Tabs';
import ProfilePhoto from '../components/ui/ProfilePhoto';
import RejectVerificationModal from '../components/modals/RejectVerificationModal';
import { useToast } from '../components/ui/Toast';
import Chip from '../components/ui/Chip';
import Skeleton from '../components/ui/Skeleton';
import { formatTimestamp } from '../lib/dates';
import Icon from '../components/ui/Icon';
import usePagedResource from '../hooks/usePagedResource';
import ReviewProfileChangeModal from '../components/modals/ReviewProfileChangeModal';

const tabs = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];
export default function AdminQueue() {
  const [queue, setQueue] = useState('students');
  return (
    <section className="container page-section admin-page">
      <h1>Verification queue</h1>
      <Tabs label="Review queue" value={queue} onChange={setQueue} tabs={[
        { value: 'students', label: 'Account verification' },
        { value: 'changes', label: 'Profile changes' },
      ]}>
        {queue === 'students' ? <StudentVerificationQueue /> : <ProfileChangeQueue />}
      </Tabs>
    </section>
  );
}

function StudentVerificationQueue() {
  const notify = useToast();
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  async function load(offset, append = false) {
    const ticket = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const data = await getVerificationQueue(status, query, offset);
      if (ticket !== generation.current) return;
      setRows((previous) => (append ? [...previous, ...data] : data));
      setTotal(Number(data[0]?.total_count || 0));
    } catch (err) {
      if (ticket === generation.current) setError(err.message);
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    setRows([]);
    setTotal(0);
    void load(0);
    return () => {
      generation.current++;
    };
  }, [status, query, revision]);
  const refresh = () => setRevision((value) => value + 1);
  async function approve(student) {
    setBusyId(student.id);
    setError('');
    try {
      await reviewStudent(student.id, 'approved');
      notify(`${student.full_name} approved.`);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }
  return (
    <>
    <div className="admin-page">
      <header className="section-heading admin-page__heading">
      <h2>Account verification</h2>
      <Button
        variant="secondary"
        disabled={loading || busyId !== null || Boolean(rejecting)}
        onClick={refresh}
      >
        Refresh queue
      </Button>
      </header>
      <p className="admin-page__count">
        {loading && !rows.length
          ? 'Loading students…'
          : error && !rows.length ? 'Unable to load student count.' : status === 'pending'
            ? `${total} ${total === 1 ? 'student is' : 'students are'} waiting for review.`
            : `${total} ${status} student${total === 1 ? '' : 's'}`}
      </p>
      <div className="admin-guidance">
      <span className="admin-guidance__icon" aria-hidden="true">i</span>
      <p>
        Check the student email, submitted details and clear profile photo. Approval requires
        confirmed email, a photo, and a submitted application.
      </p>
      </div>
      <div className="admin-controls">
      <div className="admin-search">
      <Icon name="search" className="admin-search__icon" />
      <Field
        label="Search students"
        type="search"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      </div>
      <div className="admin-tabs">
      <Tabs label="Verification status" tabs={tabs.map((tab) => ({ ...tab, label: tab.value === 'pending' && status === 'pending' && !loading && !error ? `Pending (${total})` : tab.label }))} value={status} onChange={setStatus}>
        <div className="queue" aria-busy={loading} role="region" aria-label="Student verification list" tabIndex={0}>
          <div className="queue__head" aria-hidden="true">
            <span>Student</span>
            <span>BulSU email</span>
            <span>Course</span>
            <span>Email status</span>
            <span>Requested</span>
            <span>Actions</span>
          </div>
          {rows.map((student) => (
            <article className="queue__row" key={student.id}>
              <div className="queue__student">
                <ProfilePhoto path={student.photo_path} name={student.full_name} />
                <strong title={student.full_name}>{student.full_name}</strong>
              </div>
              <p className="queue__email" title={student.email}>
                <span className="sr-only">BulSU email: </span>
                {student.email}
              </p>
              <p className="queue__course" title={student.course_year_section}>
                <span className="sr-only">Course, year and section: </span>
                {student.course_year_section}
              </p>
              <p className="queue__status">
                <span className="sr-only">Email status: </span>
                <Chip label={student.email_confirmed ? 'Confirmed' : 'Not confirmed'} tone={student.email_confirmed ? 'info' : 'neutral'} />
                {!student.photo_path && (
                  <Chip label="Photo missing" tone="danger" />
                )}
                {student.photo_path && !student.submitted_at && (
                  <Chip label="Not submitted" tone="clay" />
                )}
              </p>
              <p className="queue__requested" title={formatTimestamp(student.submitted_at || student.created_at)}>
                <span className="sr-only">Requested: </span>
                <span className="queue__mobile-label" aria-hidden="true">
                  Requested:{' '}
                </span>
                {formatTimestamp(student.submitted_at || student.created_at)}
              </p>
              <div className="actions queue__actions">
                {status === 'pending' ? (
                  <>
                    <Button
                      aria-label={`Approve ${student.full_name}`}
                      disabled={
                        !student.email_confirmed ||
                        !student.photo_path ||
                        !student.submitted_at ||
                        busyId !== null ||
                        loading
                      }
                      onClick={() => approve(student)}
                    >
                      {busyId === student.id ? 'Approving…' : 'Approve'}
                    </Button>
                    <Button
                      aria-label={`Reject ${student.full_name}`}
                      variant="secondary"
                      disabled={busyId !== null || loading}
                      onClick={() => setRejecting(student)}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <span className="muted">{status === 'approved' ? 'Approved' : 'Rejected'}</span>
                )}
              </div>
            </article>
          ))}
          {loading && <><p role="status">Loading students…</p><Skeleton variant="text" lines={4} /></>}
          {!loading && !error && !rows.length && (
            <p className="admin-empty">
              No {status} students{query ? ' match your search' : ' yet'}.
            </p>
          )}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <Button variant="secondary" onClick={refresh}>
                Try again
              </Button>
            </div>
          )}
          {rows.length < total && (
            <Button variant="secondary" disabled={loading} onClick={() => load(rows.length, true)}>
              Load more
            </Button>
          )}
        </div>
      </Tabs>
      </div>
      </div>
      <RejectVerificationModal
        student={rejecting}
        onClose={() => setRejecting(null)}
        onReviewed={() => {
          notify('Student rejected.');
          refresh();
        }}
      />
    </div>
    </>
  );
}

function ProfileChangeQueue() {
  const notify = useToast();
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const heading = useRef(null);
  const reviewed = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const fetchPage = useCallback((offset) => getProfileChangeQueue(status, query, offset), [status, query]);
  const list = usePagedResource(fetchPage);
  return (
    <div className="profile-change-queue">
      <header className="section-heading"><h2 ref={heading} tabIndex={-1}>Profile changes</h2><Button variant="secondary" disabled={list.loading || Boolean(selected)} onClick={list.refresh}>Refresh changes</Button></header>
      <p className="small">Review changes to approved names and photos. Students keep their current identity and borrowing access until approval. Course details do not need review.</p>
      <Field label="Search profile changes" type="search" placeholder="Search by name or email" value={search} onChange={(event) => setSearch(event.target.value)} />
      <Tabs label="Profile change status" tabs={tabs} value={status} onChange={setStatus}>
        <div aria-busy={list.loading}>
          {!list.loading && !list.error && <p className="small" role="status">{list.total} {status} profile change{list.total === 1 ? '' : 's'}</p>}
          <ul className="profile-change-list">
            {list.entries.map((change) => <li key={change.id} className="notice-card profile-change-row">
              <ProfilePhoto path={change.previous_photo_path} name={change.previous_full_name} />
              <div className="profile-change-row__details"><h3>{change.previous_full_name}</h3><p>{change.email}</p><p className="small muted">Submitted {formatTimestamp(change.created_at)}</p></div>
              <div className="actions">
                {change.full_name !== change.previous_full_name && <Chip label="Name change" tone="info" />}
                {change.photo_path !== change.previous_photo_path && <Chip label="Photo change" tone="info" />}
                <Button variant="secondary" disabled={list.loading} onClick={() => setSelected(change)} aria-label={`${status === 'pending' ? 'Review' : 'View'} profile changes for ${change.previous_full_name}`}>{status === 'pending' ? 'Review changes' : 'View details'}</Button>
              </div>
            </li>)}
          </ul>
          {list.loading && <><p role="status">Loading profile changes…</p><Skeleton variant="text" lines={4} /></>}
          {list.error && <div role="alert"><p>{list.error}</p><Button variant="secondary" onClick={list.refresh}>Try again</Button></div>}
          {!list.loading && !list.error && !list.entries.length && <p>No {status} profile changes{query ? ' match your search' : ' yet'}.</p>}
          {list.entries.length < list.total && <Button variant="secondary" disabled={list.loading} onClick={list.loadMore}>Load more changes</Button>}
        </div>
      </Tabs>
      <ReviewProfileChangeModal change={selected} onClose={() => {
        setSelected(null);
        if (reviewed.current) {
          reviewed.current = false;
          requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
        }
      }} onReviewed={(decision) => {
        reviewed.current = true;
        notify(decision === 'approved' ? 'Profile changes approved.' : 'Profile changes rejected.');
        list.refresh();
      }} />
    </div>
  );
}
