import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import usePagedResource from '../../hooks/usePagedResource';
import { getAdminReports, reportReasons, reportStatuses } from '../../lib/reports';
import { dateValue, formatDate, formatTimestamp } from '../../lib/dates';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Tabs from '../ui/Tabs';
import Skeleton from '../ui/Skeleton';
import { ReportStatus } from './ReportSummary';

export default function ReportsQueue() {
  const { user } = useAuth();
  return <AccountReportsQueue key={user.id} userId={user.id} />;
}
function AccountReportsQueue({ userId }) {
  const location = useLocation();
  const restored = location.state?.reportsReturn?.userId === userId ? location.state.reportsReturn : null;
  const [status, setStatus] = useState(() => Object.hasOwn(reportStatuses, restored?.status) ? restored.status : 'open');
  const [search, setSearch] = useState(restored?.search || '');
  const [query, setQuery] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  return <div className="reports-queue">
    <h2>Reports</h2>
    <p className="report-privacy">Admins see the report, both students' name, course and email, the item and the due date. Condition notes and photos stay private to the two students.</p>
    <ReportList status={status} query={query} search={search} onSearch={setSearch} userId={userId} onStatus={setStatus} returnFocus={restored?.focusIds} />
  </div>;
}
function ReportList({ status, query, search, onSearch, userId, onStatus, returnFocus }) {
  const scope = `${status}:${query}`;
  const fetchPage = useCallback(async (offset) => ({ ...await getAdminReports(status, query, offset), scope }), [status, query, scope]);
  const list = usePagedResource(fetchPage);
  const currentScope = list.scope === scope;
  const rows = currentScope ? [...new Map(list.entries.map((row) => [row.id, row])).values()] : [];
  const buttons = useRef(new Map());
  const refreshButton = useRef(null);
  const focusPending = useRef(Boolean(returnFocus));
  useEffect(() => {
    if (!focusPending.current || list.loading) return;
    const frame = requestAnimationFrame(() => {
      const target = returnFocus?.map((id) => buttons.current.get(id)).find(Boolean) || refreshButton.current;
      target?.focus();
      focusPending.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [list.loading, returnFocus]);
  const known = !list.loading && !list.error && currentScope;
  const emptyCopy = {
    open: ['No open reports yet', 'Reports appear here when an owner reports an overdue item.'],
    reviewing: ['No reports in review', 'Reports appear here when an admin starts a review.'],
    resolved: ['No resolved reports yet', 'Reports appear here when an admin resolves a report.'],
  };
  return <>
    <div className="report-search-row">
      <Field label="Search reports" type="search" placeholder="Search request or item" maxLength={100} value={search} onChange={(event) => onSearch(event.target.value)} />
      <Button ref={refreshButton} variant="secondary" disabled={list.loading} onClick={list.refresh}>Refresh reports</Button>
    </div>
    <Tabs label="Report status" value={status} onChange={onStatus} tabs={Object.entries(reportStatuses).map(([value, label]) => ({
      value, label: known && Number.isFinite(list.status_totals?.[value]) ? `${label} (${list.status_totals[value]})` : label,
    }))}>
      <div aria-busy={list.loading}>
        {known && rows.length > 0 && Number.isFinite(list.total) && <p role="status" className="report-count">{list.total} {reportStatuses[status].toLowerCase()} {list.total === 1 ? 'report' : 'reports'}</p>}
        {rows.length > 0 && <div className="report-table">
          <div className="report-table__head" aria-hidden="true"><span>Request / item</span><span>Owner and borrower</span><span>Reason</span><span>Due date</span><span title="Filed time in Asia/Manila">Filed</span><span>Status</span><span className="report-table__action-heading">Action</span></div>
          {rows.map((row, index) => {
            const action = row.status === 'resolved' ? 'View' : row.status === 'reviewing' ? 'Continue' : 'Review';
            const validDue = Number.isFinite(dateValue(row.due_date));
            const validFiled = Boolean(row.created_at) && Number.isFinite(Date.parse(row.created_at));
            return <article key={row.id} className="report-table__row">
            <div className="report-table__main"><h3>{row.reference || 'Not available'}</h3><p>{row.item_title || 'Not available'}</p></div>
            <div className="report-table__people"><span className="report-table__label">Owner: </span>{row.owner_name || 'Not available'}<br /><span className="report-table__label">Borrower: </span>{row.borrower_name || 'Not available'}</div>
            <p className="report-table__reason">{reportReasons[row.reason] || 'Not available'}</p>
            <p className="report-table__due"><span className="report-table__mobile-label">Due date: </span><time dateTime={validDue ? row.due_date : undefined}>{validDue ? formatDate(row.due_date) : 'Not available'}</time></p>
            <p className="report-table__filed"><span className="report-table__mobile-label">Filed (Manila): </span><time dateTime={validFiled ? row.created_at : undefined} title={validFiled ? `${formatTimestamp(row.created_at)} (Manila)` : undefined}>{validFiled ? formatTimestamp(row.created_at) : 'Not available'}</time></p>
            <div className={`report-table__status report-table__status--${row.status}`}><ReportStatus status={row.status} /></div>
            <div className="report-table__action">
              <Button ref={(node) => { if (node) buttons.current.set(row.id, node); else buttons.current.delete(row.id); }}
                variant={row.status === 'open' ? 'secondary' : 'ghost'} to={`/admin/verification/reports/${row.id}`} disabled={list.loading}
                state={{ reportsReturn: { userId, status, search: query, focusIds: [row.id, rows[index + 1]?.id, rows[index - 1]?.id].filter(Boolean) } }}
                aria-label={`${action} report ${row.reference || 'request not available'}`}>{action}</Button></div>
          </article>; })}
        </div>}
        {list.loading && <><p role="status">Loading reports…</p><Skeleton variant="text" lines={4} /></>}
        {list.error && <div role="alert"><p>{list.error}</p><Button variant="secondary" onClick={list.refresh}>Retry</Button></div>}
        {known && !rows.length && <div className="report-table__empty" role="status">
          <h3>{query ? 'No reports match your search' : emptyCopy[status][0]}</h3>
          <p className="muted">{query ? 'Try another request reference or item name, or clear your search.' : emptyCopy[status][1]}</p>
        </div>}
        {currentScope && list.entries.length < list.total && <Button variant="secondary" disabled={list.loading} onClick={list.loadMore}>Load more reports</Button>}
      </div>
    </Tabs>
  </>;
}
