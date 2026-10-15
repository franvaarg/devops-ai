import { lazy, Suspense, useEffect, useState } from "react";
import toast from "react-hot-toast";

import Landing from "./pages/Landing";
const Home = lazy(() => import("./pages/Home"));
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

import {
  ApiError,
  getCurrentUser,
  type AuthResponse,
} from "./services/api";

function App() {
  const [sessionError, setSessionError] = useState(false);
  const [showAuth, setShowAuth] = useState(window.location.hash === "#login");
  const [resetToken, setResetToken] = useState(() =>
    { const token = new URLSearchParams(window.location.search).get("token");
      if (token) window.history.replaceState({}, '', window.location.pathname);
      return token; }
  );
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    async function validateSession() {
      if (resetToken) { setIsLoading(false); return; }
      const token = localStorage.getItem("token");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        await getCurrentUser();

        setIsAuthenticated(true);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) { setSessionError(true); return; }
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        toast.error(
          "Your session has expired. Please sign in again."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void validateSession();
  }, [resetToken]);

  function handleAuthenticated(
    authData: AuthResponse
  ) {
    localStorage.setItem(
      "token",
      authData.token
    );

    localStorage.setItem(
      "user",
      JSON.stringify(authData.user)
    );

    setIsAuthenticated(true);
  }

  function handlePasswordResetComplete() {
    window.history.replaceState({}, "", window.location.pathname + "#login");
    setShowAuth(true);
    setSessionError(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setResetToken(null);
    setIsAuthenticated(false);
  }

  if (resetToken) {
    return (
      <ResetPassword
        token={resetToken}
        onComplete={handlePasswordResetComplete}
      />
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />

          <p className="mt-6 text-lg font-semibold">
            Loading KANYI...
          </p>
        </div>
      </main>
    );
  }

  if (sessionError) return <main className="p-8"><p role="alert">We could not reach your workspace. Your session has been kept.</p><button className="mt-4 rounded-xl border px-4 py-2" onClick={() => location.reload()}>Retry connection</button></main>;

  if (!isAuthenticated && !showAuth) return <Landing onStart={() => { window.location.hash = "login"; setShowAuth(true); }} />;

  if (!isAuthenticated) {
    return (
      <Auth
        onAuthenticated={
          handleAuthenticated
        }
      />
    );
  }

  return <Suspense fallback={<p role="status" className="p-8">Loading your workspace…</p>}><Home /></Suspense>;
}

export default App;
