import {
  Layout,
  Type,
  Image,
  MousePointer,
  Database,
  Heading1,
  AlignLeft,
  FileText,
  Newspaper,
  Quote,
  MessageSquareQuote,
  BarChart3,
  Grid3X3,
  GalleryHorizontal,
  Minus,
  Space,
  Star,
  ListChecks,
  Layers,
  Play,
  HelpCircle,
} from "lucide-react";
import type { BlockMeta, BlockCategory } from "./types";

// Category metadata
export const blockCategories: Record<BlockCategory, { label: string; icon: typeof Layout }> = {
  layout: { label: "Layout", icon: Layout },
  content: { label: "Content", icon: Type },
  media: { label: "Media", icon: Image },
  interactive: { label: "Interactive", icon: MousePointer },
  data: { label: "Data", icon: Database },
};

// Block definitions with metadata for the builder
export const blockMeta: BlockMeta[] = [
  // Layout blocks
  {
    type: "Hero",
    label: "Hero Banner",
    description: "Full-width hero section with heading, image, and call-to-action",
    icon: "Heading1",
    category: "layout",
    fields: [
      { name: "heading", label: "Heading", type: "text", required: true, placeholder: "Main headline..." },
      { name: "subheading", label: "Subheading", type: "text", placeholder: "Supporting text..." },
      { name: "image", label: "Background Image", type: "image" },
      { name: "cta.label", label: "Button Text", type: "text", placeholder: "Learn More" },
      { name: "cta.href", label: "Button Link", type: "link", placeholder: "/about" },
    ],
    defaultProps: {
      heading: "Welcome to TUES",
      subheading: "Technology, Innovation, Excellence",
      image: "/images/hero-bg.jpg",
      cta: { label: "Learn More", href: "/about" },
    },
  },
  {
    type: "Section",
    label: "Section",
    description: "Content section with title, description, and markdown body",
    icon: "AlignLeft",
    category: "layout",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, placeholder: "Section title..." },
      { name: "description", label: "Description", type: "textarea", placeholder: "Brief description..." },
      { name: "markdown", label: "Content", type: "richtext" },
    ],
    defaultProps: {
      title: "New Section",
      description: "",
      markdown: "",
    },
  },
  {
    type: "Divider",
    label: "Divider",
    description: "Visual separator between sections",
    icon: "Minus",
    category: "layout",
    fields: [
      {
        name: "style",
        label: "Style",
        type: "select",
        options: [
          { value: "line", label: "Line" },
          { value: "dashed", label: "Dashed" },
          { value: "dotted", label: "Dotted" },
          { value: "gradient", label: "Gradient" },
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
    defaultProps: { style: "line", spacing: "md" },
  },
  {
    type: "Spacer",
    label: "Spacer",
    description: "Add vertical spacing between blocks",
    icon: "Space",
    category: "layout",
    fields: [
      {
        name: "height",
        label: "Height",
        type: "select",
        options: [
          { value: "xs", label: "Extra Small" },
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
          { value: "xl", label: "Extra Large" },
        ],
      },
    ],
    defaultProps: { height: "md" },
  },

  // Content blocks
  {
    type: "Markdown",
    label: "Rich Text",
    description: "Markdown-formatted content with full styling support",
    icon: "FileText",
    category: "content",
    fields: [
      { name: "value", label: "Content", type: "richtext", required: true },
    ],
    defaultProps: {
      value: "Start writing your content here...\n\n**Bold** and *italic* text are supported.",
    },
  },
  {
    type: "Quote",
    label: "Quote",
    description: "Highlighted quote or testimonial",
    icon: "Quote",
    category: "content",
    fields: [
      { name: "text", label: "Quote Text", type: "textarea", required: true },
      { name: "author", label: "Author", type: "text" },
      { name: "role", label: "Author Role", type: "text", placeholder: "CEO, Company" },
    ],
    defaultProps: {
      text: "Education is the most powerful weapon which you can use to change the world.",
      author: "Nelson Mandela",
      role: "",
    },
  },
  {
    type: "Stats",
    label: "Statistics",
    description: "Display key metrics and numbers",
    icon: "BarChart3",
    category: "content",
    fields: [
      { name: "items", label: "Stats", type: "array", fields: [
        { name: "value", label: "Value", type: "text" },
        { name: "label", label: "Label", type: "text" },
      ]},
    ],
    defaultProps: {
      items: [
        { value: "1000+", label: "Students" },
        { value: "50+", label: "Teachers" },
        { value: "30+", label: "Years" },
      ],
    },
  },
  {
    type: "Features",
    label: "Features",
    description: "Highlight key features with icons",
    icon: "Star",
    category: "content",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "layout", label: "Layout", type: "select", options: [
        { value: "grid", label: "Grid" },
        { value: "list", label: "List" },
      ]},
      { name: "items", label: "Features", type: "array", fields: [
        { name: "icon", label: "Icon", type: "icon" },
        { name: "title", label: "Title", type: "text" },
        { name: "description", label: "Description", type: "textarea" },
      ]},
    ],
    defaultProps: {
      title: "Why Choose Us",
      items: [],
      layout: "grid",
    },
  },

  // Media blocks
  {
    type: "MediaGallery",
    label: "Media Gallery",
    description: "Image gallery with lightbox support",
    icon: "GalleryHorizontal",
    category: "media",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "layout", label: "Layout", type: "select", options: [
        { value: "grid", label: "Grid" },
        { value: "masonry", label: "Masonry" },
        { value: "carousel", label: "Carousel" },
      ]},
      { name: "images", label: "Images", type: "array", fields: [
        { name: "src", label: "Image URL", type: "image" },
        { name: "alt", label: "Alt Text", type: "text" },
        { name: "caption", label: "Caption", type: "text" },
      ]},
    ],
    defaultProps: {
      title: "Gallery",
      images: [],
      layout: "grid",
    },
  },
  {
    type: "Embed",
    label: "Embed",
    description: "Embed YouTube, Vimeo, or other content",
    icon: "Play",
    category: "media",
    fields: [
      { name: "url", label: "URL", type: "text", required: true, placeholder: "https://youtube.com/..." },
      { name: "type", label: "Type", type: "select", options: [
        { value: "video", label: "Video" },
        { value: "map", label: "Map" },
        { value: "iframe", label: "Custom Iframe" },
      ]},
      { name: "aspectRatio", label: "Aspect Ratio", type: "select", options: [
        { value: "16:9", label: "16:9" },
        { value: "4:3", label: "4:3" },
        { value: "1:1", label: "Square" },
      ]},
    ],
    defaultProps: {
      url: "",
      type: "video",
      aspectRatio: "16:9",
    },
  },

  // Data blocks
  {
    type: "NewsList",
    label: "News List",
    description: "Display recent news articles",
    icon: "Newspaper",
    category: "data",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "limit", label: "Number of Articles", type: "number", min: 1, max: 24 },
    ],
    defaultProps: {
      title: "Latest News",
      description: "Stay updated with our latest announcements",
      limit: 6,
    },
  },
  {
    type: "Testimonials",
    label: "Testimonials",
    description: "Student or parent testimonials carousel",
    icon: "MessageSquareQuote",
    category: "data",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "items", label: "Testimonials", type: "array", fields: [
        { name: "quote", label: "Quote", type: "textarea" },
        { name: "author", label: "Author", type: "text" },
        { name: "role", label: "Role", type: "text" },
        { name: "image", label: "Photo", type: "image" },
      ]},
    ],
    defaultProps: {
      title: "What Our Students Say",
      items: [],
    },
  },
  {
    type: "AdmissionsTimeline",
    label: "Admissions Timeline",
    description: "Step-by-step admission process",
    icon: "ListChecks",
    category: "data",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "steps", label: "Steps", type: "array", fields: [
        { name: "title", label: "Step Title", type: "text" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "date", label: "Date/Period", type: "text" },
      ]},
    ],
    defaultProps: {
      title: "Admission Process",
      steps: [],
    },
  },

  // Interactive blocks
  {
    type: "CTA",
    label: "Call to Action",
    description: "Prominent call-to-action section",
    icon: "MousePointer",
    category: "interactive",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "primaryButton.label", label: "Primary Button Text", type: "text" },
      { name: "primaryButton.href", label: "Primary Button Link", type: "link" },
      { name: "secondaryButton.label", label: "Secondary Button Text", type: "text" },
      { name: "secondaryButton.href", label: "Secondary Button Link", type: "link" },
    ],
    defaultProps: {
      title: "Ready to Join?",
      description: "Apply now and start your journey",
      primaryButton: { label: "Apply Now", href: "/apply" },
      secondaryButton: { label: "Learn More", href: "/about" },
    },
  },
  {
    type: "Accordion",
    label: "Accordion / FAQ",
    description: "Collapsible content sections",
    icon: "HelpCircle",
    category: "interactive",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "items", label: "Items", type: "array", fields: [
        { name: "question", label: "Question", type: "text" },
        { name: "answer", label: "Answer", type: "richtext" },
      ]},
    ],
    defaultProps: {
      title: "Frequently Asked Questions",
      items: [],
    },
  },
  {
    type: "Tabs",
    label: "Tabs",
    description: "Tabbed content sections",
    icon: "Layers",
    category: "interactive",
    fields: [
      { name: "tabs", label: "Tabs", type: "array", fields: [
        { name: "label", label: "Tab Label", type: "text" },
        { name: "content", label: "Content", type: "richtext" },
      ]},
    ],
    defaultProps: {
      tabs: [],
    },
  },
  {
    type: "Grid",
    label: "Content Grid",
    description: "Flexible grid layout for cards",
    icon: "Grid3X3",
    category: "layout",
    fields: [
      { name: "columns", label: "Columns", type: "number", min: 1, max: 6 },
      { name: "gap", label: "Gap", type: "number", min: 0, max: 12 },
      { name: "items", label: "Items", type: "array", fields: [
        { name: "title", label: "Title", type: "text" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "image", label: "Image", type: "image" },
        { name: "href", label: "Link", type: "link" },
      ]},
    ],
    defaultProps: {
      columns: 3,
      gap: 4,
      items: [],
    },
  },
];

// Get icon component by name
export function getBlockIcon(iconName: string) {
  const icons: Record<string, typeof Layout> = {
    Layout, Type, Image, MousePointer, Database,
    Heading1, AlignLeft, FileText, Newspaper, Quote,
    MessageSquareQuote, BarChart3, Grid3X3, GalleryHorizontal,
    Minus, Space, Star, ListChecks, Layers, Play, HelpCircle,
  };
  return icons[iconName] || Layout;
}

export function getBlockMeta(type: string): BlockMeta | undefined {
  return blockMeta.find((b) => b.type === type);
}

export function getBlocksByCategory(category: BlockCategory): BlockMeta[] {
  return blockMeta.filter((b) => b.category === category);
}
