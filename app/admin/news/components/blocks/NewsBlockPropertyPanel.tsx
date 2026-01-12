"use client";

import React, { useRef } from "react";
import { X, Settings2, Upload, ImageIcon, ChevronDown } from "lucide-react";
import { useNewsBuilder, type SelectedImage, type ImageSize } from "../NewsBuilderContext";
import { getNewsBlockMeta, getNewsBlockIcon } from "./block-meta";
import type { NewsBlockField, NewsBlockMeta } from "./types";

interface FieldEditorProps {
  field: NewsBlockField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function TextFieldEditor({ field, value, onChange }: FieldEditorProps) {
  return (
    <input
      type="text"
      value={(value as string) || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
    />
  );
}

function TextAreaFieldEditor({ field, value, onChange }: FieldEditorProps) {
  return (
    <textarea
      value={(value as string) || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      rows={4}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
    />
  );
}

function RichTextFieldEditor({ field, value, onChange }: FieldEditorProps) {
  return (
    <textarea
      value={(value as string) || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      rows={6}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
    />
  );
}

function SelectFieldEditor({ field, value, onChange }: FieldEditorProps) {
  return (
    <select
      value={(value as string) || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
    >
      {field.options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function splitName(name: string) {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, dotIndex), ext: name.slice(dotIndex).toLowerCase() };
}

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .trim()
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]+/g, "-")
    .replace(/[\u0000-\u001F\u007F]+/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u0400-\u04FF-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateImageName(original: string, used: Set<string>) {
  const { base, ext } = splitName(original);
  const sanitizedBase = slugify(base);
  const cleanBase = sanitizedBase || "image";
  let candidate = `${cleanBase}${ext}`;
  let counter = 1;
  while (used.has(candidate)) {
    candidate = `${cleanBase}-${counter}${ext}`;
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

function ImageFieldEditor({ field, value, onChange }: FieldEditorProps) {
  const { state, addImage } = useNewsBuilder();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGallery, setShowGallery] = React.useState(false);
  const images = state.form.images;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const file = files[0];
    const used = new Set(images.map((img) => img.name));
    const preview = URL.createObjectURL(file);
    const name = generateImageName(file.name, used);

    // Add image to the form's image collection
    addImage({ file, preview, name, size: "full" as ImageSize, origin: "new" });

    // Get the URL that will be used (preview for new images)
    onChange(preview);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowGallery(false);
  };

  const handleSelectExisting = (img: SelectedImage) => {
    // Use the URL for existing images, preview for new ones
    const imageUrl = img.origin === "existing" ? img.url : img.preview;
    onChange(imageUrl);
    setShowGallery(false);
  };

  const currentImageUrl = value as string;

  return (
    <div className="space-y-2">
      {/* Current Image Preview */}
      {currentImageUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <img
            src={currentImageUrl}
            alt="Preview"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-2 text-sm text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => setShowGallery(!showGallery)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ImageIcon className="h-4 w-4" />
            Gallery ({images.length})
            <ChevronDown className={`h-3 w-3 transition-transform ${showGallery ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Image Gallery Dropdown */}
      {showGallery && images.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Select from uploaded images:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img) => {
              const imageUrl = img.origin === "existing" ? img.url : img.preview;
              const isSelected = currentImageUrl === imageUrl;
              return (
                <button
                  key={img.name}
                  type="button"
                  onClick={() => handleSelectExisting(img)}
                  className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-brand-500 ring-2 ring-brand-500/20"
                      : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <img
                    src={img.preview}
                    alt={img.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                    <p className="truncate text-[10px] text-white">{img.name}</p>
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brand-500/20">
                      <div className="rounded-full bg-brand-500 p-1">
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual URL Input (collapsed by default) */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
          Or enter URL manually
        </summary>
        <input
          type="text"
          value={currentImageUrl || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </details>
    </div>
  );
}

interface ArrayFieldEditorProps {
  field: NewsBlockField;
  value: unknown;
  onChange: (value: unknown) => void;
}

// Render appropriate input for array sub-fields
function ArraySubFieldInput({
  subField,
  value,
  onChange,
}: {
  subField: NewsBlockField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (subField.type === "image") {
    return <ImageFieldEditor field={subField} value={value} onChange={onChange} />;
  }

  if (subField.type === "textarea") {
    return (
      <textarea
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={subField.placeholder}
        rows={2}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      />
    );
  }

  if (subField.type === "select" && subField.options) {
    return (
      <select
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
      >
        {subField.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // Default to text input
  return (
    <input
      type="text"
      value={(value as string) || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={subField.placeholder}
      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
    />
  );
}

function ArrayFieldEditor({ field, value, onChange }: ArrayFieldEditorProps) {
  const items = (value as Array<Record<string, unknown>>) || [];
  const subFields = field.fields || [];

  const handleAddItem = () => {
    const newItem: Record<string, unknown> = {};
    subFields.forEach((f) => {
      newItem[f.name] = "";
    });
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleItemChange = (index: number, fieldName: string, fieldValue: unknown) => {
    const newItems = items.map((item, i) =>
      i === index ? { ...item, [fieldName]: fieldValue } : item
    );
    onChange(newItems);
  };

  // Check if this is an image-heavy array (like gallery images)
  const hasImageField = subFields.some((f) => f.type === "image");

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className={`rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50 ${
            hasImageField ? "" : "flex items-start gap-2"
          }`}
        >
          <div className={`space-y-2 ${hasImageField ? "" : "flex-1"}`}>
            {/* Item number badge for image arrays */}
            {hasImageField && (
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  Image {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {subFields.map((subField) => (
              <div key={subField.name}>
                {subFields.length > 1 && (
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    {subField.label}
                  </label>
                )}
                <ArraySubFieldInput
                  subField={subField}
                  value={item[subField.name]}
                  onChange={(val) => handleItemChange(index, subField.name, val)}
                />
              </div>
            ))}
          </div>
          {/* Remove button for non-image arrays */}
          {!hasImageField && (
            <button
              type="button"
              onClick={() => handleRemoveItem(index)}
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={handleAddItem}
        className="w-full rounded-lg border-2 border-dashed border-slate-300 py-2 text-sm text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
      >
        + Add {hasImageField ? "Image" : "Item"}
      </button>
    </div>
  );
}

function FieldEditor({ field, value, onChange }: FieldEditorProps) {
  switch (field.type) {
    case "text":
      return <TextFieldEditor field={field} value={value} onChange={onChange} />;
    case "textarea":
      return <TextAreaFieldEditor field={field} value={value} onChange={onChange} />;
    case "richtext":
      return <RichTextFieldEditor field={field} value={value} onChange={onChange} />;
    case "select":
      return <SelectFieldEditor field={field} value={value} onChange={onChange} />;
    case "image":
      return <ImageFieldEditor field={field} value={value} onChange={onChange} />;
    case "array":
      return <ArrayFieldEditor field={field} value={value} onChange={onChange} />;
    default:
      return <TextFieldEditor field={field} value={value} onChange={onChange} />;
  }
}

export function NewsBlockPropertyPanel() {
  const { state, selectedBlock, updateBlock, selectBlock } = useNewsBuilder();

  if (!selectedBlock) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Block Properties
          </h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <Settings2 className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select a block to edit its properties
            </p>
          </div>
        </div>
      </div>
    );
  }

  const meta = getNewsBlockMeta(selectedBlock.type);
  if (!meta) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-500">Unknown block type: {selectedBlock.type}</p>
      </div>
    );
  }

  const Icon = getNewsBlockIcon(meta.icon);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    updateBlock(selectedBlock.id, { [fieldName]: value });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/50">
            <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {meta.label}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {meta.description}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => selectBlock(null)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {meta.fields.map((field) => (
            <div key={field.name}>
              <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              <FieldEditor
                field={field}
                value={selectedBlock.props[field.name]}
                onChange={(value) => handleFieldChange(field.name, value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer with block ID */}
      <div className="border-t border-slate-200 px-4 py-2 dark:border-slate-700">
        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
          ID: {selectedBlock.id}
        </p>
      </div>
    </div>
  );
}
