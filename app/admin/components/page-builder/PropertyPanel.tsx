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
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-brand-600 hover:text-brand-500"
        >
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>
      
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => insertMarkdown("**", "**")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("*", "*")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="mx-1 w-px bg-slate-300 dark:bg-slate-600" />
        <button
          type="button"
          onClick={() => insertMarkdown("# ", "")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("## ", "")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("### ", "")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <div className="mx-1 w-px bg-slate-300 dark:bg-slate-600" />
        <button
          type="button"
          onClick={() => insertMarkdown("- ", "")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("1. ", "")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("> ", "")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("`", "`")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Code"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("[", "](url)")}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Link"
        >
          <Link className="h-4 w-4" />
        </button>
      </div>
      
      {showPreview ? (
        <div className="min-h-[200px] rounded-b-lg border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
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
          placeholder={field.placeholder || "Write your content here..."}
          rows={8}
          className="w-full rounded-b-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {field.label}
      </label>
      <input
        type="number"
        value={value ?? field.defaultValue ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        min={field.min}
        max={field.max}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {field.label}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {field.label}
      </label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${value ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"}
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
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {field.label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/example.jpg"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Image className="h-4 w-4" />
        </button>
      </div>
      {value && (
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
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
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {field.label}
      </label>
      <div className="relative">
        <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "/page-url"}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {field.label}
        </label>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-400 dark:hover:bg-brand-900/50"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <button
              type="button"
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="flex w-full items-center justify-between px-3 py-2"
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Item {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                  className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {expandedIndex === index ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>
            
            {expandedIndex === index && (
              <div className="space-y-3 border-t border-slate-200 px-3 py-3 dark:border-slate-700">
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
          <p className="py-4 text-center text-sm text-slate-500">
            No items yet. Click "Add" to create one.
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
  const { state, getSelectedBlock, updateBlock, selectBlock } = usePageBuilder();
  const block = getSelectedBlock();
  
  if (!block) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Properties</h3>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Settings className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a block to edit its properties
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
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {meta?.label || block.type}
          </h3>
        </div>
        <button
          onClick={() => selectBlock(null)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      {meta?.description && (
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">{meta.description}</p>
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
            <p className="py-4 text-center text-sm text-slate-500">
              No editable properties for this block type.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
