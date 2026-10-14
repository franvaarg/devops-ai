function validateStartup(env = process.env) {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  if (env.TRUST_PROXY_HOPS && (!/^\d+$/.test(env.TRUST_PROXY_HOPS) || Number(env.TRUST_PROXY_HOPS) > 10)) throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 10.');
  if (env.NODE_ENV !== 'production') return;
  const httpsOrigin = value => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash; }
    catch { return false; }
  };
  if (!httpsOrigin(env.FRONTEND_URL) || !env.CORS_ORIGINS || !env.CORS_ORIGINS.split(',').every(origin => httpsOrigin(origin.trim()))) throw new Error('Production requires explicit HTTPS frontend and CORS origins.');
  if (!env.GEMINI_API_KEY) throw new Error('Production requires GEMINI_API_KEY.');
  if (!env.BREVO_API_KEY || !env.EMAIL_FROM || /example\.(?:com|test)/i.test(env.EMAIL_FROM)) throw new Error('Production requires password-recovery delivery and a real sender.');
  if (env.BILLING_ENABLED === 'true' && (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID || !env.STRIPE_WEBHOOK_SECRET)) throw new Error('Enabled billing requires Stripe key, price and signing secret.');
}
module.exports = { validateStartup };
