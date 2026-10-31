# KANYI frontend

React/TypeScript/Vite static application. Use Node 22+, `npm ci`, then `npm run dev`. `npm run lint`, `npm run typecheck`, and `npm run build` validate the release. Vercel serves dist; Docker builds dist and serves it through Nginx.

Set VITE_API_BASE_URL to the API origin for separate hosting; leave it empty for same-origin Docker proxying. Vite loads supported .env files or real process/build environment variables, not the historical file named `env`. Frontend configuration is public: never put secrets in VITE_* variables. Set legal identity, support and approved policy URLs as documented in .env.example.

`verify-journey.cjs` tests desktop/mobile workflows and axe accessibility with explicit API fixtures. `verify-resilience.cjs` tests duplicate clicks, malformed success rejection and timeout/same-key recovery. Install Playwright/axe as test tooling and set PLAYWRIGHT_MODULE/AXE_MODULE if installed outside this package. Start a local server on 5174 or set APP_URL. These tests do not prove live AI/payment/email/database behavior; real PostgreSQL/API tests live in backend.

See ../docs/DEPLOYMENT.md and ../docs/PRODUCTION_READINESS.md for production gates and current evidence.

The free public demo uses `VITE_MARKETING_ONLY=true`, `VITE_EARLY_ACCESS_ENABLED=false`, and an empty `VITE_API_BASE_URL`. The primary CTA is “Try the Free Demo”; the secondary CTA is “Explore How It Works”. No early-access section, waitlist, recruitment, pricing or subscription CTA appears in marketing mode. It accepts no logs, accounts, leads or payment details. Unsupported paths, query strings and auth fragments normalize to the landing page, including refresh and history navigation. Saved product tokens are ignored and preserved. All shared API calls reject with `MARKETING_ONLY` before fetch; analytics is suppressed. Product mode retains its existing authentication and billing implementation.

Vercel runs `scripts/build-vercel.cjs`. Only Preview builds of `review/kanyi-marketing-only-2026-10-29` override those three public build flags to the values above. Production and all other branches inherit their existing configuration. No Vercel environment variables or credentials are modified. Pushes to the review branch use the existing Git integration; no manual deployment or promotion is required.

Run `npm run test:api-isolation` for API and Preview-build isolation regressions. `scripts/verify-public-modes.cjs` exercises three static builds (marketing, product with intake closed, product with explicitly enabled intake) using Playwright and axe. See the browser CI job for the build commands and tool paths. Intake tests use fixtures only; this release does not enable intake on any service.

The full interface uses the [Technical Dark design system](../docs/DESIGN_SYSTEM.md): shared workspace primitives, graphite surfaces, semantic status badges, compact forms, and responsive investigation/history/account layouts. Dark is the default; saved product theme preferences remain supported. `scripts/verify-design.cjs` adds full-product state and accessibility coverage at 320/390/768/1440px with service fixtures only.
