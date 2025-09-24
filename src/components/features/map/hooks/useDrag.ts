import { useState } from "react";
import { DragState } from "@/types";

export function useDrag() {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);

  // Helper to get coordinates from mouse or touch event
  const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getEventCoordinates(e);
    setIsDragging(true);
    setDragStart(coords);
    setHasDragged(false);
  };

  const handleMouseMove = (
    e: React.MouseEvent | React.TouchEvent,
    onDrag: (deltaX: number, deltaY: number) => void
  ) => {
    if (!isDragging || !dragStart) return;

    const coords = getEventCoordinates(e);
    const deltaX = coords.x - dragStart.x;
    const deltaY = coords.y - dragStart.y;

    // Only consider it a drag if movement is significant enough
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      setHasDragged(true);
    }

    // Call the drag handler
    onDrag(deltaX, deltaY);

    // Update drag start position for continuous dragging
    setDragStart(coords);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    // Reset hasDragged after a short delay to allow click handlers to check it
    setTimeout(() => setHasDragged(false), 100);
  };

  return {
    isDragging,
    hasDragged,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
