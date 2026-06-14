import type { ZodError } from "zod";
import { z, ZodIssueCode } from "zod";

const MESSAGES: Partial<Record<typeof ZodIssueCode[keyof typeof ZodIssueCode], string>> = {
  too_small: "Стойността е твърде малка или кратка.",
  too_big: "Стойността е твърде голяма или дълга.",
  invalid_type: "Невалидна стойност.",
  invalid_format: "Невалиден формат.",
  invalid_union: "Невалидна стойност.",
  invalid_value: "Невалидна опция.",
  custom: "Грешка при валидация.",
};

export function formatZodErrors(err: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!result[path]) {
      result[path] = MESSAGES[issue.code] ?? issue.message;
    }
  }
  return result;
}

export function requiredString(label: string) {
  return `${label} е задължително.`;
}

/** Friendly Bulgarian field messages, reused by forms (the /ui-preview demo). */
export const bgMessages = {
  required: "Това поле е задължително.",
  email: "Въведете валиден имейл адрес.",
  min: (n: number) => `Минимум ${n} символа.`,
  max: (n: number) => `Максимум ${n} символа.`,
  select: "Изберете опция.",
};

/** Example schema powering the /ui-preview FormField demo (React Hook Form + Zod). */
export const contactSchema = z.object({
  name: z.string().min(2, bgMessages.min(2)).max(80, bgMessages.max(80)),
  email: z.string().min(1, bgMessages.required).email(bgMessages.email),
  topic: z.string().min(1, bgMessages.select),
  message: z.string().min(10, bgMessages.min(10)).max(1000, bgMessages.max(1000)),
});

export type ContactValues = z.infer<typeof contactSchema>;
