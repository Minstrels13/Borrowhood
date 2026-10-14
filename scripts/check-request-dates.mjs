import assert from 'node:assert/strict';
import {
  manilaToday,
  dateValue,
  inclusiveDays,
  rangeError,
  requestStatus,
  daysLate,
  returnedLate,
} from '../src/lib/dates.js';
import { canRequestAgain, requestState } from '../src/lib/requestStates.js';

assert.equal(manilaToday(new Date('2026-10-20T15:59:59Z')), '2026-10-20');
assert.equal(manilaToday(new Date('2026-10-20T16:00:00Z')), '2026-10-21');
assert.equal(inclusiveDays('2026-10-20', '2026-10-20'), 1);
assert.equal(inclusiveDays('2026-10-20', '2026-10-22'), 3);
assert.equal(inclusiveDays('2028-02-28', '2028-03-01'), 3);
assert.ok(Number.isNaN(dateValue('2026-02-30')));
const today = '2026-10-20';
const blocked = [{ start_date: '2026-10-23', end_date: '2026-10-25' }];
assert.equal(rangeError(today, '2026-10-22', 3, blocked, today), '');
for (const [start, end, max] of [
  ['2026-10-19', today, 3],
  [today, '2026-10-19', 3],
  [today, '2026-10-23', 3],
  ['2026-10-25', '2026-10-26', 3],
  ['', today, 3],
])
  assert.notEqual(rangeError(start, end, max, blocked, today), '');

const request = {
  status: 'handed_over',
  start_date: today,
  end_date: today,
  owner: { full_name: 'Owner' },
  borrower: { full_name: 'Borrower' },
  item: { meetup_note: 'Public meetup' },
  decline_reason: 'Unavailable',
  cancelled_at: '2026-10-20T08:00:00Z',
};
assert.equal(requestStatus(request, today), 'handed_over');
assert.equal(requestStatus(request, '2026-10-21'), 'overdue');
assert.equal(daysLate(request, '2026-10-23'), 3);
assert.equal(returnedLate({ ...request, returned_at: '2026-10-20T15:59:59Z' }), false);
assert.equal(returnedLate({ ...request, returned_at: '2026-10-20T16:00:00Z' }), true);

const expected = {
  requested: [['approve', 'decline'], ['cancel']],
  approved: [['handover'], ['cancel']],
  handed_over: [['return'], []],
  returned: [[], []],
  declined: [[], ['browse']],
  cancelled: [[], []],
};
for (const [status, [ownerActions, borrowerActions]] of Object.entries(expected)) {
  const loan = { ...request, status, returned_at: '2026-10-20T08:00:00Z' };
  assert.deepEqual(requestState(loan, true, today).actions, ownerActions);
  assert.deepEqual(requestState(loan, false, today).actions, borrowerActions);
}
assert.deepEqual(requestState(request, true, '2026-10-21').actions, ['return']);
assert.deepEqual(requestState(request, false, '2026-10-21').actions, []);
assert.match(requestState({ ...request, status: 'declined' }, false, today).text, /Unavailable/);
assert.equal(requestStatus({ ...request, status: 'approved' }, '2026-10-21'), 'approved');
assert.equal(canRequestAgain(null), true);
for (const status of ['requested', 'approved', 'handed_over', 'overdue', 'returned', 'cancelled']) {
  assert.equal(canRequestAgain({ status }), false);
}
assert.equal(canRequestAgain({ status: 'declined' }), true);
console.log(
  'Request date/state checks passed: inclusive days, leap dates, Manila midnight, overlaps, late returns and both-role action matrix.',
);
