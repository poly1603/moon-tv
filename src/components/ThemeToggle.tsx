/* eslint-disable @typescript-eslint/no-explicit-any,react-hooks/exhaustive-deps */

'use client';

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  const setThemeColor = (theme?: string) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#0c111c' : '#f9fbfe';
      document.head.appendChild(meta);
    } else {
      meta.setAttribute('content', theme === 'dark' ? '#0c111c' : '#f9fbfe');
    }
  };

  useEffect(() => {
    setMounted(true);
    setThemeColor(resolvedTheme);
  }, []);

  if (!mounted) {
    // 渲染一个占位符以避免布局偏移
    return <div className='w-10 h-10' />;
  }

  const toggleTheme = () => {
    // 检查浏览器是否支持 View Transitions API
    const targetTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeColor(targetTheme);
    if (!(document as any).startViewTransition) {
      setTheme(targetTheme);
      return;
    }

    (document as any).startViewTransition(() => {
      setTheme(targetTheme);
    });
  };

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-gray-700/60 transition-colors'
      aria-label='Toggle theme'
    >
      <motion.div
        initial={false}
        animate={{ rotate: resolvedTheme === 'dark' ? 0 : 180 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className='w-full h-full text-amber-400' />
        ) : (
          <Moon className='w-full h-full text-indigo-500' />
        )}
      </motion.div>
    </motion.button>
  );
}
