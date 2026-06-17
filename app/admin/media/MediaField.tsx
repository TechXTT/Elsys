"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";
import { MediaPicker } from "./MediaPicker";

interface Props {
  name: string;
  defaultValue?: string;
  required?: boolean;
  /** Scope the picker to a folder (e.g. the content type's area). */
  folder?: string;
  /** Optional companion field name to receive the picked alt text. */
  altName?: string;
  defaultAlt?: string;
}

/**
 * Image form field backed by the Media Library (G2-1). Submits the chosen
 * asset URL via a hidden input so it drops into any FormData-based form.
 * Falls back to manual URL entry. Used by ContentForm `image` fields.
 */
export function MediaField({ name, defaultValue, required, folder, altName, defaultAlt }: Props) {
  const t = useTranslations("Admin.media");
  const [url, setUrl] = useState(defaultValue ?? "");
  const [alt, setAlt] = useState(defaultAlt ?? "");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {altName && <input type="hidden" name={altName} value={alt} />}

      {url ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-2">
          {/* admin preview, remote blob — plain img avoids next/image host config */}
          <img src={url} alt="" className="h-16 w-24 rounded object-cover" />
          <span className="min-w-0 flex-1 truncate text-body-sm text-ink-muted">{url}</span>
          <button
            type="button"
            onClick={() => { setUrl(""); setAlt(""); }}
            aria-label={t("removeImage")}
            className="rounded p-1 text-ink-muted hover:bg-[var(--color-bg-subtle)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line px-3 py-2 text-body-sm text-ink hover:bg-[var(--color-bg-subtle)]"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          {t("choose")}
        </button>
        <input
          type="text"
          name={name}
          value={url}
          required={required}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="min-w-[200px] flex-1 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:border-[var(--color-action-primary)] focus:outline-none"
        />
      </div>

      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        defaultFolder={folder}
        onSelect={(r) => { setUrl(r.url); setAlt(r.alt); }}
      />
    </div>
  );
}
