const test = require('node:test');
const assert = require('node:assert/strict');
const { logSignals } = require('../src/services/logSignals');
test('exact repetition and explicit timezone timestamps are counted without inferring impact', () => {
  const result = logSignals('2020-01-01T00:00:00Z WARN old\n2020-01-01T00:00:00Z WARN old\n2030-01-01T00:00:00Z INFO future\n12:00 ERROR no date\n', Date.parse('2026-10-07T00:00:00Z'));
  assert.deepEqual(result, { lineCount: 4, duplicateLineCount: 1, timestampedLineCount: 3, olderThanSevenDaysCount: 2, futureTimestampCount: 1 });
});
test('timestamps without timezone or date are not treated as stale', () => {
  assert.deepEqual(logSignals('12:00 WARN repeated\n12:01 WARN repeated\n2020-01-01T00:00:00 WARN local time'),
    { lineCount: 3, duplicateLineCount: 0, timestampedLineCount: 0, olderThanSevenDaysCount: 0, futureTimestampCount: 0 });
});
