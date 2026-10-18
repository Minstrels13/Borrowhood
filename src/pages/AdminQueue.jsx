import { useEffect, useRef, useState } from 'react';
import { getVerificationQueue, reviewStudent } from '../lib/profiles';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Tabs from '../components/ui/Tabs';
import ProfilePhoto from '../components/ui/ProfilePhoto';
import RejectVerificationModal from '../components/modals/RejectVerificationModal';
import { useToast } from '../components/ui/Toast';
import Chip from '../components/ui/Chip';
import Skeleton from '../components/ui/Skeleton';
import { formatTimestamp } from '../lib/dates';
import { brand } from '../config/brand';
import Icon from '../components/ui/Icon';

const tabs = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];
export default function AdminQueue() {
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
    <section className="container page-section admin-page">
      <header className="section-heading admin-page__heading">
      <h1>Verification queue</h1>
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
                  <span className="queue__prerequisite">Photo missing</span>
                )}
                {student.photo_path && !student.submitted_at && (
                  <span className="queue__prerequisite">Not submitted</span>
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
    </section>
    <footer className="account-page-footer">{brand.name} | {brand.project}</footer>
    </>
  );
}
