"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Form";
import { contactSchema, type ContactValues } from "@/lib/content/validation";

/**
 * Demonstrates the form primitives wired to React Hook Form + Zod with friendly
 * Bulgarian messages. Submitting empty surfaces the error states (colour + text
 * + aria-live). Catalog copy is literal (dev tool, exempt from next-intl).
 */
export function FormDemo() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema), mode: "onTouched" });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(() => {})}
      className="flex w-full max-w-md flex-col gap-[var(--spacing-md)]"
    >
      <FormField htmlFor="demo-name" label="Име" error={errors.name?.message} required>
        <Input
          id="demo-name"
          invalid={!!errors.name}
          aria-describedby={errors.name ? "demo-name-error" : undefined}
          {...register("name")}
        />
      </FormField>

      <FormField htmlFor="demo-email" label="Имейл" error={errors.email?.message} required>
        <Input
          id="demo-email"
          type="email"
          invalid={!!errors.email}
          aria-describedby={errors.email ? "demo-email-error" : undefined}
          {...register("email")}
        />
      </FormField>

      <FormField htmlFor="demo-topic" label="Тема" error={errors.topic?.message} required>
        <Select
          id="demo-topic"
          defaultValue=""
          invalid={!!errors.topic}
          aria-describedby={errors.topic ? "demo-topic-error" : undefined}
          {...register("topic")}
        >
          <option value="" disabled>
            Изберете…
          </option>
          <option value="admissions">Прием</option>
          <option value="general">Общ въпрос</option>
        </Select>
      </FormField>

      <FormField
        htmlFor="demo-message"
        label="Съобщение"
        error={errors.message?.message}
        help="Поне 10 символа."
      >
        <Textarea
          id="demo-message"
          invalid={!!errors.message}
          aria-describedby={errors.message ? "demo-message-error" : "demo-message-help"}
          {...register("message")}
        />
      </FormField>

      <Button type="submit">Изпрати</Button>
    </form>
  );
}
