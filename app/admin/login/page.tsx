"use client";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function AdminLogin() {
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
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center text-2xl font-semibold">Admin Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <div className="space-y-2">
          <button
            type="submit"
            disabled={loadingAction !== null}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingAction === "login" ? "Signing in…" : "Sign in"}
          </button>
{process.env.ALLOW_ADMIN_REGISTRATION === "true" && <button
            type="button"
            onClick={onRegister}
            disabled={loadingAction !== null}
            className="w-full rounded border border-blue-600 px-4 py-2 text-blue-600 hover:border-blue-700 hover:text-blue-700 disabled:opacity-50"
          >
            {loadingAction === "register" ? "Creating account…" : "Temporary registration"}
          </button>}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Remove the registration button after creating the required accounts.
        </p>
        <div className="pt-4 text-center text-sm">
          <Link href="/" className="text-blue-600 hover:underline">
            ↩︎ Back to site
          </Link>
        </div>
      </form>
    </div>
  );
}
