'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { BackButton } from './BackButton';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

/**
 * 页面布局组件 - 只负责内容区域的动画
 * 侧边栏和导航已移至 AppShell 组件
 */
const PageLayout = ({ children, activePath }: PageLayoutProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 构建完整路径用于动画 key
  const fullPath = activePath || (searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname);

  const [currentPath, setCurrentPath] = useState(fullPath);
  const prevPathRef = useRef(currentPath);
  const [direction, setDirection] = useState(1);

  // 路径优先级映射，用于确定切换方向
  const pathPriority: Record<string, number> = {
    '/': 0,
    '/search': 1,
    '/douban?type=movie': 2,
    '/douban?type=tv': 3,
    '/douban?type=show': 4,
    '/douban?type=custom': 5,
    '/play': 6,
  };

  useEffect(() => {
    if (fullPath !== prevPathRef.current) {
      // 计算切换方向
      const prevPriority = pathPriority[prevPathRef.current] ?? 0;
      const newPriority = pathPriority[fullPath] ?? 0;
      setDirection(newPriority >= prevPriority ? 1 : -1);
      prevPathRef.current = fullPath;
      setCurrentPath(fullPath);
    }
  }, [fullPath]);

  // 根据方向调整动画
  const getVariants = (dir: number) => ({
    initial: {
      opacity: 0,
      x: dir > 0 ? 40 : -40,
      filter: 'blur(4px)',
    },
    enter: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.35,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
    exit: {
      opacity: 0,
      x: dir > 0 ? -40 : 40,
      filter: 'blur(4px)',
      transition: {
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  });

  const showBackButton = pathname === '/play';

  return (
    <>
      {/* 桌面端左上角返回按钮 */}
      {showBackButton && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className='absolute top-3 left-3 z-20 hidden md:flex'
        >
          <BackButton />
        </motion.div>
      )}

      {/* 主内容 - 带切换动画 */}
      <AnimatePresence mode='wait' initial={false}>
        <motion.main
          key={currentPath}
          initial='initial'
          animate='enter'
          exit='exit'
          variants={getVariants(direction)}
          className='flex-1 md:min-h-0 mb-14 md:mb-0'
          style={{
            paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </>
  );
};

export default PageLayout;
