import Chip from '../ui/Chip';
import { reportReasons, reportOutcomes, reportStatuses } from '../../lib/reports';
import { formatTimestamp } from '../../lib/dates';

export function ReportStatus({ status }) {
  return <Chip label={reportStatuses[status] || 'Status unavailable'} tone={status === 'open' ? 'clay' : status === 'reviewing' ? 'info' : 'neutral'} />;
}

export default function ReportSummary({ report }) {
  return <div className="report-summary">
    <div className="actions"><ReportStatus status={report.status} /><span className="small">Filed {formatTimestamp(report.created_at)} (Manila)</span></div>
    <dl className="report-facts">
      <div><dt>Reason</dt><dd>{reportReasons[report.reason]}</dd></div>
      <div><dt>Details from owner</dt><dd className="preserve-lines">{report.details || 'No additional details.'}</dd></div>
      <div><dt>Borrower response</dt><dd className="preserve-lines">{report.borrower_response || 'No response yet.'}</dd>
        {report.responded_at && <dd className="small muted">{formatTimestamp(report.responded_at)} (Manila)</dd>}</div>
      {report.reviewing_at && <div><dt>Review started</dt><dd>{formatTimestamp(report.reviewing_at)} (Manila)</dd></div>}
      {report.status === 'resolved' && <div><dt>Outcome: {reportOutcomes[report.outcome]}</dt>
        <dd className="preserve-lines">{report.resolution_note}</dd><dd className="small muted">{formatTimestamp(report.resolved_at)} (Manila)</dd></div>}
    </dl>
  </div>;
}
