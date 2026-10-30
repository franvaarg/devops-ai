# Early-access lead intake

Implemented locally, 2026-10-29. No deployment, production migration, live lead collection, push, payment, or provider verification is established by this change.

## Workflow and API

The public landing offers a prepared synthetic demo. A request form appears only in product mode with frontend `VITE_EARLY_ACCESS_ENABLED=true`; otherwise it displays an explicit opening-soon state. `POST /api/early-access` accepts JSON:

```json
{"email":"engineer@example.com","role":"DevOps / SRE","useCase":"Failed deployments","company":"Example","teamSize":"1–5","website":""}
```

Required: email, role, useCase. Optional: company (company name or website text), teamSize. `website` is a hidden honeypot and must be empty; it is not the optional company/website field. No free-text incident or log field exists. The optional company text is not fetched as a URL.

Role values: Engineering leadership, Software engineering, DevOps / SRE, Technical support, Founder, Other. Use-case values: Application errors, Failed deployments, Support escalations, Evaluating incident triage. Optional team sizes: 1–5, 6–20, 21–50, 51+.

Validation rejects unknown properties, control characters, malformed email, invalid enums, oversized fields, and filled honeypots. The endpoint accepts JSON only with a 4-KiB parser limit. Five attempts per IP per hour include invalid submissions; 429 includes Retry-After. Limiting is per process; configure exact trusted proxy hops and ingress/shared controls before multiple instances or broad acquisition. CORS is not bot authentication. Honeypots and rate limits reduce basic abuse; they do not establish email ownership or stop distributed spam. No email verification or automatic notification is implemented.

The frontend availability flag is not server authorization. Collection is disabled unless backend `EARLY_ACCESS_ENABLED=true`. Keep disabled until owner privacy, deployment, and intake-operation gates pass. Missing schema/storage returns failure, never success. The UI preserves fields after errors and prevents concurrent clicks. New requests and duplicates return the same `200 {"received":true}` only after the SQL operation resolves. Emails are trimmed/lowercased and unique; concurrent duplicates use ON CONFLICT DO NOTHING. Anonymous retries cannot overwrite the original request. No public lead read/list/update/delete endpoint exists. No lead ID or email-existence flag is returned. Consent-gated event names record CTA clicks, demo opens, submission attempts and received acknowledgements without identifying visitors. Received events include duplicates and cannot be interpreted as unique leads. Submitted details are not added to analytics, request logs, browser storage, Gemini, or Stripe.

## Schema and access

Additive migration `database/migrations/006_early_access_leads.sql` creates `early_access_leads` with normalized unique email, role, use case, optional company/team size, and creation time. The existing forward migration runner discovers it. Fresh Compose databases mount it; existing volumes require explicit migration. Readiness checks table/columns as well as the existing schema. The migration does not touch users, analyses, billing, or quotas.

There is no admin UI. Authorized operators must use private database tooling with least-privilege access. Avoid downloading lead lists to unmanaged files or sharing them in tickets. Use parameterized private queries for review/deletion. Lead records are independent of product accounts: deleting an account or analysis does not delete a lead request automatically.

## Retention and deletion requirements — owner approval needed

No retention duration, legal basis, deletion response time, or backup-erasure promise is invented. Before collecting real leads, the operator must:

- Approve and publish the actual legal identity, privacy notice, purpose/legal basis, contact route, and applicable rights process.
- Decide and document lead retention/review intervals, accepted/declined request handling, and a periodic deletion process. Automated time-based deletion is not implemented.
- Establish how requesters prove ownership for access/correction/deletion requests. Do not allow anonymous deletion by email alone.
- Delete the matching lead in the live table through an authorized parameterized operation (`DELETE FROM early_access_leads WHERE email = $1 RETURNING id`, binding the normalized verified email); record completion without unnecessarily retaining the email in logs.
- Address copies, exports, backups, restoration/re-deletion, and any later CRM/email processor separately. Live deletion does not erase backups.
- Restrict review access and designate a person to review qualified requests and contact applicants. No automated invitations or marketing-email enrollment occurs.

The form states its immediate review/contact purpose. This statement does not replace the approved privacy notice. ProductFooter renders only operator-supplied identity, support, privacy, and terms variables; absent values are omitted. Do not enable collection while required disclosures are missing.

## Exact pre-live checklist

1. Review the local diff and verification evidence. Obtain deployment approval separately; this implementation does not authorize publishing.
2. Approve the legal/operator/support/retention details above. Configure genuine `VITE_LEGAL_NAME`, `VITE_SUPPORT_EMAIL`, `VITE_PRIVACY_URL`, and `VITE_TERMS_URL` at frontend build time.
3. Establish the intended staging database credentials, verified TLS and least-privilege role. Back up and prove restore before applying migrations. Do not repair authentication by resetting data or bypassing TLS.
4. On isolated staging, run the existing reviewed migration command from backend: `npm run migrate -- --apply`. Confirm all six migrations and `/health/ready`. Keep intake and billing disabled until verification is ready.
5. Build the product-mode frontend with `VITE_MARKETING_ONLY=false`, `VITE_EARLY_ACCESS_ENABLED=true` only for the verified working-intake stage. Keep the frontend flag false whenever backend intake is disabled; rebuild it when changing availability. Satisfy the existing production startup configuration requirements: strong JWT secret, configured Gemini key, verified recovery-mail credentials/sender, database TLS, and HTTPS origins (see DEPLOYMENT.md). Intake does not call Gemini or send email. Configure the real HTTPS frontend API origin (`VITE_API_BASE_URL`), exact backend CORS origins and trusted proxy hops. Verify WAF/ingress rate limits and logs do not capture request bodies or email addresses. Use a single backend process until shared abuse limits exist.
6. Deploy the approved backend/frontend artifacts to staging. Set `EARLY_ACCESS_ENABLED=true` there; keep `BILLING_ENABLED=false`. Exercise a synthetic form submission and verify exactly one durable SQL row. Repeat the email with changed case; verify one original row and the same public acknowledgement. Verify invalid, rate-limited, disabled, and unavailable-storage behavior. Delete synthetic leads through authorized tooling.
7. Configure the final site origin and replace relative social image URLs with an absolute HTTPS URL in frontend/index.html; add canonical and og:url only after the actual domain is confirmed. Validate real social crawler previews. Do not invent a domain.
8. Establish access-request review ownership, private lead access, contact/deletion procedures, backup handling, and storage/error monitoring. Verify any support email actually receives messages.
9. After staging evidence and explicit production deployment approval, apply reviewed migrations to the intended backed-up production database, deploy the same reviewed artifacts, verify health/security headers, then enable intake and repeat the synthetic smoke test. Confirm the record privately and remove it. Only then describe live lead collection as working.
10. Invite users into the product only after DB, Gemini quota/quality, recovery email and deployed two-user product journeys pass their separate readiness gates. Stripe test/live lifecycle gates remain separate from lead capture.

Rollback: set EARLY_ACCESS_ENABLED=false to stop intake, preserve rows, and roll back compatible application artifacts. Do not drop the table or reset the database. A frontend rollback alone does not disable the API.

## Verification

- `cd backend && npm test`: HTTP validation, duplicates, SQL acknowledgement ordering, failures, enable gate, no public read, and rate limiting, plus existing regressions.
- `cd backend && npm run test:integration`: temporary isolated PostgreSQL, migration preservation, concurrent lead duplicates, actual persistence, missing-table failure, and existing product isolation/quota/billing tests. No production credentials are used.
- `cd frontend && npm run lint && npm run typecheck && npm run build`.
- `frontend/scripts/verify-landing.cjs`: fixture-backed lead success/failure/invalid/duplicate/rate/network states, responsive/keyboard/reduced-motion/axe checks, screenshots. Fixtures do not prove live storage; SQL integration tests establish local persistence separately.
- Existing `verify-journey.cjs` and `verify-resilience.cjs` cover authentication, demo, workspace/history, PDF, quota/billing errors and recovery using API fixtures.

Browser scripts require external Playwright and @axe-core/playwright via PLAYWRIGHT_MODULE/AXE_MODULE, a running local frontend via APP_URL, and optional BROWSER_REPORT_DIR. They add no product dependency. Local screenshots and reports are engineering evidence, not a production service or an accessibility certification.


## Independent marketing-only launch

This is a separate deployment stage from accepting leads or granting product access. The marketing build runs from static files and needs no backend, PostgreSQL, Gemini, Stripe, recovery email, or migrations. Existing backend validation is unchanged; do not supply placeholder credentials or set NODE_ENV=development to bypass it.

| VITE_MARKETING_ONLY | VITE_EARLY_ACCESS_ENABLED | Public behavior |
| --- | --- | --- |
| true | false, missing, or true | Informational landing and synthetic demo; opening-soon state; no form, sign-in, product session validation, password-reset screen, workspace, billing UI, or analytics API events. |
| false or missing | false or missing | Product mode; sign-in and existing session behavior retained; landing intake closed. |
| false or missing | true | Product mode with request form; requires the separate working-intake deployment and backend enablement. |

Only exact string `true` enables either switch. Public configuration lives in `frontend/src/config/publicMode.ts`; examples are in `frontend/.env.example`. Backend EARLY_ACCESS_ENABLED still defaults off and is never enabled by frontend flags. Static builds cannot discover a changed backend enable flag without network requests: operators must keep frontend availability and backend collection settings aligned. A backend outage in an intentionally enabled form continues to show the existing recoverable error, never false success.

Exact public build environment:

```dotenv
VITE_MARKETING_ONLY=true
VITE_EARLY_ACCESS_ENABLED=false
VITE_API_BASE_URL=
```

Also configure real owner-approved VITE_LEGAL_NAME, VITE_SUPPORT_EMAIL, VITE_PRIVACY_URL and VITE_TERMS_URL where required by the approved disclosure plan. These public values are embedded at build time. No production secrets belong in the frontend. Do not copy example identities or invented policy URLs into hosting configuration. The marketing build suppresses the analytics consent control and all product event calls, including when a saved preference is yes. It does not erase existing auth tokens or product data. Theme preferences can still be saved locally; hosting logs and host-provided analytics are separate operator responsibilities.

The synthetic demo remains prepared examples; it accepts no uploads and makes no AI calls. Application log-processing descriptions remain intact and are explicitly labeled as product-workflow information. The opening-soon section offers no waiting list and promises no contact or invitation. Social preview copy directs visitors to the demo so it remains accurate with intake closed. Sign-in is omitted in this mode because no product destination has been verified; it remains available in the product build. Auth/reset/billing-return URLs on the marketing hostname render the landing rather than product screens. Use a separate confirmed product hostname for actual authentication and recovery links.

### Proposed marketing deployment checklist — requires explicit approval

1. Review the exact diff/build artifact and public-mode verification evidence. Do not deploy an old staging branch or assume an existing host contains these changes.
2. Approve operator/controller identity, a monitored contact address, privacy/terms content and URLs, applicable hosting/log retention, local preference disclosure, and rights handling. The form is absent, so lead retention approval is needed later before intake; hosting disclosures still need review now. No policies or legal identity have been fabricated.
3. Confirm a dedicated marketing hostname and static HTTPS host. Review host analytics and logging; keep unapproved analytics integrations disabled. Confirm separation from existing product auth/reset destinations and avoid replacing a working product origin accidentally.
4. Set the exact public build variables above plus approved disclosure values. From frontend run npm ci, npm run lint, npm run typecheck and npm run build. Publish only dist after deployment approval. Vercel can use the checked-in frontend/vercel.json; root is frontend, output is dist. No API proxy, backend deployment or migration is needed. Docker build arguments are supported, but the bundled Nginx configuration still references the backend upstream and is not a standalone marketing server configuration. Use static hosting of dist for independence; full Compose unnecessarily starts product services.
5. Before publishing, confirm the real origin and use absolute HTTPS social-image URLs in index.html; add canonical/og:url for that approved hostname. Check the demo social card. Do not invent a hostname.
6. Verify the built artifact locally with no working APIs. Check 320/390/768/1440px, keyboard navigation, demo/evidence, opening-soon state, no form/sign-in/billing/analytics requests, and stale-session/auth/reset/billing URLs. Test old analytics consent and an accidentally true intake flag as well.
7. After explicit deployment approval, publish the reviewed artifact. Verify certificate/redirects, actual response headers, asset/image MIME types and routing. Smoke-test fresh and stale-session browsers while watching for unexpected API calls. These checks have not yet been performed on a deployed host.
8. Roll back by restoring the previous reviewed static artifact. Do not enable backend intake or billing as part of publishing or rollback. A static-only launch changes no database state.
9. To collect leads later, separately approve and execute the earlier working-intake checklist, including database TLS/migration/restore, abuse controls, privacy/retention, owner review, real SQL smoke evidence, and coordinated frontend/backend enablement. Product invitations and payment remain separate gates.

### Public-mode regression verification

`frontend/scripts/verify-public-modes.cjs` serves three actual built artifacts on temporary loopback ports, checks public mode with all API traffic blocked, and compares disabled-intake/product behavior with explicitly enabled intake. Use MARKETING_DIST, PRODUCT_DIST, INTAKE_DIST for their directories, PLAYWRIGHT_MODULE and AXE_MODULE for external browser tooling, and optionally BROWSER_REPORT_DIR. The marketing test build intentionally sets VITE_EARLY_ACCESS_ENABLED=true and an unreachable API origin to prove marketing-only precedence. No database or provider requests are made.

For existing verify-landing.cjs request-form regressions, explicitly build/run product mode with VITE_MARKETING_ONLY=false and VITE_EARLY_ACCESS_ENABLED=true. Existing verify-journey.cjs and verify-resilience.cjs remain product-mode tests. Browser fixtures do not prove production collection, email delivery, provider quality or payments.


To reproduce the three tested build configurations (commands from frontend; /tmp outputs are local verification artifacts):

```sh
VITE_MARKETING_ONLY=true VITE_EARLY_ACCESS_ENABLED=true VITE_API_BASE_URL=http://127.0.0.1:9 npm run build -- --outDir /tmp/kanyi-marketing-mode-dist
VITE_MARKETING_ONLY=false VITE_EARLY_ACCESS_ENABLED=false VITE_API_BASE_URL= npm run build -- --outDir /tmp/kanyi-product-closed-dist
VITE_MARKETING_ONLY=false VITE_EARLY_ACCESS_ENABLED=true VITE_API_BASE_URL= npm run build -- --outDir /tmp/kanyi-product-intake-dist
```

Then run verify-public-modes.cjs with MARKETING_DIST=/tmp/kanyi-marketing-mode-dist, PRODUCT_DIST=/tmp/kanyi-product-closed-dist and INTAKE_DIST=/tmp/kanyi-product-intake-dist. RUN_PRODUCT_REGRESSIONS=true also runs the existing landing-form, product-journey and analysis-resilience suites against the built intake-enabled artifact. The unreachable API value above is a negative test input only; it is not the public deployment configuration.

Completed local results, screenshots and this follow-up’s file manifest: [marketing-only verification](verification/marketing-only-2026-10-29/REPORT.md). These checks do not approve or establish a deployed public site.
