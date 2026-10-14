import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAccount, getPlans, openBilling, trackEvent, type Account, type Plans } from '../services/api';
export default function AccountPlan({ refresh }: { refresh: number }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [plans, setPlans] = useState<Plans | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const [a, p] = await Promise.all([getAccount(), getPlans().catch(() => null)]); setAccount(a); setPlans(p); setError(''); }
    catch { setError('Plan details could not be loaded. Retry before starting checkout.'); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load, refresh]);
  // Checkout redirects cannot activate a plan. Wait for the verified webhook.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('billing') !== 'success') return;
    const timer = window.setInterval(() => { void load(); }, 5000);
    const stop = window.setTimeout(() => window.clearInterval(timer), 60000);
    return () => { window.clearInterval(timer); window.clearTimeout(stop); };
  }, [load]);
  async function billing(action: 'checkout' | 'portal') {
    setBusy(true);
    try { if (action === 'checkout') trackEvent('checkout_started'); await openBilling(action); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Billing is unavailable. Retry shortly.'); }
    finally { setBusy(false); }
  }
  if (error) return <section className="my-5 rounded-2xl border p-5" role="status">{error} <button onClick={() => void load()} className="underline">Retry</button></section>;
  if (!account) return <p className="my-5" role="status">Loading plan and usage…</p>;
  const { usage, account: details } = account;
  const paid = usage.plan === 'pro';
  const canUpgrade = !paid && plans?.available && ['inactive', 'canceled', 'incomplete_expired'].includes(details.subscriptionStatus);
  const returned = new URLSearchParams(location.search).get('billing');
  const price = plans?.pricing ? new Intl.NumberFormat('en-US', { style: 'currency', currency: plans.pricing.currency }).format(plans.pricing.amount / 100) : '';
  return <section className="my-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900" aria-label="Plan and billing">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold">{paid ? 'Pro' : 'Free'} · {usage.used} / {usage.limit} analyses used</h2><p className="text-sm">{usage.remaining} remaining{usage.reserved ? ` · ${usage.reserved} in progress` : ''}. Resets on the first of each month, UTC.</p></div>
    <div className="flex flex-wrap gap-3">{canUpgrade && <button disabled={busy} onClick={() => void billing('checkout')} className="rounded-xl bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">Upgrade to Pro · {price}/month</button>}{details.hasBillingCustomer && <button disabled={busy} onClick={() => void billing('portal')} className="rounded-xl border px-4 py-2 disabled:opacity-50">Manage subscription</button>}</div></div>
    {!paid && !plans?.available && <p className="mt-3 text-sm">Pro subscriptions are not available yet. Free includes 50 analyses per month.</p>}
    {usage.remaining === 0 && <p className="mt-3 font-semibold" role="status">You have reached your monthly limit. {canUpgrade ? 'Upgrade for 500 analyses per month, or wait for the next reset.' : details.hasBillingCustomer ? 'Review your subscription in the billing portal, or wait for the next monthly reset.' : 'Your next quota resets on the first day of next month.'} Your saved history is still available.</p>}
    {returned === 'success' && !paid && <p className="mt-3" role="status">Checkout returned. We are waiting for verified subscription confirmation. Refresh plan status if this takes longer than a minute. <button className="underline" onClick={() => void load()}>Refresh status</button></p>}
    {returned === 'success' && paid && <p className="mt-3" role="status">Your Pro subscription is active.</p>}
    {returned === 'canceled' && <p className="mt-3">Checkout was canceled. Your plan has not changed.</p>}
    {details.cancelAtPeriodEnd && details.currentPeriodEnd && <p className="mt-3">Cancellation scheduled. Pro access ends {new Date(details.currentPeriodEnd).toLocaleDateString()}. Your account then uses Free limits.</p>}
    {['past_due', 'unpaid', 'incomplete', 'paused'].includes(details.subscriptionStatus) && <p className="mt-3">Your subscription needs attention ({details.subscriptionStatus.replaceAll('_', ' ')}). Free limits apply. Update payment details in the billing portal.</p>}
    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Pro offers 500 analyses per calendar month; billing renews monthly until canceled. Quotas do not roll over. Logs are limited to 16 KiB per analysis on either plan.</p>
  </section>;
}
