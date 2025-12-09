"use client";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AdminLocaleSwitcher } from "../components/AdminLocaleSwitcher";

export default function AdminLogin() {
  const t = useTranslations("Admin.login");
  const params = useSearchParams();
  const callbackUrl = params?.get("callbackUrl") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"login" | "register" | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAction("login");
    setError(null);
    setMessage(null);
    try {
      const res = await signIn("credentials", { email, password, callbackUrl, redirect: false });
      if (res?.error) {
        setError("Invalid email or password");
      } else if (res?.ok) {
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error("Login error", err);
      setError("An error occurred during sign in");
    } finally {
      setLoadingAction(null);
    }
  }

  async function onRegister() {
    if (!email || !password) {
      setError("Enter email and password to register");
      setMessage(null);
      return;
    }

    setLoadingAction("register");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(data?.error ?? "Registration failed");
        return;
      }

      setMessage("Account created. Redirecting to dashboard…");
      const signInResult = await signIn("credentials", { email, password, callbackUrl, redirect: false });

      if (!signInResult) {
        setError("Registration succeeded but sign in did not complete. Please try again.");
        setMessage(null);
        return;
      }

      if (signInResult.error) {
        setError("Registration succeeded but sign in did not complete. Please try again.");
        setMessage(null);
        return;
      }

      if (signInResult.ok) {
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error("Register error", err);
      setError("An error occurred during registration");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Language Switcher - top right */}
      <div className="absolute right-4 top-4">
        <AdminLocaleSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-2xl font-bold text-white shadow-lg">
            E
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("title")}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t("subtitle")}
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@elsys.bg"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingAction !== null}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-900"
            >
              {loadingAction === "login" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                  </svg>
                  {t("signingIn")}
                </span>
              ) : (
                t("signIn")
              )}
            </button>

            {process.env.ALLOW_ADMIN_REGISTRATION === "true" && (
              <button
                type="button"
                onClick={onRegister}
                disabled={loadingAction !== null}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {loadingAction === "register" ? t("creatingAccount") : t("createAccount")}
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← {t("backToSite")}
          </Link>
        </div>
      </div>
    </div>
  );
}
