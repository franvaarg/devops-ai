import { lazy, Suspense, useEffect } from 'react';
import Landing from './pages/Landing';
import { marketingOnly } from './config/publicMode';

const ProductApp = lazy(() => import('./ProductApp'));
const publicAnchors = new Set(['', '#top', '#main-content', '#demo', '#how', '#data', '#early-access']);

function MarketingApp() {
  useEffect(() => {
    const normalizeLocation = () => {
      const { pathname, search, hash } = window.location;
      if (pathname !== '/' || search || !publicAnchors.has(hash)) {
        window.history.replaceState(null, '', '/' + (publicAnchors.has(hash) ? hash : ''));
      }
    };
    normalizeLocation();
    window.addEventListener('hashchange', normalizeLocation);
    window.addEventListener('popstate', normalizeLocation);
    return () => {
      window.removeEventListener('hashchange', normalizeLocation);
      window.removeEventListener('popstate', normalizeLocation);
    };
  }, []);
  return <Landing />;
}

// Product session, authentication and billing components never load in this mode.
export default function App() {
  return marketingOnly ? <MarketingApp /> : <Suspense fallback={<p role="status">Loading KANYI…</p>}><ProductApp /></Suspense>;
}
