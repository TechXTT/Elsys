import {
  Type,
  Image,
  Heading1,
  Heading2,
  AlignLeft,
  Quote,
  List,
  Minus,
  GalleryHorizontal,
  Play,
  Link,
  AlertCircle,
  Code,
  Table,
} from "lucide-react";
import type { NewsBlockMeta, NewsBlockCategory } from "./types";

// Category metadata
export const newsBlockCategories: Record<
  NewsBlockCategory,
  { label: string; icon: typeof Type }
> = {
  text: { label: "Text", icon: Type },
  media: { label: "Media", icon: Image },
  layout: { label: "Layout", icon: Minus },
  embed: { label: "Embed", icon: Play },
};

// News-specific block definitions
export const newsBlockMeta: NewsBlockMeta[] = [
  // Text blocks
  {
    type: "Heading",
    label: "Heading",
    description: "Section heading (H2 or H3)",
    icon: "Heading1",
    category: "text",
    fields: [
      {
        name: "text",
        label: "Heading Text",
        type: "text",
        required: true,
        placeholder: "Enter heading...",
      },
      {
        name: "level",
        label: "Level",
        type: "select",
        options: [
          { value: "h2", label: "Heading 2 (Large)" },
          { value: "h3", label: "Heading 3 (Medium)" },
        ],
      },
    ],
    defaultProps: {
      text: "Section Heading",
      level: "h2",
    },
  },
  {
    type: "Paragraph",
    label: "Paragraph",
    description: "Rich text paragraph with formatting",
    icon: "AlignLeft",
    category: "text",
    fields: [
      {
        name: "content",
        label: "Content",
        type: "richtext",
        required: true,
        placeholder: "Write your content here...",
      },
    ],
    defaultProps: {
      content: "",
    },
  },
  {
    type: "Quote",
    label: "Quote",
    description: "Highlighted quote or callout",
    icon: "Quote",
    category: "text",
    fields: [
      {
        name: "text",
        label: "Quote Text",
        type: "textarea",
        required: true,
        placeholder: "Enter quote...",
      },
      {
        name: "author",
        label: "Author (optional)",
        type: "text",
        placeholder: "Who said this?",
      },
      {
        name: "style",
        label: "Style",
        type: "select",
        options: [
          { value: "default", label: "Default" },
          { value: "highlighted", label: "Highlighted" },
          { value: "bordered", label: "Bordered" },
        ],
      },
    ],
    defaultProps: {
      text: "",
      author: "",
      style: "default",
    },
  },
  {
    type: "List",
    label: "List",
    description: "Bulleted or numbered list",
    icon: "List",
    category: "text",
    fields: [
      {
        name: "style",
        label: "List Style",
        type: "select",
        options: [
          { value: "bullet", label: "Bullet Points" },
          { value: "numbered", label: "Numbered" },
          { value: "check", label: "Checklist" },
        ],
      },
      {
        name: "items",
        label: "Items",
        type: "array",
        fields: [{ name: "text", label: "Item", type: "text" }],
      },
    ],
    defaultProps: {
      style: "bullet",
      items: [{ text: "First item" }, { text: "Second item" }],
    },
  },
  {
    type: "Callout",
    label: "Callout",
    description: "Important notice or tip",
    icon: "AlertCircle",
    category: "text",
    fields: [
      {
        name: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "info", label: "Info" },
          { value: "warning", label: "Warning" },
          { value: "success", label: "Success" },
          { value: "tip", label: "Tip" },
        ],
      },
      {
        name: "title",
        label: "Title (optional)",
        type: "text",
        placeholder: "Callout title",
      },
      {
        name: "content",
        label: "Content",
        type: "textarea",
        required: true,
      },
    ],
    defaultProps: {
      type: "info",
      title: "",
      content: "",
    },
  },
  {
    type: "Code",
    label: "Code Block",
    description: "Formatted code snippet",
    icon: "Code",
    category: "text",
    fields: [
      {
        name: "language",
        label: "Language",
        type: "select",
        options: [
          { value: "javascript", label: "JavaScript" },
          { value: "typescript", label: "TypeScript" },
          { value: "python", label: "Python" },
          { value: "html", label: "HTML" },
          { value: "css", label: "CSS" },
          { value: "bash", label: "Bash" },
          { value: "json", label: "JSON" },
          { value: "plain", label: "Plain Text" },
        ],
      },
      {
        name: "code",
        label: "Code",
        type: "textarea",
        required: true,
        placeholder: "// Enter your code here",
      },
      {
        name: "filename",
        label: "Filename (optional)",
        type: "text",
        placeholder: "example.js",
      },
    ],
    defaultProps: {
      language: "javascript",
      code: "",
      filename: "",
    },
  },

  // Media blocks
  {
    type: "Image",
    label: "Image",
    description: "Single image with caption",
    icon: "Image",
    category: "media",
    fields: [
      {
        name: "src",
        label: "Image",
        type: "image",
        required: true,
      },
      {
        name: "alt",
        label: "Alt Text",
        type: "text",
        required: true,
        placeholder: "Describe the image...",
      },
      {
        name: "caption",
        label: "Caption (optional)",
        type: "text",
        placeholder: "Image caption",
      },
      {
        name: "size",
        label: "Size",
        type: "select",
        options: [
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" },
          { value: "full", label: "Full Width" },
        ],
      },
    ],
    defaultProps: {
      src: "",
      alt: "",
      caption: "",
      size: "large",
    },
  },
  {
    type: "Gallery",
    label: "Image Gallery",
    description: "Multiple images in a grid",
    icon: "GalleryHorizontal",
    category: "media",
    fields: [
      {
        name: "columns",
        label: "Columns",
        type: "select",
        options: [
          { value: "2", label: "2 Columns" },
          { value: "3", label: "3 Columns" },
          { value: "4", label: "4 Columns" },
        ],
      },
      {
        name: "images",
        label: "Images",
        type: "array",
        fields: [
          { name: "src", label: "Image", type: "image" },
          { name: "alt", label: "Alt Text", type: "text" },
          { name: "caption", label: "Caption", type: "text" },
        ],
      },
    ],
    defaultProps: {
      columns: "3",
      images: [],
    },
  },

  // Layout blocks
  {
    type: "Divider",
    label: "Divider",
    description: "Horizontal line separator",
    icon: "Minus",
    category: "layout",
    fields: [
      {
        name: "style",
        label: "Style",
        type: "select",
        options: [
          { value: "solid", label: "Solid Line" },
          { value: "dashed", label: "Dashed" },
          { value: "dotted", label: "Dotted" },
          { value: "thick", label: "Thick Line" },
        ],
      },
      {
        name: "spacing",
        label: "Spacing",
        type: "select",
        options: [
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ],
      },
    ],
    defaultProps: {
      style: "solid",
      spacing: "md",
    },
  },
  {
    type: "Table",
    label: "Table",
    description: "Simple data table",
    icon: "Table",
    category: "layout",
    fields: [
      {
        name: "headers",
        label: "Headers",
        type: "array",
        fields: [{ name: "text", label: "Header", type: "text" }],
      },
      {
        name: "rows",
        label: "Rows",
        type: "array",
        fields: [
          {
            name: "cells",
            label: "Cells",
            type: "array",
            fields: [{ name: "text", label: "Cell", type: "text" }],
          },
        ],
      },
    ],
    defaultProps: {
      headers: [{ text: "Column 1" }, { text: "Column 2" }],
      rows: [{ cells: [{ text: "Cell 1" }, { text: "Cell 2" }] }],
    },
  },

  // Embed blocks
  {
    type: "Video",
    label: "Video Embed",
    description: "YouTube or Vimeo video",
    icon: "Play",
    category: "embed",
    fields: [
      {
        name: "url",
        label: "Video URL",
        type: "text",
        required: true,
        placeholder: "https://youtube.com/watch?v=...",
      },
      {
        name: "caption",
        label: "Caption (optional)",
        type: "text",
      },
    ],
    defaultProps: {
      url: "",
      caption: "",
    },
  },
  {
    type: "Link",
    label: "Link Card",
    description: "Styled external link",
    icon: "Link",
    category: "embed",
    fields: [
      {
        name: "url",
        label: "URL",
        type: "text",
        required: true,
        placeholder: "https://...",
      },
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
      },
      {
        name: "description",
        label: "Description",
        type: "text",
      },
    ],
    defaultProps: {
      url: "",
      title: "",
      description: "",
    },
  },
];

// Get icon component by name
export function getNewsBlockIcon(iconName: string) {
  const icons: Record<string, typeof Type> = {
    Type,
    Image,
    Heading1,
    Heading2,
    AlignLeft,
    Quote,
    List,
    Minus,
    GalleryHorizontal,
    Play,
    Link,
    AlertCircle,
    Code,
    Table,
  };
  return icons[iconName] || Type;
}

export function getNewsBlockMeta(type: string): NewsBlockMeta | undefined {
  return newsBlockMeta.find((b) => b.type === type);
}

export function getNewsBlocksByCategory(
  category: NewsBlockCategory
): NewsBlockMeta[] {
  return newsBlockMeta.filter((b) => b.category === category);
}
