const REDACTED = '[REDACTED]';

// Best effort: deliberately favors removing credential values over retaining them.
// This is not a guarantee that arbitrary secrets or personal data are detected.
function redactSecrets(input) {
  return input
    .replace(/-----BEGIN (?:[A-Z ]*PRIVATE KEY)-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, REDACTED)
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+(?::[^\s/@]*)?@/gi, `$1${REDACTED}@`)
    .replace(/\b(?:Bearer|Basic)\s+[a-z0-9+/_.=~-]+/gi, REDACTED)
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, REDACTED)
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, REDACTED)
    .replace(/\b(?:gh[pousr]_[a-zA-Z0-9_]{20,}|github_pat_[a-zA-Z0-9_]+|AIza[a-zA-Z0-9_-]{30,}|sk-[a-zA-Z0-9_-]{20,})\b/g, REDACTED)
    .replace(/((?:set-cookie|cookie|authorization)\s*:\s*)[^\r\n]+/gi, `$1${REDACTED}`)
    .replace(/(["']?\b(?:password|passwd|pwd|[\w-]*secret[\w-]*|[\w-]*token|[\w-]*api[_-]?key|session[_-]?id|cookie|authorization)["']?\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;&}\]]+)/gi, `$1"${REDACTED}"`);
}

module.exports = { redactSecrets };
