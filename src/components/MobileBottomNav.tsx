/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { motion } from 'framer-motion';
import {
  type LucideIcon,
  Clapperboard,
  Film,
  Home,
  Mic2,
  Search,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useDataSourceConfig } from '@/hooks/useDataSourceConfig';

// 图标映射
const iconMap: Record<string, LucideIcon> = {
  Film,
  Tv,
  Clapperboard,
  Mic2,
};

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();

  // 当前激活路径：优先使用传入的 activePath，否则回退到浏览器地址
  const currentActive = activePath ?? pathname;

  // 使用 hook 获取数据源配置
  const { dataSource, menuItems: configMenuItems } = useDataSourceConfig();

  // 将配置中的菜单项转换为带图标组件的格式
  const dataSourceMenuItems = configMenuItems.map(item => ({
    icon: iconMap[item.icon] || Film,
    label: item.label,
    href: `/${dataSource}?type=${item.type}`,
  }));

  const navItems = [
    { icon: Home, label: '首页', href: '/' },
    { icon: Search, label: '搜索', href: '/search' },
    ...dataSourceMenuItems,
  ];

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];
    const pathMatch = href.match(/^\/([^?]+)/)?.[1];

    // 解码URL以进行正确的比较
    const decodedActive = decodeURIComponent(currentActive);
    const decodedItemHref = decodeURIComponent(href);

    return (
      decodedActive === decodedItemHref ||
      (decodedActive.startsWith(`/${pathMatch}`) &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <nav
      className='md:hidden fixed left-0 right-0 z-[600] bg-white/80 backdrop-blur-2xl border-t border-gray-200/30 overflow-hidden dark:bg-gray-900/90 dark:border-gray-700/30 shadow-lg'
      style={{
        /* 紧贴视口底部，同时在内部留出安全区高度 */
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        minHeight: 'calc(3.5rem + env(safe-area-inset-bottom))',
      }}
    >
      <ul className='flex items-center overflow-x-auto scrollbar-hide'>
        {navItems.map((item, index) => {
          const active = isActive(item.href);
          return (
            <motion.li
              key={item.href}
              className='flex-shrink-0'
              style={{ width: `${100 / navItems.length}vw`, minWidth: `${100 / navItems.length}vw` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className='relative flex flex-col items-center justify-center w-full h-14 gap-1 text-xs'
              >
                {/* 活跃指示器背景 */}
                {active && (
                  <motion.div
                    layoutId='mobileNavIndicator'
                    className='absolute inset-x-2 inset-y-1 bg-gradient-to-r from-green-500/15 to-emerald-500/10 rounded-xl'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className='relative z-10'
                >
                  <item.icon
                    className={`h-6 w-6 transition-all duration-300 ${active
                        ? 'text-green-600 dark:text-green-400 scale-110'
                        : 'text-gray-500 dark:text-gray-400'
                      }`}
                  />
                </motion.div>
                <span
                  className={`relative z-10 transition-all duration-300 ${active
                      ? 'text-green-600 dark:text-green-400 font-medium'
                      : 'text-gray-600 dark:text-gray-300'
                    }`}
                >
                  {item.label}
                </span>
                {/* 活跃指示点 */}
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className='absolute -top-0.5 w-1 h-1 bg-green-500 rounded-full'
                  />
                )}
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
