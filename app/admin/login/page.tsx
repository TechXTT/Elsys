"use client";
import Link from "next/link";
import { useRef, useState } from "react";
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
  const [step, setStep] = useState<"credentials" | "twofa">("credentials");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recovery, setRecovery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"login" | "register" | "twofa" | null>(null);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  async function attempt(token?: string) {
    const res = await signIn("credentials", { email, password, token, callbackUrl, redirect: false });
    return res;
  }

  // NextAuth v4 collapses authorize's thrown errors, so a no-session precheck
  // decides when to reveal the code step + reports lockout. authorize() stays
  // the sole verifier (it re-checks the token / consumes recovery codes once).
  async function precheck(): Promise<{ ok: boolean; required?: boolean; locked?: boolean } | null> {
    try {
      const r = await fetch("/api/admin/2fa/precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return (await r.json()) as { ok: boolean; required?: boolean; locked?: boolean };
    } catch {
      return null;
    }
  }

  function mapError(code?: string | null): string {
    switch (code) {
      case "INVALID_2FA": return t("error_invalid_2fa");
      case "2FA_LOCKED": return t("error_locked");
      default: return t("error_invalid_credentials");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAction("login");
    setError(null);
    setMessage(null);
    try {
      const pre = await precheck();
      if (!pre?.ok) {
        setError(t("error_invalid_credentials"));
      } else if (pre.locked) {
        setError(t("error_locked"));
      } else if (pre.required) {
        setStep("twofa");
        setTimeout(() => boxes.current[0]?.focus(), 0);
      } else {
        const res = await attempt();
        if (res?.ok) window.location.href = callbackUrl;
        else setError(mapError(res?.error));
      }
    } catch (err) {
      console.error("Login error", err);
      setError(t("error_generic"));
    } finally {
      setLoadingAction(null);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    const token = useRecovery ? recovery.trim() : digits.join("");
    if (!token) return;
    setLoadingAction("twofa");
    setError(null);
    try {
      const res = await attempt(token);
      if (res?.ok) {
        window.location.href = callbackUrl;
      } else {
        // authorize's error is collapsed by v4 — ask the precheck whether the
        // account is now locked to choose the message.
        const pre = await precheck();
        setError(pre?.locked ? t("error_locked") : t("error_invalid_2fa"));
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => boxes.current[0]?.focus(), 0);
      }
    } catch (err) {
      console.error("2FA verify error", err);
      setError(t("error_generic"));
    } finally {
      setLoadingAction(null);
    }
  }

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 5) boxes.current[i + 1]?.focus();
  }
  function onDigitKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
  }
  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length) {
      e.preventDefault();
      const next = ["", "", "", "", "", ""];
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      setDigits(next);
      boxes.current[Math.min(text.length, 5)]?.focus();
    }
  }

  async function onRegister() {
    if (!email || !password) {
      setError(t("error_invalid_credentials"));
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
        setError(data?.error ?? t("error_generic"));
        return;
      }
      const res = await attempt();
      if (res?.ok) window.location.href = callbackUrl;
      else if (res?.error === "2FA_REQUIRED") setStep("twofa");
      else setError(t("error_generic"));
    } catch (err) {
      console.error("Register error", err);
      setError(t("error_generic"));
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
        <div className="mb-[var(--spacing-xl)] text-center">
          <div className="mx-auto mb-[var(--spacing-md)] flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-action-primary)] text-2xl font-bold text-[var(--color-text-on-brand)]">
            Е
          </div>
          <h1 className="text-h2 text-[var(--color-text-heading)]">{t("title")}</h1>
          <p className="text-body-sm mt-[var(--spacing-xs)] text-[var(--color-text-muted)]">{t("subtitle")}</p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[var(--spacing-xl)]">
          {step === "credentials" ? (
            <form onSubmit={onSubmit} className="flex flex-col gap-[var(--spacing-md)]">
              <FormField htmlFor="email" label={t("email")}>
                <Input id="email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@elsys.bg" />
              </FormField>
              <FormField htmlFor="password" label={t("password")}>
                <Input id="password" type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              </FormField>

              {error && (
                <p role="alert" className="text-body-sm rounded-[var(--radius-md)] bg-[var(--color-status-danger-bg)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[var(--color-status-danger-text)]">{error}</p>
              )}
              {message && (
                <p role="status" className="text-body-sm rounded-[var(--radius-md)] bg-[var(--color-status-success-bg)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[var(--color-status-success-text)]">{message}</p>
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
          ) : (
            <form onSubmit={onVerify} className="flex flex-col gap-[var(--spacing-md)]">
              <div>
                <p className="text-body-sm font-medium text-[var(--color-text-body)]">{t("twoFactorLabel")}</p>
                <p className="text-caption mt-[var(--spacing-2xs)] text-[var(--color-text-muted)]">{t("twoFactorPrompt")}</p>
              </div>

              {!useRecovery ? (
                <div className="flex gap-[var(--spacing-xs)]" onPaste={onPaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { boxes.current[i] = el; }}
                      data-ui="twofa-digit"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => onDigitKey(i, e)}
                      aria-label={t("digitAria", { n: i + 1 })}
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      className="text-h4 h-12 w-11 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-center text-[var(--color-text-heading)] focus:border-[var(--color-action-secondary-border)] focus:outline-none"
                    />
                  ))}
                </div>
              ) : (
                <FormField htmlFor="recovery" label={t("recoveryLabel")}>
                  <Input id="recovery" data-ui="twofa-recovery" value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="xxxxx-xxxxx" autoComplete="off" />
                </FormField>
              )}

              {error && (
                <p role="alert" className="text-body-sm rounded-[var(--radius-md)] bg-[var(--color-status-danger-bg)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[var(--color-status-danger-text)]">{error}</p>
              )}

              <Button type="submit" size="lg" disabled={loadingAction !== null} className="w-full">
                {loadingAction === "twofa" ? t("verifying") : t("verify")}
              </Button>

              <button type="button" onClick={() => { setUseRecovery((v) => !v); setError(null); }} className="text-caption text-[var(--color-text-link)] hover:underline">
                {useRecovery ? t("useCode") : t("useRecovery")}
              </button>
            </form>
          )}
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
