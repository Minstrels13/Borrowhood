import { useId, useState } from 'react';
import Chip from '../ui/Chip';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { reportReasons, reportOutcomes, reportStatuses } from '../../lib/reports';
import { formatTimestamp } from '../../lib/dates';

export function ReportStatus({ status }) {
  return <Chip label={reportStatuses[status] || 'Status unavailable'} tone={status === 'open' ? 'clay' : status === 'reviewing' ? 'info' : 'neutral'} />;
}

export default function ReportSummary({ report, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const toggleId = `${detailsId}-toggle`;
  if (compact) {
    const facts = <dl className="report-facts detail-facts">
      {report.status === 'resolved' && <div><dt>Filed</dt><dd className="small muted">{formatTimestamp(report.created_at)} (Manila)</dd></div>}
      {report.status !== 'resolved' && <div><dt>Reason</dt><dd>{reportReasons[report.reason]}</dd></div>}
      <div><dt>Details from owner</dt><dd className="preserve-lines">{report.details || 'No additional details.'}</dd></div>
      <div><dt>Borrower response</dt><dd><span className="preserve-lines">{report.borrower_response || 'No response yet.'}</span>
        {report.responded_at && <p className="condition-record__date">{formatTimestamp(report.responded_at)} (Manila)</p>}</dd></div>
      {report.reviewing_at && <div><dt>Review started</dt><dd className={report.status === 'resolved' ? 'small muted' : undefined}>{formatTimestamp(report.reviewing_at)} (Manila)</dd></div>}
      {report.status === 'resolved' && <div><dt>Admin resolution note</dt><dd className="preserve-lines">{report.resolution_note}</dd></div>}
    </dl>;
    return <div className="report-summary--compact">{report.status === 'resolved'
      ? <>
        <dl className="condition-records report-resolution-row">
          <div><dt>Reason</dt><dd>{reportReasons[report.reason]}</dd></div>
          <div><dt>Outcome</dt><dd>{reportOutcomes[report.outcome]}</dd></div>
          <div><dt>Resolved</dt><dd className="small muted">{formatTimestamp(report.resolved_at)} (Manila)</dd></div>
        </dl>
          <Button className="report-resolution-toggle" variant="ghost" id={toggleId} aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Hide details' : 'View details'}<Icon name="chevron-down" />
          </Button>
        <div id={detailsId} role="region" aria-labelledby={toggleId} hidden={!expanded}>{facts}</div>
      </>
      : facts}</div>;
  }
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
