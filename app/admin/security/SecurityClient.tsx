"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import { startEnrollment, confirmEnrollment, disableTwoFactor, regenerateRecoveryCodes } from "./actions";

function RecoveryCodes({ codes, note }: { codes: string[]; note: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-[var(--spacing-md)]">
      <p className="text-body-sm mb-[var(--spacing-sm)] text-[var(--color-text-body)]">{note}</p>
      <ul data-testid="recovery-codes" className="grid grid-cols-2 gap-[var(--spacing-2xs)] font-mono text-body-sm text-[var(--color-text-heading)]">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </div>
  );
}

export function SecurityClient({ enabled, configured }: { enabled: boolean; configured: boolean }) {
  const t = useTranslations("Admin.security");
  const [isPending, startTransition] = useTransition();
  const [enroll, setEnroll] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(enabled);

  const errText = (key?: string) => (key ? t(`error_${key}`) : t("error_generic"));

  const begin = () =>
    startTransition(async () => {
      setError(null);
      const res = await startEnrollment();
      if (res.ok && res.qr && res.secret) setEnroll({ qr: res.qr, secret: res.secret });
      else setError(errText(res.error));
    });

  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const res = await confirmEnrollment(code);
      if (res.ok && res.recoveryCodes) {
        setRecoveryCodes(res.recoveryCodes);
        setIsEnabled(true);
        setEnroll(null);
        setCode("");
      } else setError(errText(res.error));
    });

  const disable = () =>
    startTransition(async () => {
      setError(null);
      const res = await disableTwoFactor(password);
      if (res.ok) {
        setIsEnabled(false);
        setRecoveryCodes(null);
        setPassword("");
      } else setError(errText(res.error));
    });

  const regenerate = () =>
    startTransition(async () => {
      setError(null);
      const res = await regenerateRecoveryCodes(password);
      if (res.ok && res.recoveryCodes) {
        setRecoveryCodes(res.recoveryCodes);
        setPassword("");
      } else setError(errText(res.error));
    });

  if (!configured) {
    return (
      <div className="rounded-[var(--radius-md)] bg-[var(--color-status-warning-bg)] p-[var(--spacing-md)] text-body-sm text-[var(--color-status-warning-text)]">
        {t("notConfigured")}
      </div>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-[var(--spacing-lg)]">
      {error && (
        <p role="alert" className="text-body-sm rounded-[var(--radius-md)] bg-[var(--color-status-danger-bg)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[var(--color-status-danger-text)]">
          {error}
        </p>
      )}

      {isEnabled ? (
        <>
          <div className="flex items-center gap-[var(--spacing-sm)] rounded-[var(--radius-md)] bg-[var(--color-status-success-bg)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[var(--color-status-success-text)]">
            <ShieldCheck size={18} aria-hidden />
            <span className="text-body-sm font-medium">{t("enabledTitle")}</span>
          </div>
          {recoveryCodes && <RecoveryCodes codes={recoveryCodes} note={t("recoveryNote")} />}
          <div className="flex flex-col gap-[var(--spacing-sm)] rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[var(--spacing-lg)]">
            <h2 className="text-h4 text-[var(--color-text-heading)]">{t("manageTitle")}</h2>
            <FormField htmlFor="reauth-pass" label={t("password")}>
              <Input id="reauth-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </FormField>
            <div className="flex flex-wrap gap-[var(--spacing-sm)]">
              <Button type="button" variant="secondary" onClick={regenerate} disabled={isPending || !password}>{t("regenerate")}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={disable}
                disabled={isPending || !password}
                className="!border-[var(--color-status-danger-text)] !text-[var(--color-status-danger-text)]"
              >
                {t("disable")}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-[var(--spacing-sm)] rounded-[var(--radius-md)] bg-[var(--color-bg-brand-tint)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[var(--color-text-body)]">
            <ShieldAlert size={18} aria-hidden />
            <span className="text-body-sm">{t("mandatoryNotice")}</span>
          </div>

          {!enroll ? (
            <Button type="button" onClick={begin} disabled={isPending}>{t("activate")}</Button>
          ) : (
            <div className="flex flex-col gap-[var(--spacing-md)] rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[var(--spacing-lg)]">
              <p className="text-body-sm text-[var(--color-text-body)]">{t("scanInstruction")}</p>
              <img src={enroll.qr} alt={t("qrAlt")} width={180} height={180} className="rounded-[var(--radius-md)]" />
              <p className="text-caption text-[var(--color-text-muted)]">{t("manualEntry")}</p>
              <code data-testid="totp-secret" className="text-body-sm break-all rounded-[var(--radius-sm)] bg-[var(--color-bg-subtle)] p-[var(--spacing-sm)] text-[var(--color-text-heading)]">{enroll.secret}</code>
              <FormField htmlFor="confirm-code" label={t("confirmLabel")}>
                <Input id="confirm-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoComplete="one-time-code" />
              </FormField>
              <Button type="button" onClick={confirm} disabled={isPending || code.length !== 6}>{isPending ? t("confirming") : t("confirmButton")}</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
