import { z } from "zod";
import { registerContentType } from "../registry";
import { STATUS_OPTIONS } from "@/lib/content/shared";

registerContentType({
  type: "team",
  modelName: "TeamMember",
  labelSingular: "Член на екипа",
  labelPlural: "Екип",
  titleField: "name",
  slugPrefix: "/ekip/",
  colorField: "color",
  statusField: "status",
  imageFolder: "team",
  fields: [
    {
      name: "locale", type: "select", label: "Език", required: true,
      options: [{ value: "bg", label: "Български" }, { value: "en", label: "English" }],
    },
    { name: "name", type: "text", label: "Име", required: true },
    { name: "slug", type: "slug", label: "URL адрес", required: true },
    { name: "role", type: "text", label: "Длъжност", placeholder: "напр. Директор" },
    { name: "category", type: "text", label: "Категория", placeholder: "напр. Ръководство" },
    { name: "email", type: "text", label: "Имейл" },
    { name: "photo", type: "image", label: "Снимка" },
    { name: "color", type: "colortag", label: "Цвят (ColorTag)", required: true },
    { name: "status", type: "select", label: "Статус", required: true, options: STATUS_OPTIONS },
    { name: "order", type: "number", label: "Поредност" },
    { name: "publishAt", type: "date", label: "Публикувай на" },
  ],
  columns: [
    { key: "name", label: "Име", sortable: true },
    { key: "role", label: "Длъжност", sortable: true },
    { key: "category", label: "Категория", sortable: true },
    { key: "status", label: "Статус", sortable: true },
  ],
  searchFields: ["name", "role", "category"],
  defaultSort: "order",
  schema: z.object({
    locale: z.string().min(2, "Изберете език."),
    slug: z.string().min(2, "Slug трябва да е поне 2 символа.")
      .regex(/^[a-z0-9-]+$/, "Slug може да съдържа само малки букви, цифри и тирета."),
    name: z.string().min(2, "Името трябва да е поне 2 символа."),
    role: z.string().optional(),
    category: z.string().optional(),
    email: z.string().email("Въведете валиден имейл адрес.").optional().or(z.literal("")),
    photo: z.string().optional().or(z.literal("")),
    color: z.enum(["RED", "ORANGE", "YELLOW", "GREEN", "TEAL", "BLUE", "INDIGO", "PURPLE", "PINK", "GRAY"]).default("BLUE"),
    status: z.enum(["PUBLISHED", "DRAFT", "PREVIEW", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
    order: z.coerce.number().int().default(0),
    publishAt: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  }),
});
