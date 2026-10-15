# Billing

Free: 50 completed analyses per UTC calendar month. Pro: 500. Both enforce a 16-KiB log limit. Subscription renewal dates do not determine quota reset dates; unused quota never rolls over. Failed analyses do not consume product quota, but upstream provider attempts may still incur cost.

Leave BILLING_ENABLED=false until the owner gates pass. Required for sales: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET and HTTPS FRONTEND_URL. A valid monthly, licensed, per-unit USD recurring price supplies the displayed price; no selling price is invented in the UI. Stripe test-mode and live-mode identifiers must not be mixed.

Checkout locks the authenticated user's account and uses a stable customer idempotency key. Existing subscriptions block new checkout. An open session is reused, including recovery after a provider-success/database-rollback boundary. Hosted checkout and portal URLs come from Stripe server-side. The billing portal remains available for existing customers when new sales are disabled or pricing retrieval fails. Configure and verify portal cancellation/payment/invoice features in Stripe.

The raw webhook body is signed and verified before parsing into events. Only supported subscription/checkout/invoice lifecycle events are processed. Event IDs and entitlement updates commit together under the account lock. Duplicate/concurrent events apply once. The handler fetches current subscription state rather than applying stale payloads. Customer mismatch never grants access. Unknown customer mappings fail for retry rather than acknowledging a possibly uncommitted checkout mapping. A single matching-price, quantity-one, unpaused active/trialing subscription with a future billing period grants Pro. Scheduled cancellation retains Pro to period end; past_due, unpaid, incomplete, paused, canceled and expired periods use Free. Product account display uses effective quota plan, not stale stored plan.

Local tests use Stripe SDK-generated signatures and explicit provider fixtures. No actual Stripe checkout/payment, portal, webhook delivery, refund, tax handling or paid entitlement has been verified over the Stripe network. There is no scheduled subscription reconciliation; missed events require operator replay/current-state verification. Period expiry fails closed, which can deny a paying customer after a missed renewal webhook. Monitor delivery and support that case before charging.

Test-mode owner procedure:
1. Use an eligible business account and create one test monthly USD price. Configure test keys/signing secret, origin and portal, then enable sales only in staging.
2. Register all events listed in COMMERCIAL_RELEASE.md. Deliver to `/api/billing/webhook` over HTTPS.
3. Register a fresh synthetic customer; verify Free 50 and displayed price. Begin checkout twice and verify one open session/customer. Cancel checkout; no plan change.
4. Complete checkout with a documented Stripe test card. Observe verified webhook response, event ID, Pro 500, persisted provider subscription and future end date. The success URL alone must not grant Pro.
5. Replay the same event and deliver an older payload. Verify no second entitlement/usage change. Test signature tampering and database/provider failure before acknowledgement; retry must recover.
6. Test incomplete checkout, required authentication, failed payment, past_due/unpaid, recovery, portal cancellation at period end, immediate cancellation, expiration and a new subscription after cancellation. Use Stripe test clocks where supported. Verify quota changes and history access in each state.
7. Verify duplicate-subscription prevention, upgrade/downgrade behavior, portal ownership with two accounts, delivery alerts and operator replay. No proration/Team/multiple paid tiers are implemented.
8. Record exact Stripe-mode evidence and review pricing/support/terms/privacy before repeating with approved live-mode credentials and an owner-authorized real payment.

Free accounts can self-delete with password confirmation. Any account with a Stripe customer must use support for cancellation and deletion; the app never silently deletes a potentially billable account. The operator must document payment-record retention and deletion handling before charging. Do not promise self-service deletion of paid accounts.

References for operator verification: [Stripe webhooks](https://docs.stripe.com/webhooks), [subscription lifecycle webhooks](https://docs.stripe.com/billing/subscriptions/webhooks). Provider documentation is not proof of KANYI's live integration.
