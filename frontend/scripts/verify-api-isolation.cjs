// Exercise every public API entry point, including accidental calls outside the UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/services/api.ts'), 'utf8');
function load(marketingOnly) {
  const calls = [];
  const exports = {};
  const code = ts.transpileModule(source.replace("import { marketingOnly } from '../config/publicMode';", `const marketingOnly = ${marketingOnly};`).replace('import.meta.env.VITE_API_BASE_URL', "''"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, URLSearchParams, AbortSignal, DOMException, crypto, localStorage: { getItem: () => 'yes' }, fetch: async (...args) => { calls.push(args); return { ok: true, json: async () => ({}) }; }, window: { location: { assign: url => calls.push(url) } } });
  return { api: exports, calls };
}
(async () => {
  const { buildEnvironment } = require('./build-vercel.cjs');
  const original = { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'review/kanyi-marketing-only-2026-10-29', VITE_MARKETING_ONLY: 'false', VITE_EARLY_ACCESS_ENABLED: 'true', VITE_API_BASE_URL: 'https://example.test' };
  assert.deepEqual(buildEnvironment(original), original);
  assert.deepEqual(buildEnvironment({ ...original, VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'other-branch' }), { ...original, VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'other-branch' });
  const preview = buildEnvironment({ ...original, VERCEL_ENV: 'preview' });
  assert.equal(preview.VITE_MARKETING_ONLY, 'true');
  assert.equal(preview.VITE_EARLY_ACCESS_ENABLED, 'false');
  assert.equal(preview.VITE_API_BASE_URL, '');
  const { api, calls } = load(true);
  const methods = { register: ['Synthetic', 'test@example.test', 'test'], login: ['test@example.test', 'test'], requestPasswordReset: ['test@example.test'], resetPassword: ['test', 'test'], getCurrentUser: [], logout: [], analyzeLog: ['synthetic'], getHistory: [], deleteAnalysis: [1], getPlans: [], getAccount: [], openBilling: ['checkout'], deleteAccount: ['test'], requestEarlyAccess: [{}] };
  for (const [name, args] of Object.entries(methods)) await assert.rejects(api[name](...args), error => error.code === 'MARKETING_ONLY', name);
  await assert.rejects(api.openBilling('portal'), error => error.code === 'MARKETING_ONLY');
  api.trackEvent('landing');
  assert.deepEqual(calls, []);
  const product = load(false);
  await product.api.login('test@example.test', 'test');
  assert.equal(product.calls[0][0], '/api/auth/login');
  console.log('PASS: all marketing API entry points blocked before fetch; product login still requests API');
})().catch(error => { console.error(error); process.exitCode = 1; });
