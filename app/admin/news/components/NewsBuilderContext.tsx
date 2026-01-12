"use client";

import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from "react";
import type { NewsBlockInstance } from "./blocks/types";
import { getNewsBlockMeta } from "./blocks/block-meta";

// Types
export type ImageSize = "small" | "medium" | "large" | "full";

export interface SelectedImage {
  file: File | null;
  preview: string;
  name: string;
  size: ImageSize;
  origin: "new" | "existing";
  url?: string;
}

export interface NewsFormState {
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  markdown: string;
  date: string;
  published: boolean;
  images: SelectedImage[];
  featuredImage: string | null;
  // Block-based content
  blocks: NewsBlockInstance[];
  useBlocks: boolean; // Toggle between markdown and block mode
}

export interface NewsBuilderState {
  form: NewsFormState;
  editingId: string | null;
  isPrefilling: boolean;
  history: NewsFormState[];
  historyIndex: number;
  previewMode: "desktop" | "tablet" | "mobile";
  showPreview: boolean;
  // Block editor state
  selectedBlockId: string | null;
  hoveredBlockId: string | null;
}

// Actions
type Action =
  | { type: "SET_FIELD"; field: keyof NewsFormState; value: unknown }
  | { type: "SET_FORM"; form: Partial<NewsFormState> }
  | { type: "RESET_FORM" }
  | { type: "SET_EDITING_ID"; id: string | null }
  | { type: "SET_PREFILLING"; isPrefilling: boolean }
  | { type: "ADD_IMAGE"; image: SelectedImage }
  | { type: "REMOVE_IMAGE"; name: string }
  | { type: "UPDATE_IMAGE_SIZE"; name: string; size: ImageSize }
  | { type: "SET_FEATURED_IMAGE"; name: string | null }
  | { type: "SET_IMAGES"; images: SelectedImage[] }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SNAPSHOT" }
  | { type: "SET_PREVIEW_MODE"; mode: "desktop" | "tablet" | "mobile" }
  | { type: "TOGGLE_PREVIEW" }
  // Block actions
  | { type: "ADD_BLOCK"; blockType: string; index?: number }
  | { type: "REMOVE_BLOCK"; blockId: string }
  | { type: "UPDATE_BLOCK"; blockId: string; props: Record<string, unknown> }
  | { type: "MOVE_BLOCK"; fromIndex: number; toIndex: number }
  | { type: "DUPLICATE_BLOCK"; blockId: string }
  | { type: "SELECT_BLOCK"; blockId: string | null }
  | { type: "HOVER_BLOCK"; blockId: string | null }
  | { type: "TOGGLE_BLOCK_MODE" };

function getTodayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(): NewsFormState {
  return {
    title: "",
    slug: "",
    slugTouched: false,
    excerpt: "",
    markdown: "",
    date: getTodayInputValue(),
    published: false,
    images: [],
    featuredImage: null,
    blocks: [],
    useBlocks: true, // Default to block mode
  };
}

function createInitialState(): NewsBuilderState {
  const initialForm = createInitialForm();
  return {
    form: initialForm,
    editingId: null,
    isPrefilling: false,
    history: [initialForm],
    historyIndex: 0,
    previewMode: "desktop",
    showPreview: false,
    selectedBlockId: null,
    hoveredBlockId: null,
  };
}

// Helper to create a new block
function createBlock(blockType: string): NewsBlockInstance {
  const meta = getNewsBlockMeta(blockType);
  return {
    id: crypto.randomUUID(),
    type: blockType,
    props: meta?.defaultProps ? { ...meta.defaultProps } : {},
  };
}

// Helper to create snapshot and add to history
function withSnapshot(state: NewsBuilderState, newForm: NewsFormState): NewsBuilderState {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(newForm);
  // Limit history to 50 entries
  if (newHistory.length > 50) {
    newHistory.shift();
  }
  return {
    ...state,
    form: newForm,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

function reducer(state: NewsBuilderState, action: Action): NewsBuilderState {
  switch (action.type) {
    case "SET_FIELD": {
      const newForm = { ...state.form, [action.field]: action.value };
      // Only snapshot for content fields, not meta fields like slugTouched
      if (["title", "slug", "excerpt", "markdown", "date", "published"].includes(action.field)) {
        return withSnapshot(state, newForm);
      }
      return { ...state, form: newForm };
    }

    case "SET_FORM": {
      const newForm = { ...state.form, ...action.form };
      return withSnapshot(state, newForm);
    }

    case "RESET_FORM": {
      const newForm = createInitialForm();
      return {
        ...state,
        form: newForm,
        editingId: null,
        history: [newForm],
        historyIndex: 0,
      };
    }

    case "SET_EDITING_ID":
      return { ...state, editingId: action.id };

    case "SET_PREFILLING":
      return { ...state, isPrefilling: action.isPrefilling };

    case "ADD_IMAGE": {
      const newImages = [...state.form.images, action.image];
      const newFeatured = state.form.featuredImage ?? action.image.name;
      const newForm = { ...state.form, images: newImages, featuredImage: newFeatured };
      return withSnapshot(state, newForm);
    }

    case "REMOVE_IMAGE": {
      const newImages = state.form.images.filter((img) => img.name !== action.name);
      const newFeatured =
        state.form.featuredImage === action.name
          ? newImages[0]?.name ?? null
          : state.form.featuredImage;
      const newForm = { ...state.form, images: newImages, featuredImage: newFeatured };
      return withSnapshot(state, newForm);
    }

    case "UPDATE_IMAGE_SIZE": {
      const newImages = state.form.images.map((img) =>
        img.name === action.name ? { ...img, size: action.size } : img
      );
      const newForm = { ...state.form, images: newImages };
      return { ...state, form: newForm };
    }

    case "SET_FEATURED_IMAGE": {
      const newForm = { ...state.form, featuredImage: action.name };
      return { ...state, form: newForm };
    }

    case "SET_IMAGES": {
      const newForm = { ...state.form, images: action.images };
      return { ...state, form: newForm };
    }

    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        form: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        form: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case "SNAPSHOT": {
      return withSnapshot(state, state.form);
    }

    case "SET_PREVIEW_MODE":
      return { ...state, previewMode: action.mode };

    case "TOGGLE_PREVIEW":
      return { ...state, showPreview: !state.showPreview };

    // Block actions
    case "ADD_BLOCK": {
      const newBlock = createBlock(action.blockType);
      const blocks = [...state.form.blocks];
      const index = action.index ?? blocks.length;
      blocks.splice(index, 0, newBlock);
      const newForm = { ...state.form, blocks };
      return {
        ...withSnapshot(state, newForm),
        selectedBlockId: newBlock.id,
      };
    }

    case "REMOVE_BLOCK": {
      const blocks = state.form.blocks.filter((b) => b.id !== action.blockId);
      const newForm = { ...state.form, blocks };
      return {
        ...withSnapshot(state, newForm),
        selectedBlockId: state.selectedBlockId === action.blockId ? null : state.selectedBlockId,
      };
    }

    case "UPDATE_BLOCK": {
      const blocks = state.form.blocks.map((b) =>
        b.id === action.blockId ? { ...b, props: { ...b.props, ...action.props } } : b
      );
      const newForm = { ...state.form, blocks };
      return withSnapshot(state, newForm);
    }

    case "MOVE_BLOCK": {
      const blocks = [...state.form.blocks];
      const [removed] = blocks.splice(action.fromIndex, 1);
      blocks.splice(action.toIndex, 0, removed);
      const newForm = { ...state.form, blocks };
      return withSnapshot(state, newForm);
    }

    case "DUPLICATE_BLOCK": {
      const blockIndex = state.form.blocks.findIndex((b) => b.id === action.blockId);
      if (blockIndex === -1) return state;
      const originalBlock = state.form.blocks[blockIndex];
      const newBlock: NewsBlockInstance = {
        id: crypto.randomUUID(),
        type: originalBlock.type,
        props: { ...originalBlock.props },
      };
      const blocks = [...state.form.blocks];
      blocks.splice(blockIndex + 1, 0, newBlock);
      const newForm = { ...state.form, blocks };
      return {
        ...withSnapshot(state, newForm),
        selectedBlockId: newBlock.id,
      };
    }

    case "SELECT_BLOCK":
      return { ...state, selectedBlockId: action.blockId };

    case "HOVER_BLOCK":
      return { ...state, hoveredBlockId: action.blockId };

    case "TOGGLE_BLOCK_MODE": {
      const newForm = { ...state.form, useBlocks: !state.form.useBlocks };
      return { ...state, form: newForm };
    }

    default:
      return state;
  }
}

// Context type
interface NewsBuilderContextType {
  state: NewsBuilderState;
  dispatch: React.Dispatch<Action>;
  // Convenience methods
  setField: <K extends keyof NewsFormState>(field: K, value: NewsFormState[K]) => void;
  setForm: (form: Partial<NewsFormState>) => void;
  resetForm: () => void;
  setEditingId: (id: string | null) => void;
  setPrefilling: (isPrefilling: boolean) => void;
  addImage: (image: SelectedImage) => void;
  removeImage: (name: string) => void;
  updateImageSize: (name: string, size: ImageSize) => void;
  setFeaturedImage: (name: string | null) => void;
  setImages: (images: SelectedImage[]) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  isEditing: boolean;
  hasChanges: boolean;
  // Block methods
  addBlock: (blockType: string, index?: number) => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, props: Record<string, unknown>) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  duplicateBlock: (blockId: string) => void;
  selectBlock: (blockId: string | null) => void;
  hoverBlock: (blockId: string | null) => void;
  toggleBlockMode: () => void;
  selectedBlock: NewsBlockInstance | null;
}

const NewsBuilderContext = createContext<NewsBuilderContextType | null>(null);

interface NewsBuilderProviderProps {
  children: ReactNode;
  onChange?: (form: NewsFormState) => void;
}

export function NewsBuilderProvider({ children, onChange }: NewsBuilderProviderProps) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  // Notify parent of changes
  React.useEffect(() => {
    onChange?.(state.form);
  }, [state.form, onChange]);

  const setField = useCallback(<K extends keyof NewsFormState>(field: K, value: NewsFormState[K]) => {
    dispatch({ type: "SET_FIELD", field, value });
  }, []);

  const setForm = useCallback((form: Partial<NewsFormState>) => {
    dispatch({ type: "SET_FORM", form });
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: "RESET_FORM" });
  }, []);

  const setEditingId = useCallback((id: string | null) => {
    dispatch({ type: "SET_EDITING_ID", id });
  }, []);

  const setPrefilling = useCallback((isPrefilling: boolean) => {
    dispatch({ type: "SET_PREFILLING", isPrefilling });
  }, []);

  const addImage = useCallback((image: SelectedImage) => {
    dispatch({ type: "ADD_IMAGE", image });
  }, []);

  const removeImage = useCallback((name: string) => {
    dispatch({ type: "REMOVE_IMAGE", name });
  }, []);

  const updateImageSize = useCallback((name: string, size: ImageSize) => {
    dispatch({ type: "UPDATE_IMAGE_SIZE", name, size });
  }, []);

  const setFeaturedImage = useCallback((name: string | null) => {
    dispatch({ type: "SET_FEATURED_IMAGE", name });
  }, []);

  const setImages = useCallback((images: SelectedImage[]) => {
    dispatch({ type: "SET_IMAGES", images });
  }, []);

  // Block methods
  const addBlock = useCallback((blockType: string, index?: number) => {
    dispatch({ type: "ADD_BLOCK", blockType, index });
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    dispatch({ type: "REMOVE_BLOCK", blockId });
  }, []);

  const updateBlock = useCallback((blockId: string, props: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_BLOCK", blockId, props });
  }, []);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: "MOVE_BLOCK", fromIndex, toIndex });
  }, []);

  const duplicateBlock = useCallback((blockId: string) => {
    dispatch({ type: "DUPLICATE_BLOCK", blockId });
  }, []);

  const selectBlock = useCallback((blockId: string | null) => {
    dispatch({ type: "SELECT_BLOCK", blockId });
  }, []);

  const hoverBlock = useCallback((blockId: string | null) => {
    dispatch({ type: "HOVER_BLOCK", blockId });
  }, []);

  const toggleBlockMode = useCallback(() => {
    dispatch({ type: "TOGGLE_BLOCK_MODE" });
  }, []);

  const selectedBlock = React.useMemo(() => {
    if (!state.selectedBlockId) return null;
    return state.form.blocks.find((b) => b.id === state.selectedBlockId) ?? null;
  }, [state.selectedBlockId, state.form.blocks]);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const isEditing = state.editingId !== null;

  // Determine if there are unsaved changes (compare current form to initial)
  const hasChanges = React.useMemo(() => {
    const initial = createInitialForm();
    if (state.editingId) {
      // When editing, we always consider there might be changes
      return true;
    }
    return (
      state.form.title !== initial.title ||
      state.form.slug !== initial.slug ||
      state.form.excerpt !== initial.excerpt ||
      state.form.markdown !== initial.markdown ||
      state.form.images.length > 0 ||
      state.form.blocks.length > 0
    );
  }, [state.form, state.editingId]);

  return (
    <NewsBuilderContext.Provider
      value={{
        state,
        dispatch,
        setField,
        setForm,
        resetForm,
        setEditingId,
        setPrefilling,
        addImage,
        removeImage,
        updateImageSize,
        setFeaturedImage,
        setImages,
        canUndo,
        canRedo,
        undo,
        redo,
        isEditing,
        hasChanges,
        // Block methods
        addBlock,
        removeBlock,
        updateBlock,
        moveBlock,
        duplicateBlock,
        selectBlock,
        hoverBlock,
        toggleBlockMode,
        selectedBlock,
      }}
    >
      {children}
    </NewsBuilderContext.Provider>
  );
}

export function useNewsBuilder() {
  const ctx = useContext(NewsBuilderContext);
  if (!ctx) throw new Error("useNewsBuilder must be used within NewsBuilderProvider");
  return ctx;
}
