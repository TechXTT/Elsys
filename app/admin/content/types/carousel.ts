import { z } from "zod";
import { registerContentType } from "../registry";

registerContentType({
  type: "carousel",
  modelName: "Carousel",
  labelSingular: "Слайд",
  labelPlural: "Карусел",
  fields: [
    { name: "locale", type: "select", label: "Език", required: true, options: [{ value: "bg", label: "Български" }, { value: "en", label: "English" }] },
    { name: "title", type: "text", label: "Заглавие", required: true, placeholder: "Заглавие на слайда" },
    { name: "subtitle", type: "text", label: "Подзаглавие", placeholder: "Допълнителен текст (незадължително)" },
    { name: "imageDesktop", type: "image", label: "Снимка (десктоп)", required: true, placeholder: "URL на изображение за десктоп" },
    { name: "imageTablet", type: "image", label: "Снимка (таблет)", placeholder: "URL на изображение за таблет" },
    { name: "imagePhone", type: "image", label: "Снимка (телефон)", placeholder: "URL на изображение за телефон" },
    { name: "linkUrl", type: "text", label: "URL на връзката", placeholder: "/bg/priem или https://..." },
    { name: "linkLabel", type: "text", label: "Текст на бутона", placeholder: "Прочети повече" },
    { name: "status", type: "select", label: "Статус", required: true, options: [
      { value: "PUBLISHED", label: "Публикувано" },
      { value: "DRAFT", label: "Чернова" },
      { value: "SCHEDULED", label: "Насрочено" },
      { value: "ARCHIVED", label: "Архивирано" },
    ]},
    { name: "order", type: "number", label: "Поредност", placeholder: "0 = пръв" },
    { name: "publishAt", type: "date", label: "Публикувай на", helpText: "Оставете празно за незабавно публикуване" },
  ],
  columns: [
    { key: "title", label: "Заглавие", sortable: true },
    { key: "locale", label: "Език", sortable: true },
    { key: "status", label: "Статус", sortable: true },
    { key: "order", label: "Ред", sortable: true },
  ],
  searchFields: ["title", "subtitle"],
  defaultSort: "order",
  schema: z.object({
    locale: z.string().min(2),
    title: z.string().min(2, "Заглавието трябва да е поне 2 символа."),
    subtitle: z.string().optional(),
    imageDesktop: z.string().url("Въведете валиден URL за изображение."),
    imageTablet: z.string().url("Въведете валиден URL.").optional().or(z.literal("")),
    imagePhone: z.string().url("Въведете валиден URL.").optional().or(z.literal("")),
    linkUrl: z.string().optional().or(z.literal("")),
    linkLabel: z.string().optional().or(z.literal("")),
    status: z.enum(["PUBLISHED", "DRAFT", "PREVIEW", "SCHEDULED", "ARCHIVED"]),
    order: z.coerce.number().int().default(0),
    publishAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  }),
});
