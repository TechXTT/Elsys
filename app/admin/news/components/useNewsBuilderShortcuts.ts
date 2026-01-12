"use client";

import { useEffect } from "react";
import { useNewsBuilder } from "./NewsBuilderContext";

interface UseNewsBuilderShortcutsOptions {
  onSave?: () => void;
}

export function useNewsBuilderShortcuts({ onSave }: UseNewsBuilderShortcutsOptions = {}) {
  const { undo, redo, canUndo, canRedo } = useNewsBuilder();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl+S / Cmd+S - Save
      if (isMod && e.key === "s") {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Ctrl+Z / Cmd+Z - Undo
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
        return;
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z - Redo
      if (isMod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
        return;
      }

      // Ctrl+Y / Cmd+Y - Redo (alternative)
      if (isMod && e.key === "y") {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, undo, redo, canUndo, canRedo]);
}
