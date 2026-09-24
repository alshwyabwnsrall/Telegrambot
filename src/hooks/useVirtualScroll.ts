import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight: number; // Estimated or fixed item height in px
  overscan?: number; // Number of items to render outside visible area
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  topPadding: number;
  bottomPadding: number;
  totalHeight: number;
  visibleRange: [number, number];
}

/**
 * High-performance, lightweight virtualization hook for long lists.
 * Keeps DOM node count minimal to reduce memory and eliminate layout thrashing during fast scroll.
 */
export function useVirtualScroll({
  itemCount,
  itemHeight,
  overscan = 8,
  containerRef,
}: UseVirtualScrollOptions): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const rafRef = useRef<number | null>(null);

  // Measure container height on mount & resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el) {
        setContainerHeight(el.clientHeight || 600);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);

  // Track scroll position using requestAnimationFrame throttling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        if (el) {
          setScrollTop(el.scrollTop);
        }
        rafRef.current = null;
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    // Initial sync
    setScrollTop(el.scrollTop);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);

  return useMemo(() => {
    const totalHeight = itemCount * itemHeight;

    if (itemCount === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        topPadding: 0,
        bottomPadding: 0,
        totalHeight: 0,
        visibleRange: [0, 0],
      };
    }

    const calculatedStart = Math.floor(scrollTop / itemHeight);
    const calculatedVisibleCount = Math.ceil(containerHeight / itemHeight);

    const startIndex = Math.max(0, calculatedStart - overscan);
    const endIndex = Math.min(itemCount - 1, calculatedStart + calculatedVisibleCount + overscan);

    const topPadding = startIndex * itemHeight;
    const bottomPadding = Math.max(0, (itemCount - 1 - endIndex) * itemHeight);

    return {
      startIndex,
      endIndex,
      topPadding,
      bottomPadding,
      totalHeight,
      visibleRange: [startIndex, endIndex],
    };
  }, [itemCount, itemHeight, overscan, scrollTop, containerHeight]);
}
