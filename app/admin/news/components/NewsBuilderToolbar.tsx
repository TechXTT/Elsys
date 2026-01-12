"use client";

import React from "react";
import {
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  EyeOff,
  Save,
  FileText,
  PanelRight,
  X,
} from "lucide-react";
import { useNewsBuilder } from "./NewsBuilderContext";

type PreviewMode = "desktop" | "tablet" | "mobile";

interface NewsBuilderToolbarProps {
  onSave?: () => void;
  isSaving?: boolean;
  showPreviewPanel: boolean;
  setShowPreviewPanel: (show: boolean) => void;
  onCancelEdit?: () => void;
  locale?: string;
  onLocaleChange?: (locale: string) => void;
  isLocaleLoading?: boolean;
}

export function NewsBuilderToolbar({
  onSave,
  isSaving,
  showPreviewPanel,
  setShowPreviewPanel,
  onCancelEdit,
  locale,
  onLocaleChange,
  isLocaleLoading,
}: NewsBuilderToolbarProps) {
  const {
    state,
    dispatch,
    canUndo,
    canRedo,
    undo,
    redo,
    isEditing,
    hasChanges,
  } = useNewsBuilder();

  const { previewMode } = state;

  const setPreviewMode = (mode: PreviewMode) => {
    dispatch({ type: "SET_PREVIEW_MODE", mode });
  };

  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
      {/* Left: Post info + Undo/Redo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
          <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {isEditing ? "Editing post" : "New post"}
          </span>
        </div>

        {isEditing && (
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}

        {/* Locale Switcher */}
        {onLocaleChange && locale && (
          <>
            <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1">
              <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => onLocaleChange("bg")}
                  disabled={isLocaleLoading}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    locale === "bg"
                      ? "bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  BG
                </button>
                <button
                  type="button"
                  onClick={() => onLocaleChange("en")}
                  disabled={isLocaleLoading}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    locale === "en"
                      ? "bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  EN
                </button>
              </div>
              {isLocaleLoading && (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
              )}
            </div>
          </>
        )}

        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          onClick={undo}
          disabled={!canUndo}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* Center: Device preview modes */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setPreviewMode("desktop")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              previewMode === "desktop"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
            title="Desktop view"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPreviewMode("tablet")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              previewMode === "tablet"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
            title="Tablet view"
          >
            <Tablet className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPreviewMode("mobile")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              previewMode === "mobile"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
            title="Mobile view"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          onClick={() => setShowPreviewPanel(!showPreviewPanel)}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            showPreviewPanel
              ? "bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          {showPreviewPanel ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {showPreviewPanel ? "Preview" : "Editor"}
        </button>
      </div>

      {/* Right: Save + Panel toggle */}
      <div className="flex items-center gap-2">
        {hasChanges && !isEditing && (
          <span className="mr-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Unsaved changes
          </span>
        )}

        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? "Save changes" : "Save post"}
              </>
            )}
          </button>
        )}

        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          onClick={() => setShowPreviewPanel(!showPreviewPanel)}
          className={`rounded-lg p-2 transition-colors ${
            showPreviewPanel
              ? "bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
          title="Toggle preview panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
