const test = require('node:test');
const assert = require('node:assert/strict');
const { subscriptionState, configured } = require('../src/services/billingService');
process.env.STRIPE_PRICE_ID = 'price_pro';
const subscription = { status: 'active', items: { data: [{ price: { id: 'price_pro' }, quantity: 1, current_period_end: Math.floor(Date.now()/1000)+3600 }] } };
test('only an eligible live subscription grants Pro', () => {
  assert.equal(subscriptionState(subscription).plan, 'pro');
  for (const status of ['past_due','unpaid','incomplete','incomplete_expired','canceled','paused']) assert.equal(subscriptionState({ ...subscription, status }).plan, 'free');
  assert.equal(subscriptionState({ ...subscription, pause_collection: {} }).plan, 'free');
  assert.equal(subscriptionState({ ...subscription, items: { data: [{price: {id: 'price_other'}, quantity: 1, current_period_end: 9999999999}] } }).plan, 'free');
  assert.equal(subscriptionState({ ...subscription, items: { data: [{price: {id: 'price_pro'}, quantity: 1, current_period_end: 1}] } }).plan, 'free');
  assert.equal(subscriptionState({ ...subscription, cancel_at_period_end: true }).plan, 'pro');
});
test('sales stay disabled without explicit configuration', () => { delete process.env.BILLING_ENABLED; assert.equal(configured(), false); });
