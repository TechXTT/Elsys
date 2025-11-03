"use client";

import { useEffect, useState } from "react";

const gradeLevels = [8, 9, 10, 11, 12];
const gradeClasses = ["A", "B", "V", "G"] as const;

type Me = {
  id: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  gradeLevel?: number | null;
  gradeClass?: "A" | "B" | "V" | "G" | null;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<number | "">("");
  const [gradeClass, setGradeClass] = useState<"A" | "B" | "V" | "G" | "">("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load profile");
      const me: Me = data.user;
      setEmail(me.email || "");
      setFirstName(me.firstName || "");
      setLastName(me.lastName || "");
      if (typeof me.gradeLevel === "number") setGradeLevel(me.gradeLevel);
      if (me.gradeClass) setGradeClass(me.gradeClass);
    } catch (e: any) {
      setError(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          gradeLevel: typeof gradeLevel === "number" ? gradeLevel : null,
          gradeClass: gradeClass || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save profile");
      setSaveMessage("Profile updated successfully.");
    } catch (e: any) {
      setError(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPass(true);
    setPassMessage(null);
    setError(null);
    try {
      if (!currentPassword || !newPassword) throw new Error("Please enter current and new password.");
      if (newPassword !== confirmPassword) throw new Error("New passwords do not match.");
      const res = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changePassword: { currentPassword, newPassword } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to change password");
      setPassMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setError(e.message || "Failed to change password");
    } finally {
      setChangingPass(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Update your profile and change your password.</p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Profile</h2>
            <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={onSaveProfile}>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700 dark:text-slate-200">Email</span>
                <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700 dark:text-slate-200">First name</span>
                <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700 dark:text-slate-200">Last name</span>
                <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700 dark:text-slate-200">Grade (8-12)</span>
                <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value ? Number(e.target.value) : "") }>
                  <option value="">—</option>
                  {gradeLevels.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700 dark:text-slate-200">Class</span>
                <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={gradeClass} onChange={(e) => setGradeClass((e.target.value || "") as any)}>
                  <option value="">—</option>
                  {gradeClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2">
                <button disabled={saving} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Save</button>
                {saveMessage && <span className="ml-2 text-sm text-green-600">{saveMessage}</span>}
              </div>
            </form>
          </section>

          <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Change password</h2>
            <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={onChangePassword}>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-slate-700 dark:text-slate-200">Current password</span>
                <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700 dark:text-slate-200">New password</span>
                <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-700 dark:text-slate-200">Confirm new password</span>
                <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </label>
              <div className="sm:col-span-2">
                <button disabled={changingPass} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Update password</button>
                {passMessage && <span className="ml-2 text-sm text-green-600">{passMessage}</span>}
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
