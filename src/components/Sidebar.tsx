/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Clover, Film, Heart, Home, Menu, Search, Star, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface SidebarContextType {
  isCollapsed: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
});

export const useSidebar = () => useContext(SidebarContext);

// 可替换为你自己的 logo 图片
const Logo = () => {
  const { siteName } = useSite();
  return (
    <Link
      href='/'
      className='flex items-center justify-center h-16 select-none hover:opacity-80 transition-all duration-300'
    >
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className='text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent tracking-tight'
      >
        {siteName}
      </motion.span>
    </Link>
  );
};

interface SidebarProps {
  onToggle?: (collapsed: boolean) => void;
  activePath?: string;
}

// 在浏览器环境下通过全局变量缓存折叠状态，避免组件重新挂载时出现初始值闪烁
declare global {
  interface Window {
    __sidebarCollapsed?: boolean;
  }
}

// 导航项组件
interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const NavItem = ({
  href,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: NavItemProps) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex items-center rounded-xl px-3 py-2.5 font-medium min-h-[44px] ${isCollapsed ? 'justify-center' : 'justify-start gap-3'
        } ${isActive
          ? 'text-green-700 dark:text-green-400'
          : 'text-gray-600 hover:bg-gray-100/60 hover:text-green-600 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-green-400'
        } transition-colors duration-200`}
    >
      {/* 活跃背景色块动画 */}
      {isActive && (
        <motion.div
          layoutId='activeNavBackground'
          className='absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/10 rounded-xl shadow-sm'
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}

      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className='relative z-10 w-5 h-5 flex items-center justify-center'
      >
        <Icon
          className={`h-5 w-5 transition-colors duration-200 ${isActive
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-500 group-hover:text-green-600 dark:text-gray-400 dark:group-hover:text-green-400'
            }`}
        />
      </motion.div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className='relative z-10 whitespace-nowrap overflow-hidden'
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className='absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 dark:bg-gray-700'>
          {label}
          <div className='absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700' />
        </div>
      )}
    </Link>
  );
};

const Sidebar = ({ onToggle, activePath = '/' }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 若同一次 SPA 会话中已经读取过折叠状态，则直接复用，避免闪烁
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.__sidebarCollapsed === 'boolean'
    ) {
      return window.__sidebarCollapsed;
    }
    return false; // 默认展开
  });

  // 首次挂载时读取 localStorage，以便刷新后仍保持上次的折叠状态
  useLayoutEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      const val = JSON.parse(saved);
      setIsCollapsed(val);
      window.__sidebarCollapsed = val;
    }
  }, []);

  // 当折叠状态变化时，同步到 <html> data 属性，供首屏 CSS 使用
  useLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      if (isCollapsed) {
        document.documentElement.dataset.sidebarCollapsed = 'true';
      } else {
        delete document.documentElement.dataset.sidebarCollapsed;
      }
    }
  }, [isCollapsed]);

  const [active, setActive] = useState(activePath);

  useEffect(() => {
    // 优先使用传入的 activePath
    if (activePath) {
      setActive(activePath);
    } else {
      // 否则使用当前路径
      const getCurrentFullPath = () => {
        const queryString = searchParams.toString();
        return queryString ? `${pathname}?${queryString}` : pathname;
      };
      const fullPath = getCurrentFullPath();
      setActive(fullPath);
    }
  }, [activePath, pathname, searchParams]);

  const handleToggle = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    if (typeof window !== 'undefined') {
      window.__sidebarCollapsed = newState;
    }
    onToggle?.(newState);
  }, [isCollapsed, onToggle]);

  const handleSearchClick = useCallback(() => {
    router.push('/search');
  }, [router]);

  const contextValue = {
    isCollapsed,
  };

  const [menuItems, setMenuItems] = useState([
    {
      icon: Film,
      label: '电影',
      href: '/douban?type=movie',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
    },
    {
      icon: Clover,
      label: '综艺',
      href: '/douban?type=show',
    },
  ]);

  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setMenuItems((prevItems) => [
        ...prevItems,
        {
          icon: Star,
          label: '自定义',
          href: '/douban?type=custom',
        },
      ]);
    }
  }, []);

  return (
    <SidebarContext.Provider value={contextValue}>
      {/* 在移动端隐藏侧边栏 */}
      <div className='hidden md:flex'>
        <aside
          data-sidebar
          className={`fixed top-0 left-0 h-screen bg-white/60 backdrop-blur-2xl transition-all duration-300 border-r border-gray-200/30 z-10 shadow-xl dark:bg-gray-900/80 dark:border-gray-700/30 ${isCollapsed ? 'w-16' : 'w-64'
            }`}
          style={{
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <div className='flex h-full flex-col'>
            {/* 顶部 Logo 区域 */}
            <div className='relative h-16'>
              <AnimatePresence mode='wait'>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className='absolute inset-0 flex items-center justify-center'
                  >
                    <div className='w-[calc(100%-4rem)] flex justify-center'>
                      <Logo />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                onClick={handleToggle}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 transition-colors duration-200 z-10 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/70 ${isCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-2'
                  }`}
              >
                <Menu className='h-4 w-4' />
              </motion.button>
            </div>

            {/* 所有导航项放在同一个容器中，确保 layoutId 动画正常工作 */}
            <nav className='flex-1 overflow-y-auto px-2 mt-4 space-y-1'>
              <NavItem
                href='/'
                icon={Home}
                label='首页'
                isActive={active === '/'}
                isCollapsed={isCollapsed}
              />
              <NavItem
                href='/search'
                icon={Search}
                label='搜索'
                isActive={active === '/search'}
                isCollapsed={isCollapsed}
              />

              {/* 分隔区域 - 分类 */}
              <div className='pt-3 space-y-1'>
                {menuItems.map((item, index) => {
                  // 检查当前路径是否匹配这个菜单项
                  const typeMatch = item.href.match(/type=([^&]+)/)?.[1];

                  // 解码URL以进行正确的比较
                  const decodedActive = decodeURIComponent(active);
                  const decodedItemHref = decodeURIComponent(item.href);

                  const isActive =
                    decodedActive === decodedItemHref ||
                    (decodedActive.startsWith('/douban') &&
                      decodedActive.includes(`type=${typeMatch}`));
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <NavItem
                        href={item.href}
                        icon={Icon}
                        label={item.label}
                        isActive={isActive}
                        isCollapsed={isCollapsed}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* 分隔区域 - 收藏夹 */}
              <div className='pt-3'>
                <NavItem
                  href='/favorites'
                  icon={Heart}
                  label='收藏夹'
                  isActive={active === '/favorites'}
                  isCollapsed={isCollapsed}
                />
              </div>
            </nav>

            {/* 底部固定区域 - 主题切换和用户菜单 */}
            <div className={`px-2 py-4 border-t border-gray-200/30 dark:border-gray-700/30 ${isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between'}`}>
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </aside>
        <div
          className={`transition-all duration-300 sidebar-offset ${isCollapsed ? 'w-16' : 'w-64'
            }`}
        ></div>
      </div>
    </SidebarContext.Provider>
  );
};

export default Sidebar;
