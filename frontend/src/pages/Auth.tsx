import {
  type FormEvent,
  useState,
} from "react";
import toast from "react-hot-toast";

import {
  login,
  register,
  requestPasswordReset,
  type AuthResponse,
} from "../services/api";

type AuthMode = "login" | "register" | "forgot";

type AuthProps = {
  onAuthenticated: (
    authData: AuthResponse
  ) => void;
};

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 5 6v5c0 4.8 2.9 8.6 7 10 4.1-1.4 7-5.2 7-10V6l-7-3Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9.5 12 1.7 1.7 3.6-4"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16v12H4V6Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 7 7 6 7-6"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 21a8 8 0 0 1 16 0"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 10V8a5 5 0 0 1 10 0v2"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 10h14v11H5V10Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14v3"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="4"
      />

      <path
        className="opacity-75"
        fill="currentColor"
        d="M12 3a9 9 0 0 1 9 9h-4a5 5 0 0 0-5-5V3Z"
      />
    </svg>
  );
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

function Auth({
  onAuthenticated,
}: AuthProps) {
  const [mode, setMode] =
    useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const isLogin = mode === "login";
  const isForgot = mode === "forgot";

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    resetForm();
  }

  function validateForm() {
    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      mode === "register" &&
      name.trim().length < 2
    ) {
      toast.error(
        "Enter a valid name."
      );

      return false;
    }

    if (!normalizedEmail) {
      toast.error(
        "Enter your email address."
      );

      return false;
    }

    if (
      !normalizedEmail.includes("@") ||
      !normalizedEmail.includes(".")
    ) {
      toast.error(
        "Enter a valid email address."
      );

      return false;
    }

    if (!isForgot && password.length < 8) {
      toast.error(
        "Password must contain at least 8 characters."
      );

      return false;
    }

    if (
      mode === "register" &&
      password !== confirmPassword
    ) {
      toast.error(
        "Passwords do not match."
      );

      return false;
    }

    return true;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const loadingToast =
      toast.loading(
        isForgot
          ? "Sending reset link..."
          : isLogin
          ? "Signing in..."
          : "Creating account..."
      );

    try {
      setIsSubmitting(true);

      const normalizedEmail =
        email.trim().toLowerCase();

      if (isForgot) {
        const response = await requestPasswordReset(normalizedEmail);
        toast.success(response.message, { id: loadingToast });
        changeMode("login");
        return;
      }

      const authData = isLogin
        ? await login(
            normalizedEmail,
            password
          )
        : await register(
            name.trim(),
            normalizedEmail,
            password
          );

      localStorage.setItem(
        "token",
        authData.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(authData.user)
      );

      toast.success(
        isLogin
          ? "Welcome back."
          : "Account created successfully.",
        {
          id: loadingToast,
        }
      );

      onAuthenticated(authData);
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          isLogin
            ? "Could not sign in."
            : "Could not create the account."
        ),
        {
          id: loadingToast,
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div
        className="pointer-events-none absolute left-0 top-0 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-900/20"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[30rem] w-[30rem] translate-x-1/2 translate-y-1/2 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-900/20"
        aria-hidden="true"
      />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/25 via-transparent to-teal-500/20"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full border border-emerald-400/20"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute -right-6 top-36 h-40 w-40 rounded-full border border-teal-400/20"
            aria-hidden="true"
          />

          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/20">
              <ShieldIcon />
            </div>

            <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
              AI Log Intelligence
            </p>

            <h1 className="mt-4 max-w-md text-4xl font-black tracking-tight">
              We find what hides in your logs.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Detect severity, identify likely root
              causes, receive clear recommendations,
              and keep a private history of every
              analysis.
            </p>
          </div>

          <div className="relative space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm font-bold text-white">
                Secure personal workspace
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Every saved analysis is associated
                with your authenticated account.
              </p>
            </div>

            <p className="text-xs text-slate-500">
              React · TypeScript · Express ·
              PostgreSQL · JWT · Gemini AI
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <div className="lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <ShieldIcon />
              </div>
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 lg:mt-0">
              KANYI
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              {isLogin
                ? "Welcome back"
                : isForgot
                  ? "Reset your password"
                  : "Create your account"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {isLogin
                ? "Sign in to access your analysis dashboard and saved history."
                : isForgot
                  ? "Enter your email and we will send a secure reset link if the account exists."
                  : "Register to start analyzing logs and saving private results."}
            </p>

            <div className="mt-8 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() =>
                  changeMode("login")
                }
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isLogin
                    ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={() =>
                  changeMode("register")
                }
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  !isLogin
                    ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              {mode === "register" && (
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <UserIcon />
                    </div>

                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(event) =>
                        setName(
                          event.target.value
                        )
                      }
                      placeholder="Francisco Vargas"
                      disabled={isSubmitting}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 dark:focus:bg-slate-950"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                  Email address
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <EmailIcon />
                  </div>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 dark:focus:bg-slate-950"
                  />
                </div>
              </div>

              {!isForgot && <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                  Password
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <LockIcon />
                  </div>

                  <input
                    id="password"
                    type="password"
                    autoComplete={
                      isLogin
                        ? "current-password"
                        : "new-password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="At least 8 characters"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 dark:focus:bg-slate-950"
                  />
                </div>
              </div>}

              {mode === "register" && (
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    Confirm password
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <LockIcon />
                    </div>

                    <input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      placeholder="Repeat your password"
                      disabled={isSubmitting}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400 dark:focus:bg-slate-950"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {isSubmitting && (
                  <SpinnerIcon />
                )}

                {isSubmitting
                  ? isForgot
                    ? "Sending reset link..."
                    : isLogin
                    ? "Signing in..."
                    : "Creating account..."
                  : isForgot
                    ? "Send reset link"
                    : isLogin
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            {isLogin && (
              <button
                type="button"
                onClick={() => changeMode("forgot")}
                className="mt-5 w-full text-center text-sm font-bold text-emerald-700 dark:text-emerald-400"
              >
                Forgot your password?
              </button>
            )}

            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {isForgot
                ? "Remembered your password?"
                : isLogin
                ? "New to KANYI?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() =>
                  changeMode(
                    isLogin
                      ? "register"
                      : "login"
                  )
                }
                className="font-bold text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                {isForgot
                  ? "Back to sign in"
                  : isLogin
                  ? "Create an account"
                  : "Sign in"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Auth;
