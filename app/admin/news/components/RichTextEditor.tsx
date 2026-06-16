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
import { useTranslations } from "next-intl";
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
          className={`rounded bg-subtle px-1 py-0.5 font-mono text-sm ${className ?? ""}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="overflow-auto rounded-md border border-line bg-subtle p-4 text-sm text-ink">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  }

  return {
    h1: (props: ComponentPropsWithoutRef<"h1">) => (
      <h1 className="text-3xl font-semibold text-ink-heading" {...props} />
    ),
    h2: (props: ComponentPropsWithoutRef<"h2">) => (
      <h2 className="text-2xl font-semibold text-ink-heading" {...props} />
    ),
    h3: (props: ComponentPropsWithoutRef<"h3">) => (
      <h3 className="text-xl font-semibold text-ink-heading" {...props} />
    ),
    a: (props: ComponentPropsWithoutRef<"a">) => (
      <a className="text-ink-link underline hover:opacity-80" {...props} />
    ),
    ul: (props: ComponentPropsWithoutRef<"ul">) => (
      <ul className="list-disc space-y-2 pl-6" {...props} />
    ),
    ol: (props: ComponentPropsWithoutRef<"ol">) => (
      <ol className="list-decimal space-y-2 pl-6" {...props} />
    ),
    blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
      <blockquote
        className="border-l-4 border-[var(--color-action-secondary-border)] pl-4 italic text-ink-muted"
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
    hr: () => <hr className="my-6 border-line" />,
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
          ? "bg-brand-tint text-ink-link"
          : "text-ink-muted hover:bg-subtle"
      }`}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-[var(--color-border-strong)]" />;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  label,
  required,
  rows = 12,
  images = [],
}: RichTextEditorProps) {
  const t = useTranslations("Admin.editor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const resolvedPlaceholder = placeholder ?? t("placeholder");

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
          <label className="text-sm font-medium text-ink">
            {label}
            {required && <span className="ml-1 text-[var(--color-status-danger-text)]">*</span>}
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-link hover:opacity-80"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                {t("edit")}
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                {t("preview")}
              </>
            )}
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-line bg-subtle p-1.5">
        <ToolbarButton
          onClick={() => insertMarkdown("**", "**")}
          title={t("tooltip.bold")}
          icon={Bold}
        />
        <ToolbarButton
          onClick={() => insertMarkdown("*", "*")}
          title={t("tooltip.italic")}
          icon={Italic}
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => insertAtLineStart("# ")}
          title={t("tooltip.h1")}
          icon={Heading1}
        />
        <ToolbarButton
          onClick={() => insertAtLineStart("## ")}
          title={t("tooltip.h2")}
          icon={Heading2}
        />
        <ToolbarButton
          onClick={() => insertAtLineStart("### ")}
          title={t("tooltip.h3")}
          icon={Heading3}
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => insertAtLineStart("- ")}
          title={t("tooltip.bulletList")}
          icon={List}
        />
        <ToolbarButton
          onClick={() => insertAtLineStart("1. ")}
          title={t("tooltip.numberedList")}
          icon={ListOrdered}
        />
        <ToolbarButton
          onClick={() => insertAtLineStart("> ")}
          title={t("tooltip.quote")}
          icon={Quote}
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => insertMarkdown("`", "`")}
          title={t("tooltip.inlineCode")}
          icon={Code}
        />
        <ToolbarButton
          onClick={() => insertMarkdown("[", "](url)")}
          title={t("tooltip.link")}
          icon={Link}
        />
        <ToolbarButton
          onClick={() => insertMarkdown("![alt](", ")")}
          title={t("tooltip.image")}
          icon={Image}
        />

        <ToolbarDivider />

        <ToolbarButton
          onClick={() => insertMarkdown("\n\n---\n\n")}
          title={t("tooltip.hr")}
          icon={Minus}
        />
      </div>

      {/* Editor/Preview */}
      {showPreview ? (
        <div className="min-h-[300px] overflow-auto rounded-b-lg border border-line bg-surface p-4">
          {value.trim() ? (
            <article className="prose prose-slate max-w-none space-y-4 dark:prose-invert">
              <ReactMarkdown components={markdownComponents}>{value}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-sm text-ink-muted">
              {t("nothingToPreview")}
            </p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={resolvedPlaceholder}
          rows={rows}
          className="w-full rounded-b-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-[var(--color-action-secondary-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-focus-ring)]/40"
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

      <p className="text-xs text-ink-muted">
        {t("markdownHint")}
      </p>
    </div>
  );
}
