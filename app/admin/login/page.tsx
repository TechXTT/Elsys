"use client";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
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

  // NOTE: auth flow unchanged (NextAuth credentials). The 2FA UI below is
  // VISUAL ONLY — TOTP verification is not wired (separate auth task).
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
      if (!signInResult || signInResult.error) {
        setError("Registration succeeded but sign in did not complete. Please try again.");
        setMessage(null);
        return;
      }
      if (signInResult.ok) window.location.href = callbackUrl;
    } catch (err) {
      console.error("Register error", err);
      setError("An error occurred during registration");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-subtle)] p-[var(--spacing-md)]">
      <div className="absolute right-4 top-4">
        <AdminLocaleSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-[var(--spacing-xl)] text-center">
          <div className="mx-auto mb-[var(--spacing-md)] flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-action-primary)] text-2xl font-bold text-[var(--color-text-on-brand)]">
            Е
          </div>
          <h1 className="text-h2 text-[var(--color-text-heading)]">{t("title")}</h1>
          <p className="text-body-sm mt-[var(--spacing-xs)] text-[var(--color-text-muted)]">{t("subtitle")}</p>
        </div>

        {/* Login card */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[var(--spacing-xl)]">
          <form onSubmit={onSubmit} className="flex flex-col gap-[var(--spacing-md)]">
            <FormField htmlFor="email" label={t("email")}>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@elsys.bg"
              />
            </FormField>
            <FormField htmlFor="password" label={t("password")}>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </FormField>

            {error && (
              <p role="alert" className="text-body-sm rounded-[var(--radius-md)] bg-[var(--color-status-danger-bg)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[var(--color-status-danger-text)]">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="text-body-sm rounded-[var(--radius-md)] bg-[var(--color-status-success-bg)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[var(--color-status-success-text)]">
                {message}
              </p>
            )}

            <Button type="submit" size="lg" disabled={loadingAction !== null} className="w-full">
              {loadingAction === "login" ? t("signingIn") : t("signIn")}
            </Button>

            {process.env.ALLOW_ADMIN_REGISTRATION === "true" && (
              <Button type="button" variant="secondary" size="lg" onClick={onRegister} disabled={loadingAction !== null} className="w-full">
                {loadingAction === "register" ? t("creatingAccount") : t("createAccount")}
              </Button>
            )}
          </form>

          {/* 2FA — VISUAL ONLY (TOTP not wired; flagged in the phase report). */}
          <div className="mt-[var(--spacing-lg)] border-t border-[var(--color-border-default)] pt-[var(--spacing-lg)]">
            <p className="text-body-sm font-medium text-[var(--color-text-body)]">{t("twoFactorLabel")}</p>
            <p className="text-caption mt-[var(--spacing-2xs)] text-[var(--color-text-muted)]">{t("twoFactorPending")}</p>
            <div className="mt-[var(--spacing-sm)] flex gap-[var(--spacing-xs)]" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  inputMode="numeric"
                  maxLength={1}
                  disabled
                  tabIndex={-1}
                  aria-label={`2FA digit ${i + 1}`}
                  className="text-h4 h-12 w-11 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-center text-[var(--color-text-heading)]"
                />
              ))}
            </div>
            <p className="text-caption mt-[var(--spacing-sm)] text-[var(--color-text-muted)]">{t("recovery")}</p>
          </div>
        </div>

        <div className="mt-[var(--spacing-lg)] text-center">
          <Link href="/" className="text-body-sm text-[var(--color-text-link)] no-underline hover:underline">
            ← {t("backToSite")}
          </Link>
        </div>
      </div>
    </div>
  );
}
