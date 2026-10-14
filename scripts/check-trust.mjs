import assert from 'node:assert/strict';
import { trustScore } from '../src/lib/trustScore.js';
assert.deepEqual(trustScore({}), { score: 100, level: 'new' });
assert.deepEqual(trustScore({ completed: 1 }), { score: 100, level: 'reliable' });
assert.deepEqual(trustScore({ completed: 5 }), { score: 100, level: 'trusted' });
assert.deepEqual(trustScore({ completed: 15, late: 1 }), { score: 92, level: 'trusted' });
assert.deepEqual(trustScore({ completed: 5, damaged: 2 }), { score: 70, level: 'reliable' });
assert.deepEqual(trustScore({ completed: 5, late: 4 }), { score: 68, level: 'needs_attention' });
assert.deepEqual(trustScore({ completed: 30, late: 30, damaged: 30 }), {
  score: 0,
  level: 'needs_attention',
});
console.log(
  'Trust boundaries passed: New, completion threshold, late/damage penalties, 70-point boundary and zero floor.',
);
