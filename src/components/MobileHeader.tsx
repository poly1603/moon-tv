'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className='md:hidden relative w-full bg-white/80 backdrop-blur-2xl border-b border-gray-200/30 shadow-sm dark:bg-gray-900/80 dark:border-gray-700/30'>
      <div className='h-12 flex items-center justify-between px-4'>
        {/* 左侧：返回按钮和设置按钮 */}
        <div className='flex items-center gap-2'>
          {showBackButton && <BackButton />}
        </div>

        {/* 右侧按钮 */}
        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* 中间：Logo（绝对居中） */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Link
          href='/'
          className='block hover:opacity-80 transition-opacity'
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className='text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent tracking-tight'
          >
            {siteName}
          </motion.span>
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
