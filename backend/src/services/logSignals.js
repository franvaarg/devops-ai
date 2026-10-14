function logSignals(source, now = Date.now()) {
  const lines = source.split(/\r?\n/).filter(line => line.trim());
  const duplicates = lines.length - new Set(lines).size;
  const dates = lines.map(line => /^\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))\b/.exec(line)?.[1])
    .filter(Boolean).map(Date.parse).filter(Number.isFinite);
  return { lineCount: lines.length, duplicateLineCount: duplicates,
    timestampedLineCount: dates.length,
    olderThanSevenDaysCount: dates.filter(date => now - date > 7 * 86400000).length,
    futureTimestampCount: dates.filter(date => date - now > 300000).length };
}
module.exports = { logSignals };
