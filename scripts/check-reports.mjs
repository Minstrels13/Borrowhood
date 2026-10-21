import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';

// No Supabase client, credentials, environment files or HTTP. Exercise the real adapter.
let calls = [];
let result = { data: { id: 'saved', version: 2 }, error: null };
let thrown;
const supabase = new SyntheticModule(['requireSupabase'], function () {
  this.setExport('requireSupabase', () => ({ rpc: async (name, args) => {
    calls.push({ name, args });
    if (thrown) throw thrown;
    return result;
  } }));
});
const module = new SourceTextModule(await readFile('src/lib/reports.js', 'utf8'));
await module.link(() => supabase);
await module.evaluate();
const reports = module.namespace;
const id = '10000000-0000-4000-8000-000000000001';
const report = { id, version: 7 };
const functions = [
  [() => reports.fileReport(id, 'other', ' details '), 'file_report', { p_request: id, p_reason: 'other', p_details: 'details' }],
  [() => reports.respondReport(report, ' response '), 'respond_report', { p_report: id, p_response: 'response', p_expected_version: 7 }],
  [() => reports.startReportReview(report), 'start_report_review', { p_report: id, p_expected_version: 7 }],
  [() => reports.resolveReport(report, 'settled', ' note '), 'resolve_report', { p_report: id, p_outcome: 'settled', p_note: 'note', p_expected_version: 7 }],
  [() => reports.getRequestReport(id), 'report_for_request', { p_request: id }],
  [() => reports.getAdminReport(id), 'admin_report_detail', { p_report: id }],
  [() => reports.getAdminReports('open', '%_', 12), 'admin_reports', { p_status: 'open', p_search: '%_', p_offset: 12 }],
];
for (const [run, name, args] of functions) {
  assert.deepEqual(await run(), result.data);
  assert.deepEqual(calls.at(-1), { name, args });
}
calls = [];
assert.equal(await reports.getAdminReport('invalid'), null);
await assert.rejects(reports.getRequestReport('invalid'), /isn't available/);
assert.equal(calls.length, 0, 'invalid IDs never reach RPC');
for (const code of ['BH_P2_FORBIDDEN', 'BH_P2_UNAVAILABLE', 'BH_P2_DUPLICATE', 'BH_P2_NOT_OVERDUE',
  'BH_P2_VALIDATION', 'BH_P2_STALE', 'BH_P2_SELF_REVIEW', 'BH_P2_NOT_SETTLED']) {
  result = { data: null, error: { message: code } };
  await assert.rejects(reports.respondReport(report, 'test'), (error) => error.reportCode === code && !error.message.includes(code));
}
result = { data: null, error: { code: 'PGRST202', message: 'raw schema detail' } };
await assert.rejects(reports.getRequestReport(id), /aren't available yet/);
result = { data: null, error: { message: 'PRIVATE SQL DETAIL' } };
await assert.rejects(reports.getRequestReport(id), (error) => !error.message.includes('PRIVATE'));
thrown = new TypeError('Failed to fetch');
await assert.rejects(reports.getAdminReport(id), (error) => error.reportCode === 'RETRY' && !error.message.includes('TypeError'));
for (const [mode, choice, text, invalid] of [
  ['file', '', '', true], ['file', 'toString', '', true], ['file', 'other', ' \n ', true],
  ['file', 'not_returned', '', false], ['file', 'cannot_reach_borrower', '', false],
  ['file', 'other', 'x'.repeat(1500), false], ['file', 'other', 'x'.repeat(1501), true],
  ['respond', '', '', true], ['respond', '', '🙂'.repeat(1500), false], ['respond', '', '🙂'.repeat(1501), true],
  ['resolve', 'settled', ' ', true], ['resolve', '', 'test', true], ['resolve', 'upheld', 'x'.repeat(1000), false],
  ['resolve', 'dismissed', 'x'.repeat(1001), true],
]) assert.equal(Boolean(reports.reportFormError(mode, choice, text)), invalid, `${mode} validation boundary`);
assert.equal(reports.textLength(' 🙂 '), 1, 'SQL-compatible Unicode code-point length');
console.log('Reports checks passed: RPC payloads/versions, invalid IDs, safe error mapping and validation/Unicode boundaries. No HTTP or database access.');
