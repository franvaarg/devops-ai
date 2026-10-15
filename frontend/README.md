# KANYI frontend

React/TypeScript/Vite static application. Use Node 22+, `npm ci`, then `npm run dev`. `npm run lint`, `npm run typecheck`, and `npm run build` validate the release. Vercel serves dist; Docker builds dist and serves it through Nginx.

Set VITE_API_BASE_URL to the API origin for separate hosting; leave it empty for same-origin Docker proxying. Vite loads supported .env files or real process/build environment variables, not the historical file named `env`. Frontend configuration is public: never put secrets in VITE_* variables. Set legal identity, support and approved policy URLs as documented in .env.example.

`verify-journey.cjs` tests desktop/mobile workflows and axe accessibility with explicit API fixtures. `verify-resilience.cjs` tests duplicate clicks, malformed success rejection and timeout/same-key recovery. Install Playwright/axe as test tooling and set PLAYWRIGHT_MODULE/AXE_MODULE if installed outside this package. Start a local server on 5174 or set APP_URL. These tests do not prove live AI/payment/email/database behavior; real PostgreSQL/API tests live in backend.

See ../docs/DEPLOYMENT.md and ../docs/PRODUCTION_READINESS.md for production gates and current evidence.
