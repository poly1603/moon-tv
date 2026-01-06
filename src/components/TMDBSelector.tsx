'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useDataSourceConfig } from '@/hooks/useDataSourceConfig';

interface SelectorOption {
  label: string;
  value: string;
}

interface TMDBSelectorProps {
  type: 'movie' | 'tv' | 'anime';
  categorySelection?: string;
  regionSelection?: string;
  onCategoryChange: (value: string) => void;
  onRegionChange: (value: string) => void;
}

const TMDBSelector: React.FC<TMDBSelectorProps> = ({
  type,
  categorySelection,
  regionSelection,
  onCategoryChange,
  onRegionChange,
}) => {
  // 为不同的选择器创建独立的 refs 和状态
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [categoryIndicatorStyle, setCategoryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const regionContainerRef = useRef<HTMLDivElement>(null);
  const regionButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [regionIndicatorStyle, setRegionIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  // 使用 hook 获取分类配置
  const { getCategoryConfig } = useDataSourceConfig();
  const config = getCategoryConfig(type);

  const categoryOptions = useMemo(() => config?.primary || [], [config]);
  const regionOptions = useMemo(() => config?.secondary || [], [config]);

  // 更新指示器位置的通用函数
  const updateIndicatorPosition = (
    activeIndex: number,
    containerRef: React.RefObject<HTMLDivElement>,
    buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
    setIndicatorStyle: React.Dispatch<
      React.SetStateAction<{ left: number; width: number }>
    >
  ) => {
    if (
      activeIndex >= 0 &&
      buttonRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const timeoutId = setTimeout(() => {
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
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  };

  // 组件挂载时立即计算初始位置
  useEffect(() => {
    // 分类选择器初始位置
    const categoryIndex = categoryOptions.findIndex(
      (opt) => opt.value === (categorySelection || categoryOptions[0].value)
    );
    updateIndicatorPosition(
      categoryIndex,
      categoryContainerRef,
      categoryButtonRefs,
      setCategoryIndicatorStyle
    );

    // 地区选择器初始位置
    const regionIndex = regionOptions.findIndex(
      (opt) => opt.value === (regionSelection || regionOptions[0].value)
    );
    updateIndicatorPosition(
      regionIndex,
      regionContainerRef,
      regionButtonRefs,
      setRegionIndicatorStyle
    );
  }, [type]);

  // 监听分类选择器变化
  useEffect(() => {
    const activeIndex = categoryOptions.findIndex(
      (opt) => opt.value === categorySelection
    );
    const cleanup = updateIndicatorPosition(
      activeIndex,
      categoryContainerRef,
      categoryButtonRefs,
      setCategoryIndicatorStyle
    );
    return cleanup;
  }, [categorySelection, categoryOptions]);

  // 监听地区选择器变化
  useEffect(() => {
    const activeIndex = regionOptions.findIndex(
      (opt) => opt.value === regionSelection
    );
    const cleanup = updateIndicatorPosition(
      activeIndex,
      regionContainerRef,
      regionButtonRefs,
      setRegionIndicatorStyle
    );
    return cleanup;
  }, [regionSelection, regionOptions]);

  // 渲染胶囊式选择器
  const renderCapsuleSelector = (
    options: SelectorOption[],
    activeValue: string | undefined,
    onChange: (value: string) => void,
    isCategory = false
  ) => {
    const containerRef = isCategory ? categoryContainerRef : regionContainerRef;
    const buttonRefs = isCategory ? categoryButtonRefs : regionButtonRefs;
    const indicatorStyle = isCategory
      ? categoryIndicatorStyle
      : regionIndicatorStyle;

    return (
      <div
        ref={containerRef}
        className="relative inline-flex bg-gray-200/60 rounded-full p-0.5 sm:p-1 dark:bg-gray-700/60 backdrop-blur-sm"
      >
        {/* 滑动的白色背景指示器 */}
        {indicatorStyle.width > 0 && (
          <div
            className="absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 bg-white dark:bg-gray-500 rounded-full shadow-sm transition-all duration-300 ease-out"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}

        {options.map((option, index) => {
          const isActive = activeValue === option.value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              onClick={() => onChange(option.value)}
              className={`relative z-10 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'text-gray-900 dark:text-gray-100 cursor-default'
                  : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 分类选择器 */}
      {categoryOptions.length > 0 && (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]">
          {config?.primaryLabel || '分类'}
        </span>
        <div className="overflow-x-auto">
          {renderCapsuleSelector(
            categoryOptions,
            categorySelection || categoryOptions[0]?.value,
            onCategoryChange,
            true
          )}
        </div>
      </div>
      )}

      {/* 地区/类型选择器 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]">
          {config?.secondaryLabel || '地区'}
        </span>
        <div className="overflow-x-auto">
          {renderCapsuleSelector(
            regionOptions,
            regionSelection || regionOptions[0].value,
            onRegionChange,
            false
          )}
        </div>
      </div>
    </div>
  );
};

export default TMDBSelector;
