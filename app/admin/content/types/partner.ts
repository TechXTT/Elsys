import { z } from "zod";
import { registerContentType } from "../registry";
import { STATUS_OPTIONS } from "@/lib/content/shared";

registerContentType({
  type: "partner",
  modelName: "Partner",
  labelSingular: "Партньор",
  labelPlural: "Партньори",
  titleField: "name",
  slugPrefix: "/partnyori/",
  colorField: "color",
  statusField: "status",
  imageFolder: "partners",
  fields: [
    {
      name: "locale", type: "select", label: "Език", required: true,
      options: [{ value: "bg", label: "Български" }, { value: "en", label: "English" }],
    },
    { name: "name", type: "text", label: "Име", required: true },
    { name: "slug", type: "slug", label: "URL адрес", required: true },
    { name: "logo", type: "image", label: "Лого", required: true },
    { name: "url", type: "text", label: "Уебсайт", placeholder: "https://…" },
    { name: "category", type: "text", label: "Категория", placeholder: "напр. Университети" },
    { name: "color", type: "colortag", label: "Цвят (ColorTag)", required: true },
    { name: "status", type: "select", label: "Статус", required: true, options: STATUS_OPTIONS },
    { name: "order", type: "number", label: "Поредност" },
    { name: "publishAt", type: "date", label: "Публикувай на" },
  ],
  columns: [
    { key: "name", label: "Име", sortable: true },
    { key: "category", label: "Категория", sortable: true },
    { key: "status", label: "Статус", sortable: true },
  ],
  searchFields: ["name", "category"],
  defaultSort: "order",
  schema: z.object({
    locale: z.string().min(2, "Изберете език."),
    slug: z.string().min(2, "Slug трябва да е поне 2 символа.")
      .regex(/^[a-z0-9-]+$/, "Slug може да съдържа само малки букви, цифри и тирета."),
    name: z.string().min(2, "Името трябва да е поне 2 символа."),
    logo: z.string().min(1, "Изберете лого."),
    url: z.string().url("Въведете валиден URL.").optional().or(z.literal("")),
    category: z.string().optional(),
    color: z.enum(["RED", "ORANGE", "YELLOW", "GREEN", "TEAL", "BLUE", "INDIGO", "PURPLE", "PINK", "GRAY"]).default("BLUE"),
    status: z.enum(["PUBLISHED", "DRAFT", "PREVIEW", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
    order: z.coerce.number().int().default(0),
    publishAt: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  }),
});
