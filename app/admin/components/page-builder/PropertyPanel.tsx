"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  X,
  Image,
  Link,
  Type,
  AlignLeft,
  Hash,
  ToggleLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePageBuilder } from "./PageBuilderContext";
import { getBlockMeta, getBlockIcon } from "./block-meta";
import type { BlockField, BlockInstance } from "./types";

// Field input components
function TextField({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">
        {field.label}
        {field.required && <span className="ml-1 text-[var(--color-status-danger-text)]">*</span>}
      </label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-[var(--color-action-secondary-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-focus-ring)]/40"
      />
    </div>
  );
}

function TextareaField({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">
        {field.label}
        {field.required && <span className="ml-1 text-[var(--color-status-danger-text)]">*</span>}
      </label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-[var(--color-action-secondary-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-focus-ring)]/40"
      />
    </div>
  );
}

function RichTextField({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("Admin.editor");
  const [showPreview, setShowPreview] = useState(false);

  const insertMarkdown = (before: string, after: string = before) => {
    const textarea = document.querySelector(`#richtext-${field.name}`) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value ?? "";
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    onChange(newText);
    
    // Restore focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">
          {field.label}
          {field.required && <span className="ml-1 text-[var(--color-status-danger-text)]">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-ink-link hover:opacity-80"
        >
          {showPreview ? t("edit") : t("preview")}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 rounded-t-lg border border-b-0 border-line bg-subtle p-1">
        <button
          type="button"
          onClick={() => insertMarkdown("**", "**")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("*", "*")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="mx-1 w-px bg-[var(--color-border-strong)]" />
        <button
          type="button"
          onClick={() => insertMarkdown("# ", "")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("## ", "")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("### ", "")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <div className="mx-1 w-px bg-[var(--color-border-strong)]" />
        <button
          type="button"
          onClick={() => insertMarkdown("- ", "")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("1. ", "")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("> ", "")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("`", "`")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Code"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("[", "](url)")}
          className="rounded p-1.5 text-ink-muted hover:bg-subtle"
          title="Link"
        >
          <Link className="h-4 w-4" />
        </button>
      </div>
      
      {showPreview ? (
        <div className="min-h-[200px] rounded-b-lg border border-line bg-surface p-3">
          <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
            {/* Simple markdown preview - in production use a proper parser */}
            <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(value ?? "") }} />
          </div>
        </div>
      ) : (
        <textarea
          id={`richtext-${field.name}`}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || t("placeholder")}
          rows={8}
          className="w-full rounded-b-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-[var(--color-action-secondary-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-focus-ring)]/40"
        />
      )}
    </div>
  );
}

// Simple markdown to HTML (for preview only)
function simpleMarkdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br>');
}

function NumberField({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">
        {field.label}
      </label>
      <input
        type="number"
        value={value ?? field.defaultValue ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        min={field.min}
        max={field.max}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-[var(--color-action-secondary-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-focus-ring)]/40"
      />
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">
        {field.label}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-[var(--color-action-secondary-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-focus-ring)]/40"
      >
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <label className="text-sm font-medium text-ink">
        {field.label}
      </label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${value ? "bg-[var(--color-action-primary)]" : "bg-[var(--color-border-strong)]"}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${value ? "translate-x-6" : "translate-x-1"}
          `}
        />
      </button>
    </div>
  );
}

function ImageField({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">
        {field.label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/example.jpg"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-[var(--color-action-secondary-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-focus-ring)]/40"
        />
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-subtle"
        >
          <Image className="h-4 w-4" />
        </button>
      </div>
      {value && (
        <div className="mt-2 overflow-hidden rounded-lg border border-line">
          <img
            src={value}
            alt="Preview"
            className="h-32 w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}

function LinkField({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">
        {field.label}
      </label>
      <div className="relative">
        <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "/page-url"}
          className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-[var(--color-action-secondary-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-focus-ring)]/40"
        />
      </div>
    </div>
  );
}

function ArrayField({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: any[];
  onChange: (value: any[]) => void;
}) {
  const t = useTranslations("Admin.builder");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const items = Array.isArray(value) ? value : [];

  const addItem = () => {
    const newItem: Record<string, any> = {};
    field.fields?.forEach((f) => {
      newItem[f.name] = f.defaultValue ?? "";
    });
    onChange([...items, newItem]);
    setExpandedIndex(items.length);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const updateItem = (index: number, key: string, newValue: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: newValue };
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">
          {field.label}
        </label>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 rounded-lg bg-brand-tint px-2 py-1 text-xs font-medium text-ink-link hover:opacity-90"
        >
          <Plus className="h-3 w-3" />
          {t("addItem")}
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-line bg-subtle"
          >
            <button
              type="button"
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="flex w-full items-center justify-between px-3 py-2"
            >
              <span className="text-sm font-medium text-ink">
                {t("item", { n: index + 1 })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                  className="rounded p-1 text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-bg)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {expandedIndex === index ? (
                  <ChevronDown className="h-4 w-4 text-ink-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                )}
              </div>
            </button>
            
            {expandedIndex === index && (
              <div className="space-y-3 border-t border-line px-3 py-3">
                {field.fields?.map((subField) => (
                  <FieldRenderer
                    key={subField.name}
                    field={subField}
                    value={item[subField.name]}
                    onChange={(newValue) => updateItem(index, subField.name, newValue)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-ink-muted">
            {t("noItems")}
          </p>
        )}
      </div>
    </div>
  );
}

// Generic field renderer
function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: any;
  onChange: (value: any) => void;
}) {
  switch (field.type) {
    case "text":
      return <TextField field={field} value={value} onChange={onChange} />;
    case "textarea":
      return <TextareaField field={field} value={value} onChange={onChange} />;
    case "richtext":
      return <RichTextField field={field} value={value} onChange={onChange} />;
    case "number":
      return <NumberField field={field} value={value} onChange={onChange} />;
    case "select":
      return <SelectField field={field} value={value} onChange={onChange} />;
    case "toggle":
      return <ToggleField field={field} value={value} onChange={onChange} />;
    case "image":
      return <ImageField field={field} value={value} onChange={onChange} />;
    case "link":
      return <LinkField field={field} value={value} onChange={onChange} />;
    case "array":
      return <ArrayField field={field} value={value} onChange={onChange} />;
    default:
      return <TextField field={field} value={value} onChange={onChange} />;
  }
}

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

// Set nested value in object using dot notation
function setNestedValue(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  const parts = path.split('.');
  const result = { ...obj };
  let current: any = result;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    current[part] = current[part] ? { ...current[part] } : {};
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
  return result;
}

export function PropertyPanel() {
  const t = useTranslations("Admin.builder");
  const { state, getSelectedBlock, updateBlock, selectBlock } = usePageBuilder();
  const block = getSelectedBlock();

  if (!block) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-line p-4">
          <h3 className="text-sm font-semibold text-ink-heading">{t("properties")}</h3>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-subtle">
            <Settings className="h-6 w-6 text-ink-muted" />
          </div>
          <p className="text-sm text-ink-muted">
            {t("selectBlock")}
          </p>
        </div>
      </div>
    );
  }

  const meta = getBlockMeta(block.type);
  const Icon = meta ? getBlockIcon(meta.icon) : Settings;

  const handleFieldChange = (fieldName: string, value: any) => {
    const newProps = setNestedValue(block.props as Record<string, any>, fieldName, value);
    updateBlock(block.id, newProps);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-ink-link" />
          <h3 className="text-sm font-semibold text-ink-heading">
            {meta?.label || block.type}
          </h3>
        </div>
        <button
          onClick={() => selectBlock(null)}
          className="rounded p-1 text-ink-muted hover:bg-subtle hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      {meta?.description && (
        <div className="border-b border-line px-4 py-3">
          <p className="text-xs text-ink-muted">{meta.description}</p>
        </div>
      )}

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {meta?.fields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={getNestedValue(block.props as Record<string, any>, field.name)}
              onChange={(value) => handleFieldChange(field.name, value)}
            />
          ))}
          
          {(!meta?.fields || meta.fields.length === 0) && (
            <p className="py-4 text-center text-sm text-ink-muted">
              {t("noProperties")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
