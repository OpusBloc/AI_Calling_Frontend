"use client";

import { useState } from "react";
import type React from "react";

/** Returns a copy of `list` with the item at `from` moved to index `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * HTML5 drag-and-drop reordering for a list rendered by index.
 *
 * Spread `itemProps(i)` on each item. With `handle: true` an item only becomes
 * draggable while its `handleProps(i)` element is pressed — use that when the
 * item contains an input, so selecting text doesn't start a drag.
 */
export function useDragReorder(
  onMove: (from: number, to: number) => void,
  { handle = false }: { handle?: boolean } = {},
) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [armedIndex, setArmedIndex] = useState<number | null>(null);

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
    setArmedIndex(null);
  };

  const itemProps = (index: number) => ({
    draggable: handle ? armedIndex === index : true,
    onDragStart: (e: React.DragEvent) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      // Firefox only starts a drag when some data is set.
      e.dataTransfer.setData("text/plain", String(index));
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (overIndex !== index) setOverIndex(index);
    },
    onDrop: (e: React.DragEvent) => {
      if (dragIndex === null) return;
      e.preventDefault();
      if (dragIndex !== index) onMove(dragIndex, index);
      reset();
    },
    onDragEnd: reset,
  });

  const handleProps = (index: number) => ({
    onPointerDown: () => setArmedIndex(index),
    onPointerUp: () => setArmedIndex(null),
    style: { cursor: "grab", touchAction: "none" } as React.CSSProperties,
  });

  return { dragIndex, overIndex, itemProps, handleProps };
}
