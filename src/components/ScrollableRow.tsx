import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollableRowProps {
  children: React.ReactNode;
  scrollDistance?: number;
}

export default function ScrollableRow({
  children,
  scrollDistance = 1000,
}: ScrollableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const rafRef = useRef<number | null>(null);
  const mutationDebounceRef = useRef<number | null>(null);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollWidth, clientWidth, scrollLeft } = el;

    // 计算是否需要左右滚动按钮
    const threshold = 1; // 容差值，避免浮点误差
    const canScrollRight = scrollWidth - (scrollLeft + clientWidth) > threshold;
    const canScrollLeft = scrollLeft > threshold;

    setShowRightScroll((prev) => (prev === canScrollRight ? prev : canScrollRight));
    setShowLeftScroll((prev) => (prev === canScrollLeft ? prev : canScrollLeft));
  }, []);

  const scheduleCheck = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      checkScroll();
    });
  }, [checkScroll]);

  useEffect(() => {
    // 多次延迟检查，确保内容已完全渲染
    scheduleCheck();

    // 监听窗口大小变化
    window.addEventListener('resize', scheduleCheck, { passive: true });

    // 创建一个 ResizeObserver 来监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      // 延迟执行检查
      scheduleCheck();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', scheduleCheck);
      resizeObserver.disconnect();

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [children, scheduleCheck]); // 依赖 children，当子组件变化时重新检查

  // 添加一个额外的效果来监听子组件的变化
  useEffect(() => {
    if (containerRef.current) {
      // 监听 DOM 变化
      const observer = new MutationObserver(() => {
        if (mutationDebounceRef.current) {
          window.clearTimeout(mutationDebounceRef.current);
        }
        mutationDebounceRef.current = window.setTimeout(() => {
          mutationDebounceRef.current = null;
          scheduleCheck();
        }, 50);
      });

      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'sizes'],
      });

      return () => {
        observer.disconnect();
        if (mutationDebounceRef.current) {
          window.clearTimeout(mutationDebounceRef.current);
          mutationDebounceRef.current = null;
        }
      };
    }
  }, [scheduleCheck]);

  const handleScrollRightClick = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: scrollDistance,
        behavior: 'smooth',
      });
    }
  };

  const handleScrollLeftClick = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: -scrollDistance,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div
      className='relative'
      onMouseEnter={() => {
        setIsHovered(true);
        // 当鼠标进入时重新检查一次
        scheduleCheck();
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={containerRef}
        className='flex space-x-6 overflow-x-auto scrollbar-hide py-1 sm:py-2 pb-12 sm:pb-14 px-4 sm:px-6'
        onScroll={scheduleCheck}
      >
        {children}
      </div>
      {showLeftScroll && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
          transition={{ duration: 0.2 }}
          className='hidden sm:flex absolute left-0 top-0 bottom-0 w-16 items-center justify-center z-[600]'
          style={{
            background: 'transparent',
            pointerEvents: 'none',
          }}
        >
          <div
            className='absolute inset-0 flex items-center justify-center'
            style={{
              top: '40%',
              bottom: '60%',
              left: '-4.5rem',
              pointerEvents: 'auto',
            }}
          >
            <motion.button
              onClick={handleScrollLeftClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className='w-12 h-12 bg-white/95 rounded-full shadow-lg flex items-center justify-center border border-gray-200/50 dark:bg-gray-800/95 dark:border-gray-600/50'
            >
              <ChevronLeft className='w-6 h-6 text-gray-600 dark:text-gray-300' />
            </motion.button>
          </div>
        </motion.div>
      )}

      {showRightScroll && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 10 }}
          transition={{ duration: 0.2 }}
          className='hidden sm:flex absolute right-0 top-0 bottom-0 w-16 items-center justify-center z-[600]'
          style={{
            background: 'transparent',
            pointerEvents: 'none',
          }}
        >
          <div
            className='absolute inset-0 flex items-center justify-center'
            style={{
              top: '40%',
              bottom: '60%',
              right: '-4.5rem',
              pointerEvents: 'auto',
            }}
          >
            <motion.button
              onClick={handleScrollRightClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className='w-12 h-12 bg-white/95 rounded-full shadow-lg flex items-center justify-center border border-gray-200/50 dark:bg-gray-800/95 dark:border-gray-600/50'
            >
              <ChevronRight className='w-6 h-6 text-gray-600 dark:text-gray-300' />
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
