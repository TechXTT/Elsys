import { z } from "zod";
import { registerContentType } from "../registry";
import { STATUS_OPTIONS } from "@/lib/content/shared";

const fileTypeOptions = [
  { value: "PDF", label: "PDF" },
  { value: "DOC", label: "Word (DOC/DOCX)" },
  { value: "XLS", label: "Excel (XLS/XLSX)" },
  { value: "PPT", label: "PowerPoint (PPT/PPTX)" },
  { value: "ZIP", label: "Архив (ZIP)" },
  { value: "OTHER", label: "Друг" },
];

registerContentType({
  type: "document",
  modelName: "Document",
  labelSingular: "Документ",
  labelPlural: "Документи",
  titleField: "title",
  slugPrefix: "/dokumenti/",
  colorField: "color",
  statusField: "status",
  fields: [
    {
      name: "locale", type: "select", label: "Език", required: true,
      options: [{ value: "bg", label: "Български" }, { value: "en", label: "English" }],
    },
    { name: "title", type: "text", label: "Заглавие", required: true },
    { name: "slug", type: "slug", label: "URL адрес", required: true },
    { name: "description", type: "textarea", label: "Описание" },
    { name: "category", type: "text", label: "Категория", placeholder: "напр. Правилници" },
    { name: "fileUrl", type: "text", label: "Файл (URL)", required: true, placeholder: "https://… или /files/…", helpText: "Качете файла в Медийната библиотека (папка „Документи“) и поставете адреса тук." },
    { name: "fileType", type: "select", label: "Тип файл", options: fileTypeOptions },
    { name: "fileSize", type: "text", label: "Размер", placeholder: "напр. 1.4 MB" },
    { name: "color", type: "colortag", label: "Цвят (ColorTag)", required: true },
    { name: "status", type: "select", label: "Статус", required: true, options: STATUS_OPTIONS },
    { name: "order", type: "number", label: "Поредност" },
    { name: "publishAt", type: "date", label: "Публикувай на" },
  ],
  columns: [
    { key: "title", label: "Заглавие", sortable: true },
    { key: "category", label: "Категория", sortable: true },
    { key: "color", label: "Цвят", sortable: false },
    { key: "status", label: "Статус", sortable: true },
  ],
  searchFields: ["title", "description", "category"],
  defaultSort: "order",
  schema: z.object({
    locale: z.string().min(2, "Изберете език."),
    slug: z
      .string()
      .min(2, "Slug трябва да е поне 2 символа.")
      .regex(/^[a-z0-9-]+$/, "Slug може да съдържа само малки букви, цифри и тирета."),
    title: z.string().min(2, "Заглавието трябва да е поне 2 символа."),
    description: z.string().optional(),
    category: z.string().optional(),
    fileUrl: z.string().min(1, "Посочете адрес на файла."),
    fileType: z.string().optional(),
    fileSize: z.string().optional(),
    color: z
      .enum(["RED", "ORANGE", "YELLOW", "GREEN", "TEAL", "BLUE", "INDIGO", "PURPLE", "PINK", "GRAY"])
      .default("BLUE"),
    status: z.enum(["PUBLISHED", "DRAFT", "PREVIEW", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
    order: z.coerce.number().int().default(0),
    publishAt: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  }),
});
