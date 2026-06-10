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

export type ContentRecord = Record<string, unknown> & { id: string };
