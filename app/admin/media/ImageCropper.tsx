"use client";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { uploadMedia } from "./actions";

// Functional image cropper (G3-2). DESIGN-PENDING — built on tokens, no net-new
// visual language. Center "cover" crop at a chosen aspect ratio, rendered to a
// canvas and re-uploaded to the Media Library; returns the cropped asset URL.
// A full drag-resize crop box is a follow-up once the screen is designed.

const ASPECTS: { key: string; ratio: number | null }[] = [
  { key: "16:9", ratio: 16 / 9 },
  { key: "4:3", ratio: 4 / 3 },
  { key: "1:1", ratio: 1 },
  { key: "original", ratio: null },
];

interface Props {
  open: boolean;
  imageUrl: string;
  folder?: string;
  onClose: () => void;
  onCropped: (url: string) => void;
}

export function ImageCropper({ open, imageUrl, folder = "general", onClose, onCropped }: Props) {
  const t = useTranslations("Admin.media");
  const [aspect, setAspect] = useState<string>("16:9");
  const [zoom, setZoom] = useState<number>(0); // 0–60% tighter center crop
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  if (!open) return null;
  const ratio = ASPECTS.find((a) => a.key === aspect)?.ratio ?? null;

  function crop() {
    setError(null);
    const img = imgRef.current;
    if (!img) return;
    start(async () => {
      try {
        const natW = img.naturalWidth;
        const natH = img.naturalHeight;
        const r = ratio ?? natW / natH;
        // Center cover-crop region at the target ratio, tightened by zoom.
        const scale = 1 - Math.min(0.6, Math.max(0, zoom / 100));
        let cw = Math.round(natW * scale);
        let ch = Math.round(cw / r);
        if (ch > natH * scale) { ch = Math.round(natH * scale); cw = Math.round(ch * r); }
        const sx = Math.round((natW - cw) / 2);
        const sy = Math.round((natH - ch) / 2);

        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no-2d");
        ctx.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);

        const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
        if (!blob) throw new Error("toBlob");
        const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: "image/jpeg" });
        const fd = new FormData();
        fd.append("files", file);
        const res = await uploadMedia(folder, fd);
        if (!res.ok) { setError(res.error); return; }
        // The cropped asset is the newly uploaded one; fetch its URL via the grid
        // is unnecessary — uploadMedia returns ids, but we need the URL. Re-read.
        onCropped(await urlForLatest(res.ids[0]));
        onClose();
      } catch {
        setError(t("cropError"));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={t("cropTitle")} onClick={onClose}>
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-h4 text-ink-heading">{t("cropTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("cancel")} className="rounded p-1 text-ink-muted hover:bg-[var(--color-bg-subtle)]"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ASPECTS.map((a) => (
            <button key={a.key} type="button" onClick={() => setAspect(a.key)}
              className={`rounded-[var(--radius-full)] px-3 py-1 text-caption ${aspect === a.key ? "bg-[var(--color-action-primary)] text-[var(--color-text-on-action)]" : "bg-[var(--color-bg-subtle)] text-ink-muted hover:text-ink"}`}>
              {a.key === "original" ? t("cropOriginal") : a.key}
            </button>
          ))}
        </div>

        {/* Preview with a rule-of-thirds crop frame (Figma 111:2). The crop is a
            centered cover region at the chosen aspect + zoom. */}
        <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-line bg-subtle" style={ratio ? { aspectRatio: String(ratio) } : undefined}>
          {/* crossOrigin allows canvas export; tainted remote hosts fall back to an error (flagged). */}
          <img ref={imgRef} src={imageUrl} crossOrigin="anonymous" alt="" className="h-full w-full object-cover" style={{ transform: `scale(${1 + Math.min(0.6, zoom / 100) * 1.5})` }} />
          <div aria-hidden className="pointer-events-none absolute inset-6 border border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.15)]">
            <div className="absolute left-1/3 top-0 h-full w-px bg-white/40" />
            <div className="absolute left-2/3 top-0 h-full w-px bg-white/40" />
            <div className="absolute top-1/3 left-0 w-full h-px bg-white/40" />
            <div className="absolute top-2/3 left-0 w-full h-px bg-white/40" />
            {["-left-1 -top-1", "-right-1 -top-1", "-left-1 -bottom-1", "-right-1 -bottom-1"].map((pos) => (
              <span key={pos} className={`absolute ${pos} h-2 w-2 rounded-full bg-[var(--color-action-primary)]`} />
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 text-caption text-ink-muted">
          {t("cropScale")}
          <input type="range" min={0} max={60} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--color-action-primary)]" />
        </label>

        {error && <p role="alert" className="text-caption text-[var(--color-status-danger-text)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[var(--radius-md)] border border-line px-4 py-2 text-body-sm text-ink hover:bg-[var(--color-bg-subtle)]">{t("cancel")}</button>
          <button type="button" onClick={crop} disabled={busy} className="rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-text-on-action)] disabled:opacity-50">{busy ? t("uploading") : t("cropConfirm")}</button>
        </div>
      </div>
    </div>
  );
}

// uploadMedia returns ids; resolve the URL of the just-uploaded asset.
async function urlForLatest(id: string): Promise<string> {
  const { fetchMedia } = await import("./actions");
  const items = await fetchMedia();
  return items.find((m) => m.id === id)?.url ?? "";
}
