import { requireSupabase } from './supabase';

export const reportReasons = {
  not_returned: 'Item not returned',
  cannot_reach_borrower: 'Cannot reach the borrower',
  other: 'Other problem',
};
export const reportOutcomes = { settled: 'Settled', upheld: 'Upheld', dismissed: 'Dismissed' };
export const reportStatuses = { open: 'Open', reviewing: 'Reviewing', resolved: 'Resolved' };
export const textLength = (value) => Array.from(value.trim()).length;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const messages = {
  BH_P2_FORBIDDEN: 'This action is not available for your account.',
  BH_P2_UNAVAILABLE: "This report or request isn't available.",
  BH_P2_DUPLICATE: 'A report has already been filed. Refresh to see it.',
  BH_P2_NOT_OVERDUE: 'Reports are available only after the item is overdue. Refresh the request.',
  BH_P2_VALIDATION: 'Check the required fields and character limits.',
  BH_P2_STALE: 'This report has changed. Refresh before continuing.',
  BH_P2_SELF_REVIEW: 'Another admin must review this report.',
  BH_P2_NOT_SETTLED: 'The return must be confirmed before choosing Settled.',
};
export function reportError(error) {
  const code = Object.keys(messages).find((key) => error?.message === key);
  const unavailable = ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error?.code);
  return Object.assign(new Error(messages[code] || (unavailable
    ? "Reports aren't available yet. Please retry later."
    : "We couldn't complete that report action. Check your connection and retry.")),
  { reportCode: code || (unavailable ? 'UNAVAILABLE' : 'RETRY') });
}
async function rpc(name, args) {
  try {
    const { data, error } = await requireSupabase().rpc(name, args);
    if (error) throw error;
    return data;
  } catch (error) { throw reportError(error); }
}
export function getRequestReport(id) {
  if (!uuid.test(id || '')) return Promise.reject(reportError({ message: 'BH_P2_UNAVAILABLE' }));
  return rpc('report_for_request', { p_request: id });
}
export function getAdminReport(id) {
  if (!uuid.test(id || '')) return Promise.resolve(null);
  return rpc('admin_report_detail', { p_report: id });
}
export const getAdminReports = (status, search = '', offset = 0) =>
  rpc('admin_reports', { p_status: status, p_search: search, p_offset: offset });
export const fileReport = (requestId, reason, details) =>
  rpc('file_report', { p_request: requestId, p_reason: reason, p_details: details.trim() });
export const respondReport = (report, response) => rpc('respond_report', {
  p_report: report.id, p_response: response.trim(), p_expected_version: report.version,
});
export const startReportReview = (report) => rpc('start_report_review', {
  p_report: report.id, p_expected_version: report.version,
});
export const resolveReport = (report, outcome, note) => rpc('resolve_report', {
  p_report: report.id, p_outcome: outcome, p_note: note.trim(), p_expected_version: report.version,
});

export function reportFormError(mode, choice, text) {
  const length = textLength(text);
  if (mode === 'file' && !Object.hasOwn(reportReasons, choice)) return 'Choose a reason.';
  if (mode === 'resolve' && !Object.hasOwn(reportOutcomes, choice)) return 'Choose an outcome.';
  if (length > (mode === 'resolve' ? 1000 : 1500))
    return `Keep this under ${mode === 'resolve' ? 1000 : 1500} characters.`;
  if (!length && (mode !== 'file' || choice === 'other')) return 'Enter the required details.';
  return '';
}
