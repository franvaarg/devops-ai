import { lazy, Suspense, useEffect, useSyncExternalStore } from "react";
import Landing from "./pages/Landing";
import DemoWorkspace from "./pages/DemoWorkspace";
import { marketingOnly } from "./config/publicMode";

const ProductApp = lazy(() => import("./ProductApp"));
const publicAnchors = new Set([
  "",
  "#top",
  "#main-content",
  "#demo",
  "#how",
  "#data",
]);

function publicLocation() {
  const { pathname, hash } = window.location;
  const path = pathname === "/demo/" ? "/demo" : pathname;
  const allowedHash =
    path === "/demo"
      ? ["", "#workspace"].includes(hash)
      : publicAnchors.has(hash);
  return (path === "/" || path === "/demo") && allowedHash ? path + hash : "/";
}

function normalizeLocation() {
  const canonical = publicLocation();
  if (
    window.location.pathname + window.location.search + window.location.hash !==
    canonical
  ) {
    window.history.replaceState(null, "", canonical);
  }
}

function subscribeNavigation(onChange: () => void) {
  const sync = () => {
    normalizeLocation();
    onChange();
  };
  window.addEventListener("hashchange", sync);
  window.addEventListener("popstate", sync);
  return () => {
    window.removeEventListener("hashchange", sync);
    window.removeEventListener("popstate", sync);
  };
}

function MarketingApp() {
  const location = useSyncExternalStore(subscribeNavigation, publicLocation);
  useEffect(normalizeLocation, []);
  return location.startsWith("/demo") ? <DemoWorkspace /> : <Landing />;
}

// Product session, authentication and billing components never load in this mode.
export default function App() {
  return marketingOnly ? (
    <MarketingApp />
  ) : (
    <Suspense fallback={<p role="status">Loading KANYI…</p>}>
      <ProductApp />
    </Suspense>
  );
}
