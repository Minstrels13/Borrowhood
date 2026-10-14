import { useEffect, useRef, useState } from 'react';
import { getVerificationQueue, reviewStudent } from '../lib/profiles';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Tabs from '../components/ui/Tabs';
import ProfilePhoto from '../components/ui/ProfilePhoto';
import RejectVerificationModal from '../components/modals/RejectVerificationModal';
import { useToast } from '../components/ui/Toast';

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
    <section className="container page-section">
      <h1>Verification queue</h1>
      <Button
        variant="secondary"
        disabled={loading || busyId !== null || Boolean(rejecting)}
        onClick={refresh}
      >
        Refresh queue
      </Button>
      <p>
        {loading && !rows.length
          ? 'Loading students…'
          : `${total} ${status} student${total === 1 ? '' : 's'}`}
      </p>
      <p className="notice-card">
        Check the student email, submitted details and clear profile photo. Approval requires
        confirmed email, a photo, and a submitted application.
      </p>
      <Field
        label="Search students"
        type="search"
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Tabs label="Verification status" tabs={tabs} value={status} onChange={setStatus}>
        <div className="queue" aria-busy={loading}>
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
                <strong>{student.full_name}</strong>
              </div>
              <p className="queue__email">
                <span className="sr-only">BulSU email: </span>
                {student.email}
              </p>
              <p>
                <span className="sr-only">Course, year and section: </span>
                {student.course_year_section}
              </p>
              <p>
                <span className="sr-only">Email status: </span>
                {student.email_confirmed ? 'Email confirmed' : 'Email not confirmed'}
                {!student.photo_path && (
                  <>
                    <br />
                    Photo missing
                  </>
                )}
                {student.photo_path && !student.submitted_at && (
                  <>
                    <br />
                    Not submitted
                  </>
                )}
              </p>
              <p>
                <span className="sr-only">Requested: </span>
                <span className="queue__mobile-label" aria-hidden="true">
                  Requested:{' '}
                </span>
                {new Intl.DateTimeFormat('en-PH', {
                  dateStyle: 'medium',
                  timeZone: 'Asia/Manila',
                }).format(new Date(student.submitted_at || student.created_at))}
              </p>
              <div className="actions">
                {status === 'pending' ? (
                  <>
                    <Button
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
          {loading && <p role="status">Loading students…</p>}
          {!loading && !error && !rows.length && (
            <p>
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
      <RejectVerificationModal
        student={rejecting}
        onClose={() => setRejecting(null)}
        onReviewed={() => {
          notify('Student rejected.');
          refresh();
        }}
      />
    </section>
  );
}
