"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  EyeOff,
  Save,
  Check,
  X,
  Maximize2,
  Minimize2,
  Code,
  Layers,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
  Settings,
} from "lucide-react";
import { PageBuilderProvider, usePageBuilder } from "./PageBuilderContext";
import { BlockPalette } from "./BlockPalette";
import { BuilderCanvas } from "./BuilderCanvas";
import { PropertyPanel } from "./PropertyPanel";
import type { BlockInstance } from "./types";

type PreviewMode = "desktop" | "tablet" | "mobile";

const previewWidths: Record<PreviewMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

function BuilderToolbar({
  previewMode,
  setPreviewMode,
  showLeftPanel,
  setShowLeftPanel,
  showRightPanel,
  setShowRightPanel,
  showPreview,
  setShowPreview,
  onSave,
  isSaving,
  hasChanges,
}: {
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;
  showLeftPanel: boolean;
  setShowLeftPanel: (show: boolean) => void;
  showRightPanel: boolean;
  setShowRightPanel: (show: boolean) => void;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  onSave?: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
}) {
  const { canUndo, canRedo, undo, redo, state } = usePageBuilder();

  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
      {/* Left: Undo/Redo + Panel toggles */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowLeftPanel(!showLeftPanel)}
          className={`rounded-lg p-2 transition-colors ${
            showLeftPanel
              ? "bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
          title="Toggle blocks panel"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          onClick={undo}
          disabled={!canUndo}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-1 text-sm text-slate-500">
          <Layers className="h-4 w-4" />
          <span>{state.blocks.length} blocks</span>
        </div>
      </div>

      {/* Center: Device preview + mode toggle */}
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
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            showPreview
              ? "bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          {showPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {showPreview ? "Preview" : "Edit"}
        </button>
      </div>

      {/* Right: Save + Properties toggle */}
      <div className="flex items-center gap-2">
        {hasChanges && (
          <span className="mr-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Unsaved changes
          </span>
        )}

        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving || !hasChanges}
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
                Save
              </>
            )}
          </button>
        )}

        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          onClick={() => setShowRightPanel(!showRightPanel)}
          className={`rounded-lg p-2 transition-colors ${
            showRightPanel
              ? "bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
          title="Toggle properties panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BuilderLayout({
  showPreview,
  previewMode,
  showLeftPanel,
  showRightPanel,
}: {
  showPreview: boolean;
  previewMode: PreviewMode;
  showLeftPanel: boolean;
  showRightPanel: boolean;
}) {
  const { state } = usePageBuilder();

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel - Block Palette */}
      {showLeftPanel && (
        <div className="flex w-96 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-3 dark:border-slate-700">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Layers className="h-4 w-4 text-brand-600" />
              Blocks
            </h3>
          </div>
          <BlockPalette />
        </div>
      )}

      {/* Main Canvas */}
      <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950">
        <div
          className="mx-auto h-full transition-all duration-300"
          style={{
            maxWidth: previewWidths[previewMode],
            padding: previewMode === "desktop" ? "0" : "1.5rem",
          }}
        >
          <div
            className={`min-h-full ${
              previewMode !== "desktop"
                ? "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                : "bg-white dark:bg-slate-900"
            }`}
          >
            <BuilderCanvas />
          </div>
        </div>
      </div>

      {/* Right Panel - Properties */}
      {showRightPanel && (
        <div className="w-[28rem] flex-shrink-0 border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <PropertyPanel />
        </div>
      )}
    </div>
  );
}

// Convert internal BlockInstance[] to the format expected by the CMS
function toExternalBlocks(blocks: BlockInstance[]): Array<{ type: string; props: Record<string, unknown> }> {
  return blocks.map((b) => ({
    type: b.type,
    props: b.props,
  }));
}

// Convert CMS block format to internal BlockInstance[]
function toInternalBlocks(blocks: Array<{ type: string; props?: Record<string, unknown> | null }>): BlockInstance[] {
  return blocks.map((b, i) => ({
    id: `block-${i}-${Date.now()}`,
    type: b.type,
    props: (b.props ?? {}) as Record<string, unknown>,
  }));
}

type PageBuilderProps = {
  initialBlocks?: Array<{ type: string; props?: Record<string, unknown> | null }>;
  onChange?: (blocks: Array<{ type: string; props: Record<string, unknown> }>) => void;
  onSave?: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
};

function PageBuilderInner({
  onChange,
  onSave,
  isSaving,
  hasChanges,
}: Omit<PageBuilderProps, "initialBlocks">) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const { state } = usePageBuilder();

  // Sync blocks to parent
  useEffect(() => {
    onChange?.(toExternalBlocks(state.blocks));
  }, [state.blocks, onChange]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave?.();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        // Undo is handled by context
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        // Redo is handled by context
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
      <BuilderToolbar
        previewMode={previewMode}
        setPreviewMode={setPreviewMode}
        showLeftPanel={showLeftPanel}
        setShowLeftPanel={setShowLeftPanel}
        showRightPanel={showRightPanel}
        setShowRightPanel={setShowRightPanel}
        showPreview={showPreview}
        setShowPreview={setShowPreview}
        onSave={onSave}
        isSaving={isSaving}
        hasChanges={hasChanges}
      />
      <BuilderLayout
        showPreview={showPreview}
        previewMode={previewMode}
        showLeftPanel={showLeftPanel}
        showRightPanel={showRightPanel}
      />
    </div>
  );
}

export function PageBuilder({
  initialBlocks = [],
  onChange,
  onSave,
  isSaving,
  hasChanges,
}: PageBuilderProps) {
  const internalBlocks = toInternalBlocks(initialBlocks);

  return (
    <PageBuilderProvider initialBlocks={internalBlocks}>
      <PageBuilderInner
        onChange={onChange}
        onSave={onSave}
        isSaving={isSaving}
        hasChanges={hasChanges}
      />
    </PageBuilderProvider>
  );
}

export default PageBuilder;
