import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import useRequestReport from '../../hooks/useRequestReport';
import useManilaToday from '../../hooks/useManilaToday';
import Button from '../ui/Button';
import Modal from '../modals/Modal';
import ReportFormModal from '../modals/ReportFormModal';
import ReportSummary, { ReportStatus } from './ReportSummary';
import { formatTimestamp } from '../../lib/dates';
import { useToast } from '../ui/Toast';

export default function RequestReportPanel({ request, disabled = false }) {
  const { user } = useAuth();
  // Remount the private subtree on account changes, including any draft/dialog state.
  return <ReportPanel key={`${user.id}:${request.id}`} request={request} userId={user.id} disabled={disabled} />;
}
function ReportPanel({ request, userId, disabled }) {
  const today = useManilaToday();
  const resource = useRequestReport(request.id, `${request.status}:${request.updated_at}:${today}`);
  const [mode, setMode] = useState(null);
  const heading = useRef(null);
  const trigger = useRef(null);
  const refreshButton = useRef(null);
  const [restore, setRestore] = useState(false);
  const notify = useToast();
  const { refresh } = resource;
  useEffect(() => {
    if (!restore || resource.loading || mode) return;
    const frame = requestAnimationFrame(() => {
      (trigger.current || heading.current || refreshButton.current)?.focus();
      setRestore(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [restore, resource.loading, mode]);
  function close() { setMode(null); setRestore(true); }
  function saved(action) {
    notify(action === 'file' ? 'Report sent.' : 'Response sent.');
    setMode(action === 'file' ? 'sent' : null);
    setRestore(action !== 'file');
    void refresh();
  }
  const report = resource.data?.report;
  const owner = request.owner_id === userId;
  const eligible = owner && request.status === 'handed_over' && request.end_date < today && resource.data?.can_file;
  return <section className={`report-panel report-panel--compact notice-card${report?.status === 'resolved' ? ' report-panel--resolved' : ''}`} aria-busy={resource.loading}>
    <div className="report-panel__heading condition-record__heading"><h2 ref={heading} tabIndex={-1}>{report ? 'Report filed' : 'Reports'}</h2>
      {report && <><ReportStatus status={report.status} />{report.status !== 'resolved' && <span className="small muted">Filed {formatTimestamp(report.created_at)} (Manila)</span>}</>}
      <Button ref={refreshButton} variant="ghost" disabled={resource.loading || Boolean(mode)} onClick={refresh}>Refresh report</Button></div>
    {resource.loading && <p role="status">Loading report…</p>}
    {resource.error && <div role="alert"><p>{resource.error}</p><Button variant="secondary" onClick={refresh}>Retry</Button></div>}
    {report && <ReportSummary key={report.id} report={report} compact />}
    {!resource.loading && !resource.error && !report && <p className="muted">No report has been filed for this request.</p>}
    {!resource.loading && !resource.error && !disabled && <>
      {!report && eligible && <Button ref={trigger} variant="secondary" onClick={() => setMode('file')}>Report a problem</Button>}
      {report?.status === 'open' && !report.borrower_response && request.borrower_id === userId &&
        <Button ref={trigger} onClick={() => setMode('respond')}>Add your response</Button>}
    </>}
    {mode && mode !== 'sent' && <ReportFormModal mode={mode} requestId={request.id} reference={request.reference} load={refresh} onClose={close} onSaved={saved} />}
    {mode === 'sent' && <Modal open title="Report sent" size="compact" onClose={close} footer={<>
      <Button onClick={close}>View request</Button><Button variant="ghost" autoFocus onClick={close}>Done</Button>
    </>}><p>An admin will review request {request.reference}.</p><p>Status shows on the request page. No email is sent.</p></Modal>}
  </section>;
}
