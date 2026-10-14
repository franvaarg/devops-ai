const Stripe = require('stripe');
const pool = require('../database/db');
const { AppError } = require('../operations/errors');
let instance;
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new AppError('BILLING_UNAVAILABLE');
  instance ||= new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 1 });
  return instance;
}
function configured() {
  return process.env.BILLING_ENABLED === 'true' && !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ID && !!process.env.STRIPE_WEBHOOK_SECRET && !!process.env.FRONTEND_URL;
}
function origin() {
  const url = new URL(process.env.FRONTEND_URL);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new AppError('BILLING_UNAVAILABLE');
  return url.origin;
}
async function price() {
  const p = await stripe().prices.retrieve(process.env.STRIPE_PRICE_ID);
  if (p.currency !== 'usd' || !p.active || p.type !== 'recurring' || p.recurring.interval !== 'month' || p.recurring.interval_count !== 1 || p.recurring.usage_type !== 'licensed' || p.billing_scheme !== 'per_unit' || !p.unit_amount) throw new AppError('BILLING_UNAVAILABLE');
  return { amount: p.unit_amount, currency: p.currency, interval: 'month' };
}
async function locked(userId, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '15s'");
    const result = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!result.rows[0]) throw new AppError('AUTHENTICATION_REQUIRED');
    const value = await operation(client, result.rows[0]);
    await client.query('COMMIT'); return value;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function checkout(userId) {
  if (!configured()) throw new AppError('BILLING_UNAVAILABLE');
  await price();
  return locked(userId, async (client, user) => {
    const api = stripe();
    if (!user.provider_customer_id) {
      const customer = await api.customers.create({ email: user.email, metadata: { kanyiUserId: String(user.id) } }, { idempotencyKey: `kanyi-customer-${user.id}` });
      user.provider_customer_id = customer.id;
      await client.query('UPDATE users SET provider_customer_id = $2 WHERE id = $1', [user.id, customer.id]);
    }
    const subs = await api.subscriptions.list({ customer: user.provider_customer_id, status: 'all', limit: 100 });
    if (subs.has_more || subs.data.some((s) => !['canceled', 'incomplete_expired'].includes(s.status))) throw new AppError('SUBSCRIPTION_EXISTS');
    if (user.billing_checkout_id && new Date(user.billing_checkout_expires) > new Date()) {
      const previous = await api.checkout.sessions.retrieve(user.billing_checkout_id);
      if (previous.status === 'open') return { url: previous.url };
      if (previous.status === 'complete') throw new AppError('SUBSCRIPTION_EXISTS');
    }
    // Recover a still-open session even after a provider success/database rollback.
    const open = await api.checkout.sessions.list({ customer: user.provider_customer_id, status: 'open', limit: 100 });
    if (open.has_more) throw new AppError('BILLING_ERROR');
    const pending = open.data.find(session => session.mode === 'subscription' && session.client_reference_id === String(user.id));
    if (pending) {
      await client.query('UPDATE users SET billing_checkout_id=$2, billing_checkout_expires=to_timestamp($3) WHERE id=$1', [user.id, pending.id, pending.expires_at]);
      return { url: pending.url };
    }
    // Persisted session + provider key prevent duplicate checkout on retries.
    const session = await api.checkout.sessions.create({
      mode: 'subscription', customer: user.provider_customer_id,
      client_reference_id: String(user.id),
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin()}/?billing=success`, cancel_url: `${origin()}/?billing=canceled`,
      subscription_data: { metadata: { kanyiUserId: String(user.id) } },
    }, { idempotencyKey: `kanyi-checkout-${user.id}-${process.env.STRIPE_PRICE_ID}-${Math.floor(Date.now() / 3600000)}` });
    await client.query('UPDATE users SET billing_checkout_id = $2, billing_checkout_expires = to_timestamp($3) WHERE id = $1', [user.id, session.id, session.expires_at]);
    return { url: session.url };
  });
}
async function portal(userId) {
  // Existing customers retain cancellation access even when new sales are disabled.
  return locked(userId, async (_client, user) => {
    if (!user.provider_customer_id) throw new AppError('BILLING_UNAVAILABLE');
    const session = await stripe().billingPortal.sessions.create({ customer: user.provider_customer_id, return_url: origin() + '/' });
    return { url: session.url };
  });
}
function subscriptionState(s) {
  const item = s.items?.data?.[0];
  const end = item?.current_period_end || s.current_period_end;
  const eligible = s.items?.data?.length === 1 && item.price.id === process.env.STRIPE_PRICE_ID && item.quantity === 1 && !s.pause_collection && ['active', 'trialing'].includes(s.status) && end * 1000 > Date.now();
  return { plan: eligible ? 'pro' : 'free', status: s.status, end: end || null, cancel: !!s.cancel_at_period_end };
}
async function processEvent(event) {
  const obj = event.data.object;
  const subscriptionId = event.type.startsWith('customer.subscription.') ? obj.id :
    event.type.startsWith('checkout.session.') ? obj.subscription :
    event.type.startsWith('invoice.') ? obj.subscription || obj.parent?.subscription_details?.subscription : null;
  if (!subscriptionId) return;
  const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
  const result = await pool.query('SELECT id FROM users WHERE provider_customer_id = $1', [customerId]);
  // Do not acknowledge an unmapped event: customer transaction may still be committing.
  if (!result.rows[0]) throw new AppError('BILLING_ERROR');
  await locked(result.rows[0].id, async (client, user) => {
    const seen = await client.query('SELECT id FROM billing_events WHERE id = $1', [event.id]);
    if (seen.rows.length) return;
    // Fetch current state under the account lock, rather than applying stale event payloads.
    const s = await stripe().subscriptions.retrieve(subscriptionId);
    if (s.customer !== user.provider_customer_id) throw new AppError('BILLING_ERROR');
    if (user.provider_subscription_id && user.provider_subscription_id !== s.id) {
      const current = await stripe().subscriptions.retrieve(user.provider_subscription_id);
      if (!['canceled', 'incomplete_expired'].includes(current.status)) {
        await client.query('INSERT INTO billing_events(id) VALUES ($1)', [event.id]); return;
      }
    }
    const state = subscriptionState(s);
    await client.query(`UPDATE users SET plan=$2, subscription_status=$3, provider_subscription_id=$4,
      current_period_end=to_timestamp($5), cancel_at_period_end=$6 WHERE id=$1`, [user.id, state.plan, state.status, s.id, state.end, state.cancel]);
    if (state.plan === 'pro' && user.plan !== 'pro') await client.query("INSERT INTO product_events(event) VALUES ('subscription_activated')");
    await client.query('INSERT INTO billing_events(id) VALUES ($1)', [event.id]);
  });
}
module.exports = { stripe, configured, price, checkout, portal, processEvent, subscriptionState };
