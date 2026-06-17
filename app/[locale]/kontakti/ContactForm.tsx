"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Script from "next/script";

import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Form";
import { contactSchema, type ContactValues } from "@/lib/content/validation";
import { submitContact } from "./actions";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactForm() {
  const t = useTranslations("Contact");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema), mode: "onBlur" });

  const onSubmit = (values: ContactValues) => {
    setStatus(null);
    startTransition(async () => {
      const turnstileToken =
        typeof document !== "undefined"
          ? (document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value
          : undefined;
      const res = await submitContact({ ...values, turnstileToken });
      if (res.ok) {
        setStatus({ kind: "success", text: t("success") });
        reset();
      } else if (res.errors) {
        for (const [field, message] of Object.entries(res.errors)) {
          if (field === "name" || field === "email" || field === "topic" || field === "message") {
            setError(field, { message });
          }
        }
        setStatus({ kind: "error", text: t("errorValidation") });
      } else {
        const key = res.errorKey ?? "send";
        setStatus({ kind: "error", text: t(`error_${key}`) });
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-[var(--spacing-md)] rounded-[var(--radius-lg)] border border-line bg-surface p-[var(--spacing-xl)]"
    >
      <h2 className="text-h3 text-ink-heading">{t("formTitle")}</h2>

      <FormField htmlFor="name" label={t("name")} error={errors.name?.message} required>
        <Input id="name" placeholder={t("namePlaceholder")} invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} {...register("name")} />
      </FormField>

      <FormField htmlFor="email" label={t("email")} error={errors.email?.message} help={t("emailHelp")} required>
        <Input id="email" type="email" placeholder={t("emailPlaceholder")} invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : "email-help"} {...register("email")} />
      </FormField>

      <FormField htmlFor="topic" label={t("topic")} error={errors.topic?.message} required>
        <Select id="topic" defaultValue="" invalid={!!errors.topic} aria-describedby={errors.topic ? "topic-error" : undefined} {...register("topic")}>
          <option value="" disabled>{t("topicPlaceholder")}</option>
          <option value={t("topicGeneral")}>{t("topicGeneral")}</option>
          <option value={t("topicAdmissions")}>{t("topicAdmissions")}</option>
          <option value={t("topicPartnership")}>{t("topicPartnership")}</option>
        </Select>
      </FormField>

      <FormField htmlFor="message" label={t("message")} error={errors.message?.message} required>
        <Textarea id="message" rows={5} placeholder={t("messagePlaceholder")} invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} {...register("message")} />
      </FormField>

      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
        </>
      )}

      <div className="flex items-center gap-[var(--spacing-md)]">
        <Button type="submit" disabled={isPending}>{isPending ? t("sending") : t("submit")}</Button>
        {status && (
          <p
            role={status.kind === "error" ? "alert" : "status"}
            aria-live={status.kind === "error" ? "assertive" : "polite"}
            className={status.kind === "success" ? "text-body-sm text-status-success-text" : "text-body-sm text-status-danger-text"}
          >
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}
