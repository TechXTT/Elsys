"use client";

import React, { useState, useCallback } from "react";
import { NewsBlockWrapper, EmptyNewsCanvas } from "./NewsBlockWrapper";
import { NewsBlockPreview } from "./NewsBlockPreview";
import { useNewsBuilder } from "../NewsBuilderContext";

export function NewsBlockCanvas() {
  const {
    state,
    selectBlock,
    hoverBlock,
    addBlock,
    removeBlock,
    duplicateBlock,
    moveBlock,
  } = useNewsBuilder();

  const { form, selectedBlockId, hoveredBlockId, previewMode } = state;
  const { blocks } = form;

  const [isDragging, setIsDragging] = useState(false);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(
    null
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, blockId: string, index: number) => {
      e.dataTransfer.setData("application/x-news-block-id", blockId);
      e.dataTransfer.setData("application/x-news-block-index", String(index));
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
      setDragSourceIndex(index);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragSourceIndex(null);
    setDropTargetIndex(null);
    setDropPosition(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number, blockRef: HTMLDivElement | null) => {
      e.preventDefault();
      e.stopPropagation();

      if (!blockRef) return;

      const rect = blockRef.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? "before" : "after";

      setDropTargetIndex(index);
      setDropPosition(position);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      const blockType = e.dataTransfer.getData("application/x-news-block-type");
      const fromId = e.dataTransfer.getData("application/x-news-block-id");
      const fromIndexStr = e.dataTransfer.getData(
        "application/x-news-block-index"
      );

      const insertIndex =
        dropPosition === "after" ? targetIndex + 1 : targetIndex;

      if (blockType) {
        // New block from palette
        addBlock(blockType, insertIndex);
      } else if (fromId && fromIndexStr) {
        // Existing block being moved
        const fromIndex = parseInt(fromIndexStr);
        const toIndex = insertIndex > fromIndex ? insertIndex - 1 : insertIndex;
        if (fromIndex !== toIndex) {
          moveBlock(fromIndex, toIndex);
        }
      }

      handleDragEnd();
    },
    [dropPosition, addBlock, moveBlock, handleDragEnd]
  );

  const handleEmptyCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const blockType = e.dataTransfer.getData("application/x-news-block-type");
      if (blockType) {
        addBlock(blockType, 0);
      }
    },
    [addBlock]
  );

  const handleCanvasClick = useCallback(() => {
    selectBlock(null);
  }, [selectBlock]);

  // Calculate preview width based on mode
  const previewWidth =
    previewMode === "mobile"
      ? "375px"
      : previewMode === "tablet"
        ? "768px"
        : "100%";

  return (
    <div
      className="flex-1 overflow-y-auto bg-slate-100 p-6 dark:bg-slate-900/50"
      onClick={handleCanvasClick}
    >
      <div
        className="mx-auto transition-all duration-300"
        style={{ maxWidth: previewWidth }}
      >
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-slate-800">
          {blocks.length === 0 ? (
            <EmptyNewsCanvas onDrop={handleEmptyCanvasDrop} />
          ) : (
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <NewsBlockWrapper
                  key={block.id}
                  block={block}
                  index={index}
                  totalBlocks={blocks.length}
                  isSelected={selectedBlockId === block.id}
                  isHovered={hoveredBlockId === block.id}
                  isDragging={isDragging && dropTargetIndex === index}
                  dropPosition={dropTargetIndex === index ? dropPosition : null}
                  onSelect={() => {
                    selectBlock(block.id);
                  }}
                  onHover={(isHovering) =>
                    hoverBlock(isHovering ? block.id : null)
                  }
                  onRemove={() => removeBlock(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onMoveUp={() => {
                    if (index > 0) moveBlock(index, index - 1);
                  }}
                  onMoveDown={() => {
                    if (index < blocks.length - 1) moveBlock(index, index + 1);
                  }}
                  onDragStart={(e) => handleDragStart(e, block.id, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) =>
                    handleDragOver(
                      e,
                      index,
                      e.currentTarget as HTMLDivElement
                    )
                  }
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <NewsBlockPreview block={block} />
                </NewsBlockWrapper>
              ))}

              {/* Drop zone at the end */}
              {isDragging && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropTargetIndex(blocks.length);
                    setDropPosition("before");
                  }}
                  onDrop={(e) => handleDrop(e, blocks.length)}
                  className="h-16 rounded-lg border-2 border-dashed border-brand-300 bg-brand-50/50 transition-colors dark:border-brand-600 dark:bg-brand-950/30"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
