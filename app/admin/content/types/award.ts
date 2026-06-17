import { z } from "zod";
import { registerContentType } from "../registry";
import { STATUS_OPTIONS } from "@/lib/content/shared";

registerContentType({
  type: "award",
  modelName: "Award",
  labelSingular: "Награда",
  labelPlural: "Награди",
  titleField: "title",
  slugPrefix: "/nagradi/",
  colorField: "color",
  statusField: "status",
  imageFolder: "general",
  fields: [
    {
      name: "locale", type: "select", label: "Език", required: true,
      options: [{ value: "bg", label: "Български" }, { value: "en", label: "English" }],
    },
    { name: "title", type: "text", label: "Заглавие", required: true },
    { name: "slug", type: "slug", label: "URL адрес", required: true },
    { name: "year", type: "number", label: "Година", required: true },
    { name: "description", type: "textarea", label: "Описание" },
    { name: "image", type: "image", label: "Изображение" },
    { name: "category", type: "text", label: "Категория", placeholder: "напр. Олимпиади" },
    { name: "color", type: "colortag", label: "Цвят (ColorTag)", required: true },
    { name: "status", type: "select", label: "Статус", required: true, options: STATUS_OPTIONS },
    { name: "order", type: "number", label: "Поредност" },
    { name: "publishAt", type: "date", label: "Публикувай на" },
  ],
  columns: [
    { key: "title", label: "Заглавие", sortable: true },
    { key: "year", label: "Година", sortable: true },
    { key: "status", label: "Статус", sortable: true },
  ],
  searchFields: ["title", "description", "category"],
  defaultSort: "year",
  schema: z.object({
    locale: z.string().min(2, "Изберете език."),
    slug: z.string().min(2, "Slug трябва да е поне 2 символа.")
      .regex(/^[a-z0-9-]+$/, "Slug може да съдържа само малки букви, цифри и тирета."),
    title: z.string().min(2, "Заглавието трябва да е поне 2 символа."),
    year: z.coerce.number().int().min(1900, "Въведете валидна година.").max(2100, "Въведете валидна година."),
    description: z.string().optional(),
    image: z.string().optional().or(z.literal("")),
    category: z.string().optional(),
    color: z.enum(["RED", "ORANGE", "YELLOW", "GREEN", "TEAL", "BLUE", "INDIGO", "PURPLE", "PINK", "GRAY"]).default("BLUE"),
    status: z.enum(["PUBLISHED", "DRAFT", "PREVIEW", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
    order: z.coerce.number().int().default(0),
    publishAt: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  }),
});
