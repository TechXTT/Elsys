"use client";

import React from "react";

export default function OneTimeReveal({ token }: { token: string }) {
  const [loading, setLoading] = React.useState(false);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onReveal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/one-time/${encodeURIComponent(token)}/claim`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const label = data?.reason === "used" ? "This link has already been used." : data?.reason === "expired" ? "This link has expired." : "Link not found or unavailable.";
        setError(label);
        setSecret(null);
      } else {
        setSecret(data.secret || null);
      }
    } catch (e) {
      setError("Failed to reveal the secret. Please try again.");
      setSecret(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!secret ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReveal}
            disabled={loading}
            className="rounded bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? "Revealing..." : "Reveal secret"}
          </button>
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>
      ) : (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <code className="select-all break-all rounded bg-amber-100 px-2 py-1 text-sm dark:bg-amber-800">{secret}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(secret)}
              className="rounded border border-amber-300 bg-amber-100 px-2 py-1 text-xs text-amber-900 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
