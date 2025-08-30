import React, { useState, useRef, useCallback } from 'react';

export interface MasonryImage {
  id: string;
  url: string;
  alt?: string;
  tags?: string[];
}

export interface MasonryGridProps<T extends MasonryImage> {
  images: T[];
  renderImage: (image: T, onLoad: (imageId: string, naturalHeight: number, displayWidth: number) => void) => React.ReactNode;
  columnCount?: number;
  gap?: number;
  maxHeight?: number;
  className?: string;
}

export function MasonryGrid<T extends MasonryImage>({
  images,
  renderImage,
  columnCount = 3,
  gap = 16,
  maxHeight = 400,
  className,
}: MasonryGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const [columnHeights, setColumnHeights] = useState<number[]>(Array(columnCount).fill(0));
  const [itemPositions, setItemPositions] = useState<Array<{ x: number; y: number; height: number }>>([]);
  
  // Calculate positions when images or heights change
  const calculatePositions = useCallback(() => {
    if (images.length === 0) return;
    
    const containerWidth = parentRef.current?.clientWidth || 800;
    const columnWidth = (containerWidth - (gap * (columnCount - 1))) / columnCount;
    const heights = Array(columnCount).fill(0);
    const positions: Array<{ x: number; y: number; height: number }> = [];
    
    images.forEach((image) => {
      // Find shortest column
      const shortestColumnIndex = heights.indexOf(Math.min(...heights));
      
      // Get estimated or actual height
      const estimatedHeight = imageHeights[image.id] || 250;
      
      // Calculate position
      const x = shortestColumnIndex * (columnWidth + gap);
      const y = heights[shortestColumnIndex];
      
      positions.push({ x, y, height: estimatedHeight });
      
      // Update column height
      heights[shortestColumnIndex] += estimatedHeight + gap;
    });
    
    setItemPositions(positions);
    setColumnHeights(heights);
  }, [images, imageHeights, columnCount, gap]);

  // Recalculate positions when dependencies change
  React.useEffect(() => {
    calculatePositions();
  }, [calculatePositions]);

  // Handle image load to get actual dimensions
  const handleImageLoad = useCallback((imageId: string, naturalHeight: number, displayWidth: number) => {
    const containerWidth = parentRef.current?.clientWidth || 800;
    const columnWidth = (containerWidth - (gap * (columnCount - 1))) / columnCount;
    
    // Calculate actual display height based on aspect ratio
    const aspectRatio = naturalHeight / displayWidth;
    const actualHeight = Math.min(columnWidth * aspectRatio, maxHeight);
    
    setImageHeights(prev => ({
      ...prev,
      [imageId]: actualHeight
    }));
  }, [columnCount, gap, maxHeight]);

  // Calculate total height for scrolling
  const totalHeight = Math.max(...columnHeights);

  return (
    <div
      ref={parentRef}
      className={`h-96 w-full overflow-auto ${className || ""}`}
      style={{ height: '500px' }}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {images.map((image, index) => {
          const position = itemPositions[index];
          if (!position) return null;

          // Only render items that are likely to be visible
          const scrollTop = parentRef.current?.scrollTop || 0;
          const containerHeight = parentRef.current?.clientHeight || 500;
          const isVisible = position.y < scrollTop + containerHeight + 500 && 
                           position.y + position.height > scrollTop - 500;

          if (!isVisible) return null;

          const containerWidth = parentRef.current?.clientWidth || 800;
          const columnWidth = (containerWidth - (gap * (columnCount - 1))) / columnCount;

          return (
            <div
              key={image.id}
              style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${columnWidth}px`,
                height: `${position.height}px`,
              }}
            >
              {renderImage(image, handleImageLoad)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
