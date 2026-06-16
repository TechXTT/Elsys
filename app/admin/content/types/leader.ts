import { z } from "zod";
import { registerContentType } from "../registry";
import { STATUS_OPTIONS } from "@/lib/content/shared";

registerContentType({
  type: "leader",
  modelName: "Leader",
  labelSingular: "Випускник",
  labelPlural: "Випуски",
  titleField: "name",
  slugPrefix: "/vipuski/",
  colorField: "color",
  statusField: "status",
  imageFolder: "general",
  fields: [
    {
      name: "locale", type: "select", label: "Език", required: true,
      options: [{ value: "bg", label: "Български" }, { value: "en", label: "English" }],
    },
    { name: "name", type: "text", label: "Име", required: true },
    { name: "slug", type: "slug", label: "URL адрес", required: true },
    { name: "year", type: "number", label: "Випуск (година)", required: true },
    { name: "role", type: "text", label: "Постижение / роля", placeholder: "напр. Съосновател на стартъп" },
    { name: "description", type: "textarea", label: "Описание" },
    { name: "image", type: "image", label: "Снимка" },
    { name: "color", type: "colortag", label: "Цвят (ColorTag)", required: true },
    { name: "status", type: "select", label: "Статус", required: true, options: STATUS_OPTIONS },
    { name: "order", type: "number", label: "Поредност" },
    { name: "publishAt", type: "date", label: "Публикувай на" },
  ],
  columns: [
    { key: "name", label: "Име", sortable: true },
    { key: "year", label: "Випуск", sortable: true },
    { key: "status", label: "Статус", sortable: true },
  ],
  searchFields: ["name", "role", "description"],
  defaultSort: "year",
  schema: z.object({
    locale: z.string().min(2, "Изберете език."),
    slug: z.string().min(2, "Slug трябва да е поне 2 символа.")
      .regex(/^[a-z0-9-]+$/, "Slug може да съдържа само малки букви, цифри и тирета."),
    name: z.string().min(2, "Името трябва да е поне 2 символа."),
    year: z.coerce.number().int().min(1900, "Въведете валидна година.").max(2100, "Въведете валидна година."),
    role: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional().or(z.literal("")),
    color: z.enum(["RED", "ORANGE", "YELLOW", "GREEN", "TEAL", "BLUE", "INDIGO", "PURPLE", "PINK", "GRAY"]).default("BLUE"),
    status: z.enum(["PUBLISHED", "DRAFT", "PREVIEW", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
    order: z.coerce.number().int().default(0),
    publishAt: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  }),
});
