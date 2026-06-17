import { z } from "zod";
import { registerContentType } from "../registry";
import { STATUS_OPTIONS } from "@/lib/content/shared";

// Help runbooks (G5-2) editable via the content framework. Single-locale (admin
// is BG-default); seeded as DRAFTs for the school to refine.
registerContentType({
  type: "help",
  modelName: "HelpArticle",
  labelSingular: "Ръководство",
  labelPlural: "Помощни статии",
  titleField: "title",
  slugPrefix: "/admin/help/",
  statusField: "status",
  enableSuccessorNote: false,
  fields: [
    { name: "title", type: "text", label: "Заглавие", required: true },
    { name: "slug", type: "slug", label: "URL адрес", required: true },
    { name: "summary", type: "text", label: "Кратко описание" },
    { name: "icon", type: "text", label: "Икона (lucide / емоджи)" },
    { name: "body", type: "richtext", label: "Съдържание (Markdown)", required: true },
    { name: "order", type: "number", label: "Поредност" },
    { name: "status", type: "select", label: "Статус", required: true, options: STATUS_OPTIONS },
  ],
  columns: [
    { key: "title", label: "Заглавие", sortable: true },
    { key: "status", label: "Статус", sortable: true },
  ],
  searchFields: ["title", "summary"],
  defaultSort: "order",
  schema: z.object({
    title: z.string().min(2, "Заглавието трябва да е поне 2 символа."),
    slug: z.string().min(2, "Slug трябва да е поне 2 символа.").regex(/^[a-z0-9-]+$/, "Само малки букви, цифри и тирета."),
    summary: z.string().optional(),
    icon: z.string().optional(),
    body: z.string().min(1, "Съдържанието е задължително."),
    order: z.coerce.number().int().default(0),
    status: z.enum(["PUBLISHED", "DRAFT", "PREVIEW", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
  }),
});
