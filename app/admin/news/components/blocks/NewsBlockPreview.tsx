"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  CheckCircle,
  Info,
  Lightbulb,
  AlertTriangle,
  ExternalLink,
  Play,
} from "lucide-react";
import type { NewsBlockInstance } from "./types";

interface NewsBlockPreviewProps {
  block: NewsBlockInstance;
}

// Heading Block
function HeadingPreview({ props }: { props: Record<string, unknown> }) {
  const text = (props.text as string) || "Heading";
  const level = (props.level as string) || "h2";

  if (level === "h3") {
    return (
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
        {text}
      </h3>
    );
  }
  return (
    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{text}</h2>
  );
}

// Paragraph Block
function ParagraphPreview({ props }: { props: Record<string, unknown> }) {
  const content = (props.content as string) || "";

  if (!content) {
    return (
      <p className="text-slate-400 italic dark:text-slate-500">
        Start typing your content...
      </p>
    );
  }

  return (
    <div className="prose prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

// Quote Block
function QuotePreview({ props }: { props: Record<string, unknown> }) {
  const text = (props.text as string) || "";
  const author = props.author as string | undefined;
  const style = (props.style as string) || "default";

  const styleClasses = {
    default: "border-l-4 border-slate-300 pl-4 dark:border-slate-600",
    highlighted:
      "border-l-4 border-brand-500 bg-brand-50 pl-4 py-3 pr-4 rounded-r-lg dark:bg-brand-950/30",
    bordered:
      "border border-slate-200 p-4 rounded-lg dark:border-slate-700",
  };

  return (
    <blockquote className={styleClasses[style as keyof typeof styleClasses] || styleClasses.default}>
      <p className="text-lg italic text-slate-700 dark:text-slate-300">
        {text || "Quote text..."}
      </p>
      {author && (
        <footer className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          — {author}
        </footer>
      )}
    </blockquote>
  );
}

// List Block
function ListPreview({ props }: { props: Record<string, unknown> }) {
  const style = (props.style as string) || "bullet";
  const items = (props.items as Array<{ text: string }>) || [];

  if (items.length === 0) {
    return (
      <p className="text-slate-400 italic dark:text-slate-500">
        Add list items...
      </p>
    );
  }

  const ListTag = style === "numbered" ? "ol" : "ul";
  const listClass =
    style === "numbered"
      ? "list-decimal"
      : style === "check"
        ? "list-none"
        : "list-disc";

  return (
    <ListTag className={`${listClass} space-y-1 pl-5 text-slate-700 dark:text-slate-300`}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          {style === "check" && (
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
          )}
          <span>{item.text}</span>
        </li>
      ))}
    </ListTag>
  );
}

// Callout Block
function CalloutPreview({ props }: { props: Record<string, unknown> }) {
  const type = (props.type as string) || "info";
  const title = props.title as string | undefined;
  const content = (props.content as string) || "";

  const styles = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: Info,
      iconColor: "text-blue-500",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
    },
    success: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      icon: CheckCircle,
      iconColor: "text-green-500",
    },
    tip: {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-800",
      icon: Lightbulb,
      iconColor: "text-purple-500",
    },
  };

  const currentStyle = styles[type as keyof typeof styles] || styles.info;
  const IconComponent = currentStyle.icon;

  return (
    <div
      className={`flex gap-3 rounded-lg border p-4 ${currentStyle.bg} ${currentStyle.border}`}
    >
      <IconComponent
        className={`h-5 w-5 flex-shrink-0 ${currentStyle.iconColor}`}
      />
      <div>
        {title && (
          <p className="font-medium text-slate-900 dark:text-white">{title}</p>
        )}
        <p className="text-slate-700 dark:text-slate-300">
          {content || "Callout content..."}
        </p>
      </div>
    </div>
  );
}

// Code Block
function CodePreview({ props }: { props: Record<string, unknown> }) {
  const code = (props.code as string) || "";
  const language = (props.language as string) || "plain";
  const filename = props.filename as string | undefined;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      {filename && (
        <div className="border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {filename}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto bg-slate-900 p-4 text-sm text-slate-100">
        <code>{code || `// ${language} code...`}</code>
      </pre>
    </div>
  );
}

// Image Block
function ImagePreview({ props }: { props: Record<string, unknown> }) {
  const src = props.src as string | undefined;
  const alt = (props.alt as string) || "";
  const caption = props.caption as string | undefined;
  const size = (props.size as string) || "large";

  const sizeClasses = {
    small: "max-w-sm",
    medium: "max-w-xl",
    large: "max-w-4xl",
    full: "w-full",
  };

  if (!src) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Select an image...
        </p>
      </div>
    );
  }

  return (
    <figure className={`mx-auto ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.large}`}>
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg object-cover"
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// Gallery Block
function GalleryPreview({ props }: { props: Record<string, unknown> }) {
  const columns = (props.columns as string) || "3";
  const images = (props.images as Array<{ src: string; alt?: string; caption?: string }>) || [];

  if (images.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Add images to the gallery...
        </p>
      </div>
    );
  }

  const gridCols = {
    "2": "grid-cols-2",
    "3": "grid-cols-3",
    "4": "grid-cols-4",
  };

  return (
    <div className={`grid gap-3 ${gridCols[columns as keyof typeof gridCols] || gridCols["3"]}`}>
      {images.map((image, index) => (
        <div key={index} className="aspect-square overflow-hidden rounded-lg">
          <img
            src={image.src}
            alt={image.alt || ""}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

// Divider Block
function DividerPreview({ props }: { props: Record<string, unknown> }) {
  const style = (props.style as string) || "solid";
  const spacing = (props.spacing as string) || "md";

  const spacingClasses = {
    sm: "my-4",
    md: "my-8",
    lg: "my-12",
  };

  const styleClasses = {
    solid: "border-slate-200 dark:border-slate-700",
    dashed: "border-dashed border-slate-200 dark:border-slate-700",
    dotted: "border-dotted border-slate-200 dark:border-slate-700",
    thick: "border-2 border-slate-300 dark:border-slate-600",
  };

  return (
    <hr
      className={`${spacingClasses[spacing as keyof typeof spacingClasses] || spacingClasses.md} ${styleClasses[style as keyof typeof styleClasses] || styleClasses.solid}`}
    />
  );
}

// Table Block
function TablePreview({ props }: { props: Record<string, unknown> }) {
  const headers = (props.headers as Array<{ text: string }>) || [];
  const rows = (props.rows as Array<{ cells: Array<{ text: string }> }>) || [];

  if (headers.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Add table headers and rows...
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {header.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-t border-slate-200 dark:border-slate-700"
            >
              {row.cells?.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Video Block
function VideoPreview({ props }: { props: Record<string, unknown> }) {
  const url = props.url as string | undefined;
  const caption = props.caption as string | undefined;

  if (!url) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="text-center">
          <Play className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Enter a YouTube or Vimeo URL...
          </p>
        </div>
      </div>
    );
  }

  // Simple URL parsing for preview
  const getEmbedUrl = (videoUrl: string) => {
    if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
      const videoId = videoUrl.includes("youtu.be")
        ? videoUrl.split("/").pop()
        : new URLSearchParams(new URL(videoUrl).search).get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (videoUrl.includes("vimeo.com")) {
      const videoId = videoUrl.split("/").pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return null;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <figure>
      <div className="aspect-video overflow-hidden rounded-lg">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-100 dark:bg-slate-800">
            <p className="text-sm text-slate-500">Invalid video URL</p>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// Link Card Block
function LinkPreview({ props }: { props: Record<string, unknown> }) {
  const url = props.url as string | undefined;
  const title = (props.title as string) || "";
  const description = props.description as string | undefined;

  if (!url && !title) {
    return (
      <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <ExternalLink className="h-5 w-5 text-slate-400" />
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Add a link...
        </p>
      </div>
    );
  }

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-brand-600 dark:hover:bg-brand-950/30"
    >
      <ExternalLink className="h-5 w-5 flex-shrink-0 text-slate-400" />
      <div>
        <p className="font-medium text-slate-900 dark:text-white">
          {title || "Link title"}
        </p>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
    </a>
  );
}

// Main Preview Component
export function NewsBlockPreview({ block }: NewsBlockPreviewProps) {
  const props = block.props as Record<string, unknown>;

  switch (block.type) {
    case "Heading":
      return <HeadingPreview props={props} />;
    case "Paragraph":
      return <ParagraphPreview props={props} />;
    case "Quote":
      return <QuotePreview props={props} />;
    case "List":
      return <ListPreview props={props} />;
    case "Callout":
      return <CalloutPreview props={props} />;
    case "Code":
      return <CodePreview props={props} />;
    case "Image":
      return <ImagePreview props={props} />;
    case "Gallery":
      return <GalleryPreview props={props} />;
    case "Divider":
      return <DividerPreview props={props} />;
    case "Table":
      return <TablePreview props={props} />;
    case "Video":
      return <VideoPreview props={props} />;
    case "Link":
      return <LinkPreview props={props} />;
    default:
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Unknown block type: {block.type}
          </p>
        </div>
      );
  }
}
