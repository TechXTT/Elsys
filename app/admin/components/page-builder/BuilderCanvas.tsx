"use client";

import React from "react";
import { usePageBuilder } from "./PageBuilderContext";
import { BlockWrapper, EmptyCanvas } from "./BlockWrapper";

export function BuilderCanvas() {
  const { state, dispatch } = usePageBuilder();
  const { blocks, selectedBlockId, hoveredBlockId } = state;

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on canvas, not on a block
    if (e.target === e.currentTarget) {
      dispatch({ type: 'SELECT_BLOCK', blockId: null });
    }
  };

  // Handle drops at the end of the list
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (blocks.length > 0) {
      dispatch({ type: 'SET_DROP_TARGET', target: { index: blocks.length - 1, position: 'after' } });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData("application/x-block-type");
    if (blockType && blocks.length === 0) {
      dispatch({ type: 'ADD_BLOCK', blockType, index: 0 });
    }
    dispatch({ type: 'END_DRAG' });
  };

  if (blocks.length === 0) {
    return <EmptyCanvas />;
  }

  return (
    <div
      onClick={handleCanvasClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="min-h-[600px] space-y-4 p-4"
    >
      {blocks.map((block, index) => (
        <BlockWrapper
          key={block.id}
          block={block}
          index={index}
          isSelected={selectedBlockId === block.id}
          isHovered={hoveredBlockId === block.id}
          onSelect={() => dispatch({ type: 'SELECT_BLOCK', blockId: block.id })}
          onHover={(isHovering) => dispatch({ type: 'HOVER_BLOCK', blockId: isHovering ? block.id : null })}
        />
      ))}
      
      {/* Drop zone at the end */}
      {state.isDragging && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            dispatch({ type: 'SET_DROP_TARGET', target: { index: blocks.length - 1, position: 'after' } });
          }}
          className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:border-brand-500"
        >
          Drop here to add at the end
        </div>
      )}
    </div>
  );
}
