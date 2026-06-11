import type { ZodError } from "zod";
import { ZodIssueCode } from "zod";

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
