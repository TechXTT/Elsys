import { z } from "zod";
import { registerContentType } from "../registry";

const statusOptions = [
  { value: "PUBLISHED", label: "Публикувано" },
  { value: "DRAFT", label: "Чернова" },
  { value: "PREVIEW", label: "Преглед" },
  { value: "SCHEDULED", label: "Насрочено" },
  { value: "ARCHIVED", label: "Архивирано" },
];

const colorOptions = [
  { value: "RED", label: "Червено" },
  { value: "ORANGE", label: "Оранжево" },
  { value: "YELLOW", label: "Жълто" },
  { value: "GREEN", label: "Зелено" },
  { value: "TEAL", label: "Тюркоазено" },
  { value: "BLUE", label: "Синьо" },
  { value: "INDIGO", label: "Индиго" },
  { value: "PURPLE", label: "Лилаво" },
  { value: "PINK", label: "Розово" },
  { value: "GRAY", label: "Сиво" },
];

registerContentType({
  type: "club",
  modelName: "Club",
  labelSingular: "Клуб",
  labelPlural: "Клубове",
  fields: [
    {
      name: "locale",
      type: "select",
      label: "Език",
      required: true,
      options: [
        { value: "bg", label: "Български" },
        { value: "en", label: "English" },
      ],
    },
    { name: "slug", type: "text", label: "URL адрес (slug)", required: true },
    { name: "title", type: "text", label: "Заглавие", required: true },
    { name: "description", type: "text", label: "Кратко описание" },
    {
      name: "color",
      type: "select",
      label: "Цвят",
      required: true,
      options: colorOptions,
    },
    { name: "coverImage", type: "image", label: "Корица" },
    { name: "meetingSchedule", type: "text", label: "График на срещи" },
    { name: "contactEmail", type: "text", label: "Имейл за контакт" },
    {
      name: "status",
      type: "select",
      label: "Статус",
      required: true,
      options: statusOptions,
    },
    { name: "order", type: "number", label: "Поредност" },
    { name: "publishAt", type: "date", label: "Публикувай на" },
  ],
  columns: [
    { key: "title", label: "Заглавие", sortable: true },
    { key: "locale", label: "Език", sortable: true },
    { key: "color", label: "Цвят", sortable: false },
    { key: "status", label: "Статус", sortable: true },
    { key: "order", label: "Ред", sortable: true },
  ],
  searchFields: ["title", "description"],
  defaultSort: "order",
  schema: z.object({
    locale: z.string().min(2, "Изберете език."),
    slug: z
      .string()
      .min(2, "Slug трябва да е поне 2 символа.")
      .regex(/^[a-z0-9-]+$/, "Slug може да съдържа само малки букви, цифри и тирета."),
    title: z.string().min(2, "Заглавието трябва да е поне 2 символа."),
    description: z.string().optional(),
    color: z
      .enum(["RED", "ORANGE", "YELLOW", "GREEN", "TEAL", "BLUE", "INDIGO", "PURPLE", "PINK", "GRAY"])
      .default("BLUE"),
    coverImage: z.string().url("Въведете валиден URL за изображение.").optional().or(z.literal("")),
    meetingSchedule: z.string().optional(),
    contactEmail: z
      .string()
      .email("Въведете валиден имейл адрес.")
      .optional()
      .or(z.literal("")),
    status: z
      .enum(["PUBLISHED", "DRAFT", "PREVIEW", "SCHEDULED", "ARCHIVED"])
      .default("DRAFT"),
    order: z.coerce.number().int().default(0),
    publishAt: z
      .string()
      .optional()
      .transform((v) => (v ? new Date(v) : undefined)),
  }),
});
