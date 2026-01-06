'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import Sidebar from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * 应用外壳组件 - 包含持久化的导航元素
 * 这个组件在 layout 级别渲染，不会因页面切换而重新挂载
 */
const AppShell = ({ children }: AppShellProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 根据当前路径确定活跃状态
  const getActivePath = () => {
    if (pathname === '/') return '/';
    if (pathname === '/search') return '/search';
    if (pathname === '/favorites') return '/favorites';
    if (pathname === '/play') return '/play';
    if (pathname.startsWith('/douban')) {
      // 保留完整的查询参数用于匹配
      const queryString = searchParams.toString();
      return queryString ? `${pathname}?${queryString}` : pathname;
    }
    return pathname;
  };

  const activePath = getActivePath();
  const showBackButton = pathname === '/play';

  return (
    <div className='w-full min-h-screen'>
      {/* 移动端头部 */}
      <MobileHeader showBackButton={showBackButton} />

      {/* 主要布局容器 */}
      <div className='flex w-full min-h-screen'>
        {/* 侧边栏 - 桌面端显示，移动端隐藏，使用 sticky 固定 */}
        <div className='hidden md:block sticky top-0 h-screen flex-shrink-0'>
          <Sidebar activePath={activePath} />
        </div>

        {/* 主内容区域 */}
        <div className='relative min-w-0 flex-1'>
          {/* 页面内容 */}
          {children}
        </div>
      </div>

      {/* 移动端底部导航 */}
      <div className='md:hidden'>
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
};

export default AppShell;
