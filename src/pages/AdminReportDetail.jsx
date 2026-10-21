import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useReportResource from '../hooks/useReportResource';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import { getAdminReport, startReportReview } from '../lib/reports';
import { formatDate } from '../lib/dates';
import ReportSummary from '../components/reports/ReportSummary';
import ReportFormModal from '../components/modals/ReportFormModal';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

export default function AdminReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  return <ReportDetail key={`${user.id}:${id}`} id={id} />;
}
function ReportDetail({ id }) {
  const location = useLocation();
  const fetchReport = useCallback(() => getAdminReport(id), [id]);
  const resource = useReportResource(fetchReport, `admin-report:${id}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [restore, setRestore] = useState(false);
  const heading = useRef(null);
  const resolveButton = useRef(null);
  const notify = useToast();
  const guard = useUnsavedChanges(false, busy);
  const report = resource.data;
  useEffect(() => {
    if (!restore || resource.loading || resolving) return;
    const frame = requestAnimationFrame(() => { (resolveButton.current || heading.current)?.focus(); setRestore(false); });
    return () => cancelAnimationFrame(frame);
  }, [restore, resource.loading, resolving]);
  async function refresh() {
    const result = await resource.refresh();
    if (result !== undefined) { setNeedsRefresh(false); setError(''); }
    return result;
  }
  async function review() {
    if (busy || resource.loading || needsRefresh || !report?.can_review) return;
    setBusy(true);
    try {
      await startReportReview(report);
      guard.saved();
      notify('Report review started.');
      setRestore(true);
      await refresh();
    } catch (failure) { setError(failure.message); setNeedsRefresh(true); }
    finally { setBusy(false); }
  }
  return <section className="container page-section admin-report-detail">
    <Button variant="ghost" to="/admin/verification?tab=reports" state={location.state}>← Reports</Button>
    <h1 ref={heading} tabIndex={-1}>{report ? `Report ${report.reference}` : 'Report details'}</h1>
    <Button variant="secondary" disabled={resource.loading || busy || resolving} onClick={refresh}>Refresh report</Button>
    {resource.loading && <><p role="status">Loading report…</p><Skeleton variant="text" lines={4} /></>}
    {(resource.error || error) && <div role="alert"><p>{resource.error || error}</p><Button variant="secondary" disabled={resource.loading || busy} onClick={refresh}>Retry</Button></div>}
    {!resource.loading && !resource.error && !report && <p>This report isn't available.</p>}
    {report && <div className="admin-report-layout" aria-busy={resource.loading}>
      <section className="notice-card"><h2>Report</h2><p><strong>{report.item.title}</strong> · Due {formatDate(report.due_date)} (Manila)</p><ReportSummary report={report} /></section>
      <section className="notice-card"><h2>Students</h2>
        {['owner', 'borrower'].map((role) => <div className="report-student" key={role}>
          <h3>{role === 'owner' ? 'Owner' : 'Borrower'}</h3><p>{report[role].name}</p><p>{report[role].course_year_section}</p><p>{report[role].email}</p>
        </div>)}
        <p className="small muted">Handover and return records remain private to the two students.</p>
      </section>
      <section className="notice-card"><h2>Review</h2>
        {report.self_review && report.status !== 'resolved' && <p>Another admin must review this report.</p>}
        {report.can_review && <Button busy={busy} busyLabel="Starting review…" disabled={resource.loading || Boolean(resource.error) || needsRefresh} onClick={review}>Start review</Button>}
        {report.can_resolve && <Button ref={resolveButton} disabled={resource.loading || Boolean(resource.error) || busy || needsRefresh} onClick={() => setResolving(true)}>Resolve report</Button>}
        {report.status === 'resolved' && <p>This report is resolved. No further actions are available.</p>}
      </section>
    </div>}
    {resolving && report && <ReportFormModal mode="resolve" reference={report.reference} load={refresh}
      onClose={() => { setResolving(false); setRestore(true); }} onSaved={() => {
        setResolving(false); setRestore(true); notify('Report resolved.'); void refresh();
      }} />}
  </section>;
}
