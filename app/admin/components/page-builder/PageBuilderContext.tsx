"use client";

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import type { BlockInstance } from "./types";

// State
type PageBuilderState = {
  blocks: BlockInstance[];
  selectedBlockId: string | null;
  hoveredBlockId: string | null;
  isDragging: boolean;
  dragSource: { type: 'palette' | 'canvas'; blockType?: string; blockId?: string; index?: number } | null;
  dropTarget: { index: number; position: 'before' | 'after' } | null;
  history: BlockInstance[][];
  historyIndex: number;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  showPreview: boolean;
};

// Actions
type Action =
  | { type: 'SET_BLOCKS'; blocks: BlockInstance[] }
  | { type: 'ADD_BLOCK'; blockType: string; index?: number; props?: Record<string, unknown> }
  | { type: 'REMOVE_BLOCK'; blockId: string }
  | { type: 'UPDATE_BLOCK'; blockId: string; props: Record<string, unknown> }
  | { type: 'MOVE_BLOCK'; fromIndex: number; toIndex: number }
  | { type: 'DUPLICATE_BLOCK'; blockId: string }
  | { type: 'SELECT_BLOCK'; blockId: string | null }
  | { type: 'HOVER_BLOCK'; blockId: string | null }
  | { type: 'START_DRAG'; source: PageBuilderState['dragSource'] }
  | { type: 'SET_DROP_TARGET'; target: PageBuilderState['dropTarget'] }
  | { type: 'END_DRAG' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_PREVIEW_MODE'; mode: 'desktop' | 'tablet' | 'mobile' }
  | { type: 'TOGGLE_PREVIEW' };

// Default block props by type
const defaultBlockProps: Record<string, Record<string, unknown>> = {
  Hero: {
    heading: "Welcome to TUES",
    subheading: "Technology, Innovation, Excellence",
    image: "/images/hero-bg.jpg",
    cta: { label: "Learn More", href: "/about" },
  },
  Section: {
    title: "New Section",
    description: "",
    markdown: "",
  },
  Markdown: {
    value: "Start writing your content here...\n\n**Bold text** and *italic text* are supported.",
  },
  NewsList: {
    title: "Latest News",
    description: "Stay updated with our latest announcements",
    limit: 6,
  },
  Testimonials: {
    title: "What Our Students Say",
    items: [],
  },
  AdmissionsTimeline: {
    title: "Admission Process",
    steps: [],
  },
  CTA: {
    title: "Ready to Join?",
    description: "Apply now and start your journey",
    primaryButton: { label: "Apply Now", href: "/apply" },
    secondaryButton: { label: "Learn More", href: "/about" },
  },
  Grid: {
    columns: 3,
    gap: 4,
    items: [],
  },
  MediaGallery: {
    title: "Gallery",
    images: [],
    layout: "grid",
  },
  Divider: {
    style: "line",
    spacing: "md",
  },
  Spacer: {
    height: "md",
  },
  Quote: {
    text: "Education is the most powerful weapon which you can use to change the world.",
    author: "Nelson Mandela",
    role: "",
  },
  Stats: {
    items: [
      { value: "1000+", label: "Students" },
      { value: "50+", label: "Teachers" },
      { value: "30+", label: "Years" },
    ],
  },
  Features: {
    title: "Why Choose Us",
    items: [],
    layout: "grid",
  },
  Accordion: {
    title: "Frequently Asked Questions",
    items: [],
  },
  Tabs: {
    tabs: [],
  },
  Embed: {
    url: "",
    type: "video",
    aspectRatio: "16:9",
  },
};

function createBlock(blockType: string, props?: Record<string, unknown>): BlockInstance {
  return {
    id: crypto.randomUUID(),
    type: blockType,
    props: { ...defaultBlockProps[blockType], ...props },
  };
}

function reducer(state: PageBuilderState, action: Action): PageBuilderState {
  switch (action.type) {
    case 'SET_BLOCKS':
      return {
        ...state,
        blocks: action.blocks,
        history: [action.blocks],
        historyIndex: 0,
      };

    case 'ADD_BLOCK': {
      const newBlock = createBlock(action.blockType, action.props);
      const newBlocks = [...state.blocks];
      const insertIndex = action.index ?? newBlocks.length;
      newBlocks.splice(insertIndex, 0, newBlock);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newBlocks);
      return {
        ...state,
        blocks: newBlocks,
        selectedBlockId: newBlock.id,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'REMOVE_BLOCK': {
      const newBlocks = state.blocks.filter((b) => b.id !== action.blockId);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newBlocks);
      return {
        ...state,
        blocks: newBlocks,
        selectedBlockId: state.selectedBlockId === action.blockId ? null : state.selectedBlockId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'UPDATE_BLOCK': {
      const newBlocks = state.blocks.map((b) =>
        b.id === action.blockId ? { ...b, props: action.props } : b
      );
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newBlocks);
      return {
        ...state,
        blocks: newBlocks,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'MOVE_BLOCK': {
      const newBlocks = [...state.blocks];
      const [moved] = newBlocks.splice(action.fromIndex, 1);
      newBlocks.splice(action.toIndex, 0, moved);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newBlocks);
      return {
        ...state,
        blocks: newBlocks,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'DUPLICATE_BLOCK': {
      const idx = state.blocks.findIndex((b) => b.id === action.blockId);
      if (idx === -1) return state;
      const original = state.blocks[idx];
      const duplicate = createBlock(original.type, JSON.parse(JSON.stringify(original.props)));
      const newBlocks = [...state.blocks];
      newBlocks.splice(idx + 1, 0, duplicate);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newBlocks);
      return {
        ...state,
        blocks: newBlocks,
        selectedBlockId: duplicate.id,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'SELECT_BLOCK':
      return { ...state, selectedBlockId: action.blockId };

    case 'HOVER_BLOCK':
      return { ...state, hoveredBlockId: action.blockId };

    case 'START_DRAG':
      return { ...state, isDragging: true, dragSource: action.source };

    case 'SET_DROP_TARGET':
      return { ...state, dropTarget: action.target };

    case 'END_DRAG':
      return { ...state, isDragging: false, dragSource: null, dropTarget: null };

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        blocks: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        blocks: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case 'SET_PREVIEW_MODE':
      return { ...state, previewMode: action.mode };

    case 'TOGGLE_PREVIEW':
      return { ...state, showPreview: !state.showPreview };

    default:
      return state;
  }
}

// Context
type PageBuilderContextType = {
  state: PageBuilderState;
  dispatch: React.Dispatch<Action>;
  // Convenience methods
  addBlock: (blockType: string, index?: number, props?: Record<string, unknown>) => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, props: Record<string, unknown>) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  duplicateBlock: (blockId: string) => void;
  selectBlock: (blockId: string | null) => void;
  getSelectedBlock: () => BlockInstance | null;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
};

const PageBuilderContext = createContext<PageBuilderContextType | null>(null);

export function PageBuilderProvider({
  children,
  initialBlocks = [],
  onChange,
}: {
  children: ReactNode;
  initialBlocks?: BlockInstance[];
  onChange?: (blocks: BlockInstance[]) => void;
}) {
  const [state, dispatch] = useReducer(reducer, {
    blocks: initialBlocks,
    selectedBlockId: null,
    hoveredBlockId: null,
    isDragging: false,
    dragSource: null,
    dropTarget: null,
    history: [initialBlocks],
    historyIndex: 0,
    previewMode: 'desktop',
    showPreview: false,
  });

  // Notify parent of changes
  React.useEffect(() => {
    onChange?.(state.blocks);
  }, [state.blocks, onChange]);

  const addBlock = useCallback((blockType: string, index?: number, props?: Record<string, unknown>) => {
    dispatch({ type: 'ADD_BLOCK', blockType, index, props });
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    dispatch({ type: 'REMOVE_BLOCK', blockId });
  }, []);

  const updateBlock = useCallback((blockId: string, props: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_BLOCK', blockId, props });
  }, []);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'MOVE_BLOCK', fromIndex, toIndex });
  }, []);

  const duplicateBlock = useCallback((blockId: string) => {
    dispatch({ type: 'DUPLICATE_BLOCK', blockId });
  }, []);

  const selectBlock = useCallback((blockId: string | null) => {
    dispatch({ type: 'SELECT_BLOCK', blockId });
  }, []);

  const getSelectedBlock = useCallback(() => {
    return state.blocks.find((b) => b.id === state.selectedBlockId) ?? null;
  }, [state.blocks, state.selectedBlockId]);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  return (
    <PageBuilderContext.Provider
      value={{
        state,
        dispatch,
        addBlock,
        removeBlock,
        updateBlock,
        moveBlock,
        duplicateBlock,
        selectBlock,
        getSelectedBlock,
        canUndo,
        canRedo,
        undo,
        redo,
      }}
    >
      {children}
    </PageBuilderContext.Provider>
  );
}

export function usePageBuilder() {
  const ctx = useContext(PageBuilderContext);
  if (!ctx) throw new Error("usePageBuilder must be used within PageBuilderProvider");
  return ctx;
}
