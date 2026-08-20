import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";

import { resetPassword } from "../services/api";

type ResetPasswordProps = {
  token: string;
  onComplete: () => void;
};

function ResetPassword({ token, onComplete }: ResetPasswordProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await resetPassword(token, password);
      toast.success(response.message);
      setIsSuccessful(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not reset the password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
          KANYI
        </p>
        <h1 className="mt-3 text-3xl font-black">Choose a new password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Your reset link is single-use and expires after one hour.
        </p>

        {isSuccessful ? (
          <button
            type="button"
            onClick={onComplete}
            className="mt-8 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white"
          >
            Back to Sign In
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 outline-none focus:border-emerald-400"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3.5 outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white disabled:opacity-60"
            >
              {isSubmitting ? "Resetting password..." : "Reset password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default ResetPassword;
