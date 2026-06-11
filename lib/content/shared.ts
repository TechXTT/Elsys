import type { z } from "zod";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "date"
  | "image"
  | "slug"
  | "richtext";

export type FieldConfig = {
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  dependsOn?: string;
  rows?: number;
  helpText?: string;
  hidden?: boolean;
};

export type ColumnConfig = {
  key: string;
  label: string;
  sortable?: boolean;
};

export type ContentTypeConfig = {
  type: string;
  modelName: string;
  labelSingular: string;
  labelPlural: string;
  icon?: string;
  fields: FieldConfig[];
  columns: ColumnConfig[];
  searchFields?: string[];
  defaultSort?: string;
  schema: z.ZodTypeAny;
};

// Client-safe projection of a content type: everything except the Zod `schema`,
// which is a class instance and cannot cross the Server -> Client component
// boundary (RSC serialization). The form never needs the schema — validation
// runs server-side in the Server Action via getContentType(type).schema.
export type ClientContentTypeConfig = Omit<ContentTypeConfig, "schema">;

export type ContentRecord = Record<string, unknown> & { id: string };

// --- Publication state (R3) ---------------------------------------------------
// Local string union mirroring the Prisma `PublishStatus` enum. Declared here
// (not imported from @prisma/client) so this module stays client-safe — it is
// imported by client components.
export type PublishStatus = "DRAFT" | "PREVIEW" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";

export const PUBLIC_STATUS = "PUBLISHED" as const;

/**
 * The single source of truth for "is this row publicly visible right now".
 * A row is public iff its status is PUBLISHED and — for date-bearing rows like
 * NewsPost — its date is not in the future (scheduling stays encoded as a future
 * `date`; we do not reinterpret it as SCHEDULED yet).
 */
export function isPublic(
  row: { status?: PublishStatus | string | null; date?: Date | string | null },
  now: Date = new Date()
): boolean {
  if (row.status !== PUBLIC_STATUS) return false;
  if (row.date != null && new Date(row.date) > now) return false;
  return true;
}

/**
 * Prisma `where` fragment for public reads. Pass `gateDate: true` for models
 * with a publish `date` (NewsPost) to also require `date <= now`.
 */
export function publicWhere(opts?: { gateDate?: boolean; now?: Date }): {
  status: typeof PUBLIC_STATUS;
  date?: { lte: Date };
} {
  const where: { status: typeof PUBLIC_STATUS; date?: { lte: Date } } = { status: PUBLIC_STATUS };
  if (opts?.gateDate) where.date = { lte: opts.now ?? new Date() };
  return where;
}

/**
 * Boolean → status mapping for the dual-write transition (R3). Page/NewsPost
 * keep their `published` boolean and write this alongside it on every mutation.
 * Future-dated PUBLISHED news stays scheduled via its date (see isPublic).
 */
export function statusFromPublished(published: boolean): PublishStatus {
  return published ? "PUBLISHED" : "DRAFT";
}
