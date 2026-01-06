/* eslint-disable react-hooks/exhaustive-deps */

import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

interface CapsuleSwitchProps {
  options: { label: string; value: string }[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

const CapsuleSwitch: React.FC<CapsuleSwitchProps> = ({
  options,
  active,
  onChange,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const activeIndex = options.findIndex((opt) => opt.value === active);

  // 更新指示器位置
  const updateIndicatorPosition = () => {
    if (
      activeIndex >= 0 &&
      buttonRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const button = buttonRefs.current[activeIndex];
      const container = containerRef.current;
      if (button && container) {
        const buttonRect = button.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (buttonRect.width > 0) {
          setIndicatorStyle({
            left: buttonRect.left - containerRect.left,
            width: buttonRect.width,
          });
        }
      }
    }
  };

  // 组件挂载时立即计算初始位置
  useEffect(() => {
    const timeoutId = setTimeout(updateIndicatorPosition, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  // 监听选中项变化
  useEffect(() => {
    const timeoutId = setTimeout(updateIndicatorPosition, 0);
    return () => clearTimeout(timeoutId);
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex bg-gray-200/80 rounded-full p-1.5 shadow-inner dark:bg-gray-700/80 ${className || ''
        }`}
    >
      {/* 滑动的白色背景指示器 */}
      {indicatorStyle.width > 0 && (
        <motion.div
          className='absolute top-1.5 bottom-1.5 bg-white dark:bg-gray-600 rounded-full shadow-md'
          initial={false}
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 35,
          }}
        />
      )}

      {options.map((opt, index) => {
        const isActive = active === opt.value;
        return (
          <motion.button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            onClick={() => onChange(opt.value)}
            whileTap={{ scale: 0.95 }}
            className={`relative z-10 w-16 px-3 py-1.5 text-xs sm:w-20 sm:py-2 sm:text-sm rounded-full font-medium transition-colors duration-200 cursor-pointer ${isActive
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
};

export default CapsuleSwitch;
