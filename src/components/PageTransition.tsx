'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

// 页面切换动画变体
const pageVariants = {
  initial: {
    opacity: 0,
    x: 20,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: 'easeOut' as const,
      when: 'beforeChildren' as const,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.98,
    transition: {
      duration: 0.25,
      ease: 'easeIn' as const,
    },
  },
};

// 淡入淡出变体（用于内容切换）
export const fadeVariants = {
  initial: { opacity: 0, y: 10 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: 'easeIn' as const,
    },
  },
};

// 列表项交错动画
export const staggerContainer = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

// 滑入动画（用于侧边栏内容切换）
export const slideVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 60 : -60,
  }),
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -60 : 60,
    transition: {
      duration: 0.3,
      ease: 'easeIn' as const,
    },
  }),
};

// 缩放弹入动画
export const scaleVariants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.2,
      ease: 'easeIn' as const,
    },
  },
};

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    // 首次渲染后标记为非首次
    setIsFirstRender(false);
  }, []);

  return (
    <AnimatePresence mode='wait' initial={false}>
      <motion.div
        key={pathname}
        initial={isFirstRender ? false : 'initial'}
        animate='enter'
        exit='exit'
        variants={pageVariants}
        className='w-full h-full'
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// 内容切换动画包装器
export function ContentTransition({
  children,
  contentKey,
  direction = 1,
}: {
  children: React.ReactNode;
  contentKey: string;
  direction?: number;
}) {
  return (
    <AnimatePresence mode='wait' custom={direction}>
      <motion.div
        key={contentKey}
        custom={direction}
        initial='initial'
        animate='enter'
        exit='exit'
        variants={slideVariants}
        className='w-full'
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// 淡入淡出动画包装器
export function FadeTransition({
  children,
  show = true,
}: {
  children: React.ReactNode;
  show?: boolean;
}) {
  return (
    <AnimatePresence mode='wait'>
      {show && (
        <motion.div
          initial='initial'
          animate='enter'
          exit='exit'
          variants={fadeVariants}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 列表动画包装器
export function StaggerList({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial='initial'
      animate='enter'
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}

// 列表项动画包装器
export function StaggerItem({ children }: { children: React.ReactNode }) {
  return <motion.div variants={staggerItem}>{children}</motion.div>;
}
