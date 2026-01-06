/* eslint-disable no-console,react-hooks/exhaustive-deps,@typescript-eslint/no-explicit-any */

'use client';

import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDoubanCategories, getDoubanList } from '@/lib/douban.client';
import { DoubanItem, DoubanResult } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanCustomSelector from '@/components/DoubanCustomSelector';
import DoubanSelector from '@/components/DoubanSelector';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

// 列表项交错动画
const staggerContainer = {
  enter: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

function DoubanPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [doubanData, setDoubanData] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectorsReady, setSelectorsReady] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const type = searchParams.get('type') || 'movie';

  // 从 URL 读取筛选参数
  const urlPrimary = searchParams.get('primary');
  const urlSecondary = searchParams.get('secondary');

  // 获取 runtimeConfig 中的自定义分类数据
  const [customCategories, setCustomCategories] = useState<
    Array<{ name: string; type: 'movie' | 'tv'; query: string }>
  >([]);

  // 获取默认值的函数
  const getDefaultPrimary = useCallback((currentType: string) => {
    if (urlPrimary) return urlPrimary;
    return currentType === 'movie' ? '热门' : '';
  }, [urlPrimary]);

  const getDefaultSecondary = useCallback((currentType: string) => {
    if (urlSecondary) return urlSecondary;
    if (currentType === 'movie') return '全部';
    if (currentType === 'tv') return 'tv';
    if (currentType === 'anime') return 'tv_animation';
    if (currentType === 'show') return 'show';
    return '全部';
  }, [urlSecondary]);

  // 选择器状态 - 从 URL 参数初始化
  const [primarySelection, setPrimarySelection] = useState<string>(() => getDefaultPrimary(type));
  const [secondarySelection, setSecondarySelection] = useState<string>(() => getDefaultSecondary(type));

  // 更新 URL 参数的函数
  const updateURLParams = useCallback((primary: string, secondary: string) => {
    const params = new URLSearchParams();
    params.set('type', type);
    if (primary) {
      params.set('primary', primary);
    }
    if (secondary) {
      params.set('secondary', secondary);
    }
    router.replace(`/douban?${params.toString()}`, { scroll: false });
  }, [type, router]);

  // 获取自定义分类数据
  useEffect(() => {
    const runtimeConfig = (window as any).RUNTIME_CONFIG;
    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      setCustomCategories(runtimeConfig.CUSTOM_CATEGORIES);
    }
  }, []);

  // type变化时立即重置selectorsReady
  useEffect(() => {
    setSelectorsReady(false);
    setLoading(true);
  }, [type]);

  // 当type变化时重置选择器状态（只在没有 URL 参数时重置）
  useEffect(() => {
    // 如果 URL 有参数，使用 URL 参数
    if (urlPrimary || urlSecondary) {
      setPrimarySelection(urlPrimary || '');
      setSecondarySelection(urlSecondary || '');
      setSelectorsReady(true);
      return;
    }

    if (type === 'custom' && customCategories.length > 0) {
      // 自定义分类模式：优先选择 movie，如果没有 movie 则选择 tv
      const types = Array.from(
        new Set(customCategories.map((cat) => cat.type))
      );
      if (types.length > 0) {
        // 优先选择 movie，如果没有 movie 则选择 tv
        let selectedType = types[0]; // 默认选择第一个
        if (types.includes('movie')) {
          selectedType = 'movie';
        } else {
          selectedType = 'tv';
        }
        setPrimarySelection(selectedType);

        // 设置选中类型的第一个分类的 query 作为二级选择
        const firstCategory = customCategories.find(
          (cat) => cat.type === selectedType
        );
        if (firstCategory) {
          setSecondarySelection(firstCategory.query);
        }
      }
    } else {
      // 原有逻辑
      if (type === 'movie') {
        setPrimarySelection('热门');
        setSecondarySelection('全部');
      } else if (type === 'tv') {
        setPrimarySelection('');
        setSecondarySelection('tv');
      } else if (type === 'anime') {
        // 动漫类型，使用 tv_animation
        setPrimarySelection('');
        setSecondarySelection('tv_animation');
      } else if (type === 'show') {
        setPrimarySelection('');
        setSecondarySelection('show');
      } else {
        setPrimarySelection('');
        setSecondarySelection('全部');
      }
    }

    // 立即标记选择器准备好
    setSelectorsReady(true);
  }, [type, customCategories, urlPrimary, urlSecondary]);

  // 生成骨架屏数据
  const skeletonData = Array.from({ length: 25 }, (_, index) => index);

  // 生成API请求参数的辅助函数
  const getRequestParams = useCallback(
    (pageStart: number) => {
      // 当type为tv、anime或show时，kind统一为'tv'
      if (type === 'tv' || type === 'anime' || type === 'show') {
        // anime 类型使用 'tv' 作为 category
        const category = type === 'anime' ? 'tv' : type;
        return {
          kind: 'tv' as const,
          category: category,
          type: secondarySelection,
          pageLimit: 25,
          pageStart,
        };
      }

      // 电影类型保持原逻辑
      return {
        kind: type as 'tv' | 'movie',
        category: primarySelection,
        type: secondarySelection,
        pageLimit: 25,
        pageStart,
      };
    },
    [type, primarySelection, secondarySelection]
  );

  // 防抖的数据加载函数
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      let data: DoubanResult;

      if (type === 'custom') {
        // 自定义分类模式：根据选中的一级和二级选项获取对应的分类
        const selectedCategory = customCategories.find(
          (cat) =>
            cat.type === primarySelection && cat.query === secondarySelection
        );

        if (selectedCategory) {
          data = await getDoubanList({
            tag: selectedCategory.query,
            type: selectedCategory.type,
            pageLimit: 25,
            pageStart: 0,
          });
        } else {
          throw new Error('没有找到对应的分类');
        }
      } else {
        data = await getDoubanCategories(getRequestParams(0));
      }

      if (data.code === 200) {
        setDoubanData(data.list);
        setHasMore(data.list.length === 25);
        setLoading(false);
      } else {
        throw new Error(data.message || '获取数据失败');
      }
    } catch (err) {
      console.error(err);
    }
  }, [
    type,
    primarySelection,
    secondarySelection,
    getRequestParams,
    customCategories,
  ]);

  // 只在选择器准备好后才加载数据
  useEffect(() => {
    // 只有在选择器准备好时才开始加载
    if (!selectorsReady) {
      return;
    }

    // 重置页面状态
    setDoubanData([]);
    setCurrentPage(0);
    setHasMore(true);
    setIsLoadingMore(false);

    // 清除之前的防抖定时器
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // 直接加载数据
    loadInitialData();

    // 清理函数
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    selectorsReady,
    type,
    primarySelection,
    secondarySelection,
    loadInitialData,
  ]);

  // 单独处理 currentPage 变化（加载更多）
  useEffect(() => {
    if (currentPage > 0) {
      const fetchMoreData = async () => {
        try {
          setIsLoadingMore(true);

          let data: DoubanResult;
          if (type === 'custom') {
            // 自定义分类模式：根据选中的一级和二级选项获取对应的分类
            const selectedCategory = customCategories.find(
              (cat) =>
                cat.type === primarySelection &&
                cat.query === secondarySelection
            );

            if (selectedCategory) {
              data = await getDoubanList({
                tag: selectedCategory.query,
                type: selectedCategory.type,
                pageLimit: 25,
                pageStart: currentPage * 25,
              });
            } else {
              throw new Error('没有找到对应的分类');
            }
          } else {
            data = await getDoubanCategories(
              getRequestParams(currentPage * 25)
            );
          }

          if (data.code === 200) {
            setDoubanData((prev) => [...prev, ...data.list]);
            setHasMore(data.list.length === 25);
          } else {
            throw new Error(data.message || '获取数据失败');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoadingMore(false);
        }
      };

      fetchMoreData();
    }
  }, [
    currentPage,
    type,
    primarySelection,
    secondarySelection,
    customCategories,
  ]);

  // 设置滚动监听
  useEffect(() => {
    // 如果没有更多数据或正在加载，则不设置监听
    if (!hasMore || isLoadingMore || loading) {
      return;
    }

    // 确保 loadingRef 存在
    if (!loadingRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loading]);

  // 处理选择器变化 - 更新 URL 参数
  const handlePrimaryChange = useCallback(
    (value: string) => {
      // 只有当值真正改变时才设置loading状态
      if (value !== primarySelection) {
        setLoading(true);

        // 如果是自定义分类模式，同时更新一级和二级选择器
        if (type === 'custom' && customCategories.length > 0) {
          const firstCategory = customCategories.find(
            (cat) => cat.type === value
          );
          if (firstCategory) {
            updateURLParams(value, firstCategory.query);
          } else {
            updateURLParams(value, secondarySelection);
          }
        } else {
          updateURLParams(value, secondarySelection);
        }
      }
    },
    [primarySelection, secondarySelection, type, customCategories, updateURLParams]
  );

  const handleSecondaryChange = useCallback(
    (value: string) => {
      // 只有当值真正改变时才设置loading状态
      if (value !== secondarySelection) {
        setLoading(true);
        updateURLParams(primarySelection, value);
      }
    },
    [primarySelection, secondarySelection, updateURLParams]
  );

  const getPageTitle = () => {
    // 根据 type 生成标题
    switch (type) {
      case 'movie':
        return '电影';
      case 'tv':
        return '电视剧';
      case 'anime':
        return '动漫';
      case 'show':
        return '综艺';
      default:
        return '自定义';
    }
  };

  const getActivePath = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);

    const queryString = params.toString();
    const activePath = `/douban${queryString ? `?${queryString}` : ''}`;
    return activePath;
  };

  return (
    <PageLayout activePath={getActivePath()}>
      <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible'>
        {/* 页面标题 */}
        <div className='mb-4 sm:mb-6'>
          <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 dark:text-gray-200'>
            {getPageTitle()}
          </h1>
          <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400'>
            来自豆瓣的精选内容
          </p>
        </div>

        {/* 选择器组件 - 吸顶效果 */}
        {/* anime 类型不显示选择器，因为只有一个分类 */}
        {type !== 'anime' && (
          <div className='sticky top-0 z-30 -mx-4 sm:-mx-10 px-4 sm:px-10 py-3 bg-gradient-to-b from-white/95 via-white/90 to-white/0 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-900/0 backdrop-blur-md'>
            {type !== 'custom' ? (
              <div className='bg-white/80 dark:bg-gray-800/60 rounded-2xl p-4 sm:p-5 border border-gray-200/40 dark:border-gray-700/40 shadow-sm backdrop-blur-sm'>
                <DoubanSelector
                  type={type as 'movie' | 'tv' | 'show'}
                  primarySelection={primarySelection}
                  secondarySelection={secondarySelection}
                  onPrimaryChange={handlePrimaryChange}
                  onSecondaryChange={handleSecondaryChange}
                />
              </div>
            ) : (
              <div className='bg-white/80 dark:bg-gray-800/60 rounded-2xl p-4 sm:p-5 border border-gray-200/40 dark:border-gray-700/40 shadow-sm backdrop-blur-sm'>
                <DoubanCustomSelector
                  customCategories={customCategories}
                  primarySelection={primarySelection}
                  secondarySelection={secondarySelection}
                  onPrimaryChange={handlePrimaryChange}
                  onSecondaryChange={handleSecondaryChange}
                />
              </div>
            )}
          </div>
        )}

        {/* 内容展示区域 - 与选择器对齐 */}
        <div className='mt-6 overflow-visible'>
          {/* 内容网格 */}
          <motion.div
            variants={staggerContainer}
            initial='initial'
            animate='enter'
            className='justify-start grid grid-cols-3 gap-x-2 gap-y-12 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-6 sm:gap-y-16'
          >
            {loading || !selectorsReady
              ? // 显示骨架屏
              skeletonData.map((index) => <DoubanCardSkeleton key={index} />)
              : // 显示实际数据
              doubanData.map((item, index) => (
                <motion.div
                  key={`${item.title}-${index}`}
                  variants={staggerItem}
                  className='w-full'
                >
                  <VideoCard
                    from='douban'
                    title={item.title}
                    poster={item.poster}
                    douban_id={item.id}
                    rate={item.rate}
                    year={item.year}
                    type={type === 'movie' ? 'movie' : ''} // 电影类型严格控制，tv 不控
                  />
                </motion.div>
              ))}
          </motion.div>

          {/* 加载更多指示器 */}
          {hasMore && !loading && (
            <div
              ref={(el) => {
                if (el && el.offsetParent !== null) {
                  (
                    loadingRef as React.MutableRefObject<HTMLDivElement | null>
                  ).current = el;
                }
              }}
              className='flex justify-center mt-12 py-8'
            >
              {isLoadingMore && (
                <div className='flex items-center gap-2'>
                  <div className='relative'>
                    <div className='animate-spin rounded-full h-6 w-6 border-2 border-green-500/20 border-t-green-500'></div>
                  </div>
                  <span className='text-gray-600 dark:text-gray-400'>加载中...</span>
                </div>
              )}
            </div>
          )}

          {/* 没有更多数据提示 */}
          {!hasMore && doubanData.length > 0 && (
            <div className='text-center text-gray-500 dark:text-gray-400 py-8'>已加载全部内容</div>
          )}

          {/* 空状态 */}
          {!loading && doubanData.length === 0 && (
            <div className='text-center text-gray-500 dark:text-gray-400 py-8'>暂无相关内容</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function DoubanPage() {
  return (
    <Suspense>
      <DoubanPageClient />
    </Suspense>
  );
}
