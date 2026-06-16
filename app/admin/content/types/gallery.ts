import { z } from "zod";
import { registerContentType } from "../registry";
import { STATUS_OPTIONS } from "@/lib/content/shared";

const albumOptions = [
  { value: "sabitiya", label: "Събития" },
  { value: "olimpiadi", label: "Олимпиади" },
  { value: "ezhednevie", label: "Ежедневие" },
  { value: "abiturienti", label: "Абитуриенти" },
];

registerContentType({
  type: "gallery",
  modelName: "GalleryItem",
  labelSingular: "Снимка",
  labelPlural: "Галерии",
  titleField: "title",
  slugPrefix: "/galeria/",
  colorField: "color",
  statusField: "status",
  imageFolder: "galleries",
  fields: [
    {
      name: "locale", type: "select", label: "Език", required: true,
      options: [{ value: "bg", label: "Български" }, { value: "en", label: "English" }],
    },
    { name: "title", type: "text", label: "Заглавие / описание", required: true },
    { name: "slug", type: "slug", label: "URL адрес", required: true },
    { name: "imageUrl", type: "image", label: "Снимка", required: true },
    { name: "alt", type: "text", label: "Алт-текст", helpText: "Кратко описание за достъпност (по подразбиране = заглавието)." },
    { name: "album", type: "select", label: "Албум", options: albumOptions },
    { name: "color", type: "colortag", label: "Цвят (ColorTag)", required: true },
    { name: "status", type: "select", label: "Статус", required: true, options: STATUS_OPTIONS },
    { name: "order", type: "number", label: "Поредност" },
    { name: "publishAt", type: "date", label: "Публикувай на" },
  ],
  columns: [
    { key: "title", label: "Заглавие", sortable: true },
    { key: "album", label: "Албум", sortable: true },
    { key: "color", label: "Цвят", sortable: false },
    { key: "status", label: "Статус", sortable: true },
  ],
  searchFields: ["title", "album"],
  defaultSort: "order",
  schema: z.object({
    locale: z.string().min(2, "Изберете език."),
    slug: z.string().min(2, "Slug трябва да е поне 2 символа.")
      .regex(/^[a-z0-9-]+$/, "Slug може да съдържа само малки букви, цифри и тирета."),
    title: z.string().min(2, "Заглавието трябва да е поне 2 символа."),
    imageUrl: z.string().min(1, "Изберете снимка."),
    alt: z.string().optional(),
    album: z.string().optional(),
    color: z.enum(["RED", "ORANGE", "YELLOW", "GREEN", "TEAL", "BLUE", "INDIGO", "PURPLE", "PINK", "GRAY"]).default("BLUE"),
    status: z.enum(["PUBLISHED", "DRAFT", "PREVIEW", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
    order: z.coerce.number().int().default(0),
    publishAt: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  }),
});
