const { execFileSync } = require('node:child_process');

function buildEnvironment(env) {
  if (env.VERCEL_ENV !== 'preview' || env.VERCEL_GIT_COMMIT_REF !== 'review/kanyi-marketing-only-2026-10-29') return { ...env };
  return { ...env, VITE_MARKETING_ONLY: 'true', VITE_EARLY_ACCESS_ENABLED: 'false', VITE_API_BASE_URL: '' };
}

if (require.main === module) {
  execFileSync('npm', ['run', 'build'], { env: buildEnvironment(process.env), stdio: 'inherit' });
}
module.exports = { buildEnvironment };
