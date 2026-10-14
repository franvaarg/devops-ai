// Synthetic diagnostics only. Never print credentials, request headers or raw error bodies.
require('dotenv').config({ quiet: true });
const { GoogleGenAI } = require('@google/genai');
const { writeFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { context } = require('../src/operations/logger');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const results = [];
async function probe(model, structured) {
  const requestId = randomUUID(), started = Date.now();
  try {
    const response = await context.run({ requestId }, () => ai.models.generateContent({
      model, contents: 'Reply with the word healthy.',
      config: { httpOptions: { timeout: 15000 }, maxOutputTokens: 64,
        ...(structured ? { responseMimeType: 'application/json', responseJsonSchema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } } : {}) }
    }));
    results.push({ requestId, model, structured, durationMs: Date.now() - started, ok: !!response.text });
  } catch (error) {
    let detail; try { detail = JSON.parse(error.message)?.error; } catch { /* no raw errors */ }
    // Classify known provider wording, rather than recording arbitrary strings.
    const message = detail?.message || '';
    const quota = (detail?.details || []).filter(d => d['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure').flatMap(d => (d.violations || []).map(v => ({ quotaId: /^[A-Za-z0-9_-]{1,150}$/.test(v.quotaId || '') ? v.quotaId : undefined, quotaValue: /^\d+$/.test(String(v.quotaValue || '')) ? String(v.quotaValue) : undefined })));
    const reason = /high demand|overloaded/i.test(message) ? 'provider_overloaded'
      : /not found|not supported|no longer available/i.test(message) ? 'model_not_found_or_unsupported'
      : /quota|resource.*exhaust/i.test(message) ? 'quota_or_rate_limit'
      : /api key|permission/i.test(message) ? 'authentication_or_permission'
      : error.name === 'AbortError' ? 'timeout' : 'unclassified';
    results.push({ requestId, model, structured, durationMs: Date.now() - started, ok: false,
      status: error.status || null, errorType: error.name, quota, providerCode: /^[A-Z_]+$/.test(detail?.status || '') ? detail.status : null, reason });
  }
}
(async () => {
  for (const model of (process.argv.includes('--configured') ? [process.env.GEMINI_MODEL || 'gemini-3.6-flash'] : ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'])) {
    await probe(model, false); if (!process.argv.includes('--configured')) await probe(model, true);
  }
  const report = { timestamp: new Date().toISOString(), synthetic: true, promptBytes: Buffer.byteLength('Reply with the word healthy.'), sdk: '2.10.0', results };
  writeFileSync(process.env.DIAGNOSTIC_REPORT || '/tmp/kanyi-provider-diagnostic.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(() => { console.error('Diagnostics could not complete.'); process.exitCode = 1; });
