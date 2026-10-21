// Existing runtime only: no credentials, environment files, HTTP or database access.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
let result = { data: { entries: [], has_earlier: false }, error: null };
let calls = [];
const stub = new SyntheticModule(['requireSupabase'], function () {
  this.setExport('requireSupabase', () => ({ rpc: async (name, args) => {
    calls.push({ name, args }); return result;
  } }));
});
const module = new SourceTextModule(await readFile('src/lib/messages.js', 'utf8'));
await module.link(() => stub); await module.evaluate();
const api = module.namespace;
const cursor = { kind: 'message', at: '2026-10-22T01:00:00.000001Z', id: 'cursor' };
await api.getRequestThread('request', cursor, 'nonce');
assert.deepEqual(calls.pop(), { name: 'request_thread', args: { p_request: 'request', p_before_kind: 'message',
  p_before_at: cursor.at, p_before_id: 'cursor', p_client_id: 'nonce' } });
await api.getRequestThread('request');
assert.equal(calls.at(-1).args.p_before_kind, null);
await api.sendRequestMessage('request', '  😀\nhello  ', 'same-nonce');
await api.sendRequestMessage('request', '😀\nhello', 'same-nonce');
assert.deepEqual(calls.at(-1), calls.at(-2));
assert.equal(calls.at(-1).args.p_body, '😀\nhello');
assert.equal(api.messageLength('  ' + '😀'.repeat(1000) + '\uFEFF'), 1000);
assert.equal(api.messageLength('😀'.repeat(1001)), 1001);
assert.equal(api.messageLength('\u00a0\t\n'), 0);
for (const code of ['BH_THREAD_FORBIDDEN', 'BH_THREAD_UNAVAILABLE', 'BH_THREAD_VALIDATION',
  'BH_THREAD_READ_ONLY', 'BH_THREAD_LIMIT', 'BH_THREAD_STALE']) {
  result = { data: null, error: { message: code } };
  await assert.rejects(api.getRequestThread('request'), (error) => error.threadCode === code && !error.message.includes('BH_THREAD'));
}
result = { data: null, error: { message: 'PRIVATE SQL FAILURE' } };
await assert.rejects(api.sendRequestMessage('request', 'hello', 'key'), (error) => !error.message.includes('PRIVATE'));
result = { data: null, error: { code: 'PGRST202' } };
await assert.rejects(api.getRequestThread('request'), /not available yet/);
console.log('Request thread adapter checks passed: cursor precision, unchanged retry identity, Unicode limits and safe failures.');
