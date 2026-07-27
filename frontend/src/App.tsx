import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Home from "./pages/Home";
import Auth from "./pages/Auth";

import {
  getCurrentUser,
  type AuthResponse,
} from "./services/api";

function App() {
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    async function validateSession() {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        await getCurrentUser();

        setIsAuthenticated(true);
      } catch (error) {
        console.error(
          "Session validation failed:",
          error
        );

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
  }, []);

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

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />

          <p className="mt-6 text-lg font-semibold">
            Loading DevOps AI...
          </p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <Auth
        onAuthenticated={
          handleAuthenticated
        }
      />
    );
  }

  return <Home />;
}

export default App;