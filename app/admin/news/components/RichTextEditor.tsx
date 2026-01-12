"use client";

import React, { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Eye,
  EyeOff,
  Minus,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  rows?: number;
  images?: Array<{ name: string; preview: string; url?: string; size?: string }>;
}

// Simple markdown components for preview
function createMarkdownComponents(
  images: Array<{ name: string; preview: string; url?: string; size?: string }>
): Components {
  const imageLookup = new Map(
    images.map((img) => [img.name, img.url ?? img.preview] as const)
  );
  const sizeLookup = new Map(
    images.map((img) => [img.name, img.size ?? "full"] as const)
  );

  function resolveImageSource(src?: string): string | undefined {
    if (!src) return undefined;
    if (/^https?:\/\//i.test(src)) return src;
    const trimmed = src.startsWith("/") ? src.slice(1) : src;
    const key = trimmed.split("/").pop() ?? trimmed;
    return imageLookup.get(key) ?? src;
  }

  function resolveSizeClass(name?: string): string {
    if (!name) return "w-full";
    const size = sizeLookup.get(name);
    switch (size) {
      case "small":
        return "mx-auto w-full max-w-sm";
      case "medium":
        return "mx-auto w-full max-w-xl";
      case "large":
        return "mx-auto w-full max-w-4xl";
      case "full":
      default:
        return "w-full";
    }
  }

  function resolveInlineCode(
    inline: boolean | undefined,
    className: string | undefined,
    children: ReactNode,
    props: ComponentPropsWithoutRef<"code">
  ) {
    if (inline) {
      return (
        <code
          className={`rounded bg-slate-100 px-1 py-0.5 font-mono text-sm dark:bg-slate-800 ${className ?? ""}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="overflow-auto rounded-md bg-slate-900 p-4 text-sm text-slate-100">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  }

  return {
    h1: (props: ComponentPropsWithoutRef<"h1">) => (
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100" {...props} />
    ),
    h2: (props: ComponentPropsWithoutRef<"h2">) => (
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100" {...props} />
    ),
    h3: (props: ComponentPropsWithoutRef<"h3">) => (
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100" {...props} />
    ),
    a: (props: ComponentPropsWithoutRef<"a">) => (
      <a className="text-blue-600 underline hover:text-blue-700" {...props} />
    ),
    ul: (props: ComponentPropsWithoutRef<"ul">) => (
      <ul className="list-disc space-y-2 pl-6" {...props} />
    ),
    ol: (props: ComponentPropsWithoutRef<"ol">) => (
      <ol className="list-decimal space-y-2 pl-6" {...props} />
    ),
    blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
      <blockquote
        className="border-l-4 border-blue-600/40 pl-4 italic text-slate-600 dark:border-blue-500/40 dark:text-slate-300"
        {...props}
      />
    ),
    code: ({
      inline,
      className,
      children,
      ...props
    }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) =>
      resolveInlineCode(inline, className, children, props),
    p: (props: ComponentPropsWithoutRef<"p">) => (
      <p className="leading-relaxed" {...props} />
    ),
    hr: () => <hr className="my-6 border-slate-200 dark:border-slate-700" />,
    img: ({ src, alt, ...props }: ComponentPropsWithoutRef<"img">) => {
      const resolved = resolveImageSource(typeof src === "string" ? src : undefined);
      if (!resolved) return null;
      const trimmed =
        typeof src === "string" ? (src.startsWith("/") ? src.slice(1) : src) : undefined;
      const key = trimmed?.split("/").pop();
      const sizeClass = resolveSizeClass(key);
      return (
        <img src={resolved} alt={alt ?? ""} className={`my-4 rounded-lg ${sizeClass}`} {...props} />
      );
    },
  };
}

interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  icon: React.ElementType;
  active?: boolean;
}

function ToolbarButton({ onClick, title, icon: Icon, active }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
          : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
      }`}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  label,
  required,
  rows = 12,
  images = [],
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const insertMarkdown = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value ?? "";
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    onChange(newText);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selected.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = value ?? "";

    // Find the start of the current line
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== "\n") {
      lineStart--;
    }

    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const markdownComponents = React.useMemo(
    () => createMarkdownComponents(images),
    [images]
  );

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Preview
              </>
            )}
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-1.5 dark:border-slate-600 dark:bg-slate-800">
        <ToolbarButton
          onClick={() => insertMarkdown("**", "**")}
          title="Bold (Ctrl+B)"
          icon={Bold}
        />
        <ToolbarButton
          onClick={() => insertMarkdown("*", "*")}
          title="Italic (Ctrl+I)"
          icon={Italic}
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => insertAtLineStart("# ")}
          title="Heading 1"
          icon={Heading1}
        />
        <ToolbarButton
          onClick={() => insertAtLineStart("## ")}
          title="Heading 2"
          icon={Heading2}
        />
        <ToolbarButton
          onClick={() => insertAtLineStart("### ")}
          title="Heading 3"
          icon={Heading3}
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => insertAtLineStart("- ")}
          title="Bullet List"
          icon={List}
        />
        <ToolbarButton
          onClick={() => insertAtLineStart("1. ")}
          title="Numbered List"
          icon={ListOrdered}
        />
        <ToolbarButton
          onClick={() => insertAtLineStart("> ")}
          title="Quote"
          icon={Quote}
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => insertMarkdown("`", "`")}
          title="Inline Code"
          icon={Code}
        />
        <ToolbarButton
          onClick={() => insertMarkdown("[", "](url)")}
          title="Link"
          icon={Link}
        />
        <ToolbarButton
          onClick={() => insertMarkdown("![alt](", ")")}
          title="Image"
          icon={Image}
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => insertMarkdown("\n\n---\n\n")}
          title="Horizontal Rule"
          icon={Minus}
        />
      </div>

      {/* Editor/Preview */}
      {showPreview ? (
        <div className="min-h-[300px] overflow-auto rounded-b-lg border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
          {value.trim() ? (
            <article className="prose prose-slate max-w-none space-y-4 dark:prose-invert">
              <ReactMarkdown components={markdownComponents}>{value}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Nothing to preview. Start writing to see your content here.
            </p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-b-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          onKeyDown={(e) => {
            // Handle Ctrl+B for bold
            if ((e.ctrlKey || e.metaKey) && e.key === "b") {
              e.preventDefault();
              insertMarkdown("**", "**");
            }
            // Handle Ctrl+I for italic
            if ((e.ctrlKey || e.metaKey) && e.key === "i") {
              e.preventDefault();
              insertMarkdown("*", "*");
            }
          }}
        />
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Supports Markdown formatting. Use the toolbar or keyboard shortcuts (Ctrl+B, Ctrl+I).
      </p>
    </div>
  );
}
