"use client";

import { useLocale, useTranslations } from "next-intl";

// English block-meta display string -> Bulgarian. Kept as a PLAIN module map
// (NOT in next-intl messages): the keys are English sentences with dots
// ("Enter heading..."), which next-intl would treat as nested paths and reject
// with INVALID_KEY. The block type/field/option identifiers are never touched.
const BLOCK_DICT: Record<string, string> = {
  "Heading": "Заглавие",
  "Section heading (H2 or H3)": "Секционно заглавие (H2 или H3)",
  "Paragraph": "Параграф",
  "Rich text paragraph with formatting": "Форматиран текстов параграф",
  "Quote": "Цитат",
  "Highlighted quote or callout": "Откроен цитат или акцент",
  "List": "Списък",
  "Bulleted or numbered list": "Списък с водачи или номериран",
  "Callout": "Акцент",
  "Important notice or tip": "Важна забележка или съвет",
  "Code Block": "Блок с код",
  "Formatted code snippet": "Форматиран фрагмент код",
  "Image": "Изображение",
  "Single image with caption": "Единично изображение с надпис",
  "Image Gallery": "Галерия",
  "Multiple images in a grid": "Няколко изображения в мрежа",
  "Divider": "Разделител",
  "Horizontal line separator": "Хоризонтална разделителна линия",
  "Table": "Таблица",
  "Simple data table": "Проста таблица с данни",
  "Video Embed": "Вградено видео",
  "YouTube or Vimeo video": "Видео от YouTube или Vimeo",
  "Link Card": "Карта с връзка",
  "Styled external link": "Стилизирана външна връзка",
  "Heading Text": "Текст на заглавието",
  "Level": "Ниво",
  "Content": "Съдържание",
  "Quote Text": "Текст на цитата",
  "Author (optional)": "Автор (по избор)",
  "Style": "Стил",
  "List Style": "Вид списък",
  "Items": "Елементи",
  "Item": "Елемент",
  "Type": "Тип",
  "Title (optional)": "Заглавие (по избор)",
  "Language": "Език",
  "Code": "Код",
  "Filename (optional)": "Име на файл (по избор)",
  "Alt Text": "Алтернативен текст",
  "Caption (optional)": "Надпис (по избор)",
  "Size": "Размер",
  "Caption": "Надпис",
  "Columns": "Колони",
  "Images": "Изображения",
  "Spacing": "Отстъп",
  "Headers": "Заглавки",
  "Header": "Заглавка",
  "Rows": "Редове",
  "Cells": "Клетки",
  "Cell": "Клетка",
  "Video URL": "URL на видео",
  "URL": "URL",
  "Title": "Заглавие",
  "Description": "Описание",
  "Enter heading...": "Въведете заглавие…",
  "Write your content here...": "Напишете съдържанието тук…",
  "Enter quote...": "Въведете цитат…",
  "Who said this?": "Кой го е казал?",
  "Callout title": "Заглавие на акцента",
  "// Enter your code here": "// Въведете кода тук",
  "Describe the image...": "Опишете изображението…",
  "Image caption": "Надпис на изображението",
  "Heading 2 (Large)": "Заглавие 2 (голямо)",
  "Heading 3 (Medium)": "Заглавие 3 (средно)",
  "Default": "Стандартен",
  "Highlighted": "Откроен",
  "Bordered": "С рамка",
  "Bullet Points": "С водачи",
  "Numbered": "Номериран",
  "Checklist": "Чеклист",
  "Info": "Информация",
  "Warning": "Предупреждение",
  "Success": "Успех",
  "Tip": "Съвет",
  "Plain Text": "Обикновен текст",
  "Small": "Малък",
  "Medium": "Среден",
  "Large": "Голям",
  "Full Width": "Цяла ширина",
  "2 Columns": "2 колони",
  "3 Columns": "3 колони",
  "4 Columns": "4 колони",
  "Solid Line": "Плътна линия",
  "Dashed": "Прекъсната",
  "Dotted": "Пунктир",
  "Thick Line": "Дебела линия",
};

/**
 * i18n for the advanced news block editor. `t` resolves chrome strings under the
 * Admin.newsEditor namespace; `tr` translates a block-meta DISPLAY string via
 * BLOCK_DICT in Bulgarian, falling back to the English config string (and EN
 * renders the config strings as-is). Block `type` ids, field `name`s, and option
 * `value`s are NEVER passed through here.
 */
export function useBlockI18n() {
  const t = useTranslations("Admin.newsEditor");
  const locale = useLocale();
  const tr = (s?: string | null) => {
    if (s == null) return "";
    return locale.startsWith("bg") ? (BLOCK_DICT[s] ?? s) : s;
  };
  const category = (c: string) => t(`categories.${c}`);
  return { t, tr, category };
}
