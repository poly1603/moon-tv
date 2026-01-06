/* eslint-disable no-console,react-hooks/exhaustive-deps */

'use client';

import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getTMDBDiscover } from '@/lib/tmdb.client';
import { TMDBItem, TMDBResult } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import PageLayout from '@/components/PageLayout';
import TMDBSelector from '@/components/TMDBSelector';
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

function TMDBPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tmdbData, setTmdbData] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectorsReady, setSelectorsReady] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const urlType = searchParams.get('type') || 'movie';
  // anime 类型实际上是 TV 类型 + 动漫 genre 过滤
  const isAnime = urlType === 'anime';
  const type = isAnime ? 'tv' : (urlType as 'movie' | 'tv');

  // 从 URL 读取筛选参数
  const urlCategory = searchParams.get('category');
  const urlRegion = searchParams.get('region');

  // 选择器状态 - 从 URL 参数初始化
  const getDefaultRegion = useCallback(() => {
    if (urlRegion) return urlRegion;
    return isAnime ? 'genre_16' : '';
  }, [urlRegion, isAnime]);

  const [categorySelection, setCategorySelection] = useState<string>(urlCategory || 'popular');
  const [regionSelection, setRegionSelection] = useState<string>(getDefaultRegion());

  // 同步 URL 参数到状态
  useEffect(() => {
    setCategorySelection(urlCategory || 'popular');
    setRegionSelection(urlRegion || (isAnime ? 'genre_16' : ''));
    setSelectorsReady(true);
  }, [urlCategory, urlRegion, isAnime]);

  // 更新 URL 参数的函数
  const updateURLParams = useCallback((category: string, region: string) => {
    const params = new URLSearchParams();
    params.set('type', urlType);
    if (category && category !== 'popular') {
      params.set('category', category);
    }
    if (region) {
      params.set('region', region);
    }
    router.replace(`/tmdb?${params.toString()}`, { scroll: false });
  }, [urlType, router]);

  // 生成骨架屏数据
  const skeletonData = Array.from({ length: 20 }, (_, index) => index);

  // 解析地区选择（处理动漫特殊情况）
  // 对于动漫页面，始终包含 Animation genre (16)
  const parseRegionSelection = useCallback((value: string) => {
    if (value.startsWith('genre_')) {
      return { region: '', genre: value.replace('genre_', '') };
    }
    // 动漫模式下，即使选择了地区也要保持 Animation genre
    if (isAnime) {
      return { region: value, genre: '16' };
    }
    return { region: value, genre: '' };
  }, [isAnime]);

  // 加载初始数据
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const { region, genre } = parseRegionSelection(regionSelection);

      const data: TMDBResult = await getTMDBDiscover({
        type,
        category: categorySelection,
        region,
        genre,
        page: 1,
      });

      if (data.code === 200) {
        setTmdbData(data.list);
        setHasMore(
          data.total_pages ? data.total_pages > 1 : data.list.length === 20
        );
        setLoading(false);
      } else {
        throw new Error(data.message || '获取数据失败');
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [type, categorySelection, regionSelection, parseRegionSelection]);

  // 只在选择器准备好后才加载数据
  useEffect(() => {
    if (!selectorsReady) {
      return;
    }

    // 重置页面状态
    setTmdbData([]);
    setCurrentPage(1);
    setHasMore(true);
    setIsLoadingMore(false);

    loadInitialData();
  }, [selectorsReady, type, categorySelection, regionSelection, loadInitialData]);

  // 单独处理 currentPage 变化（加载更多）
  useEffect(() => {
    if (currentPage > 1) {
      const fetchMoreData = async () => {
        try {
          setIsLoadingMore(true);
          const { region, genre } = parseRegionSelection(regionSelection);

          const data: TMDBResult = await getTMDBDiscover({
            type,
            category: categorySelection,
            region,
            genre,
            page: currentPage,
          });

          if (data.code === 200) {
            setTmdbData((prev) => [...prev, ...data.list]);
            setHasMore(
              data.total_pages
                ? currentPage < data.total_pages
                : data.list.length === 20
            );
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
  }, [currentPage, type, categorySelection, regionSelection, parseRegionSelection]);

  // 设置滚动监听
  useEffect(() => {
    if (!hasMore || isLoadingMore || loading) {
      return;
    }

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
  const handleCategoryChange = useCallback(
    (value: string) => {
      if (value !== categorySelection) {
        setLoading(true);
        updateURLParams(value, regionSelection);
      }
    },
    [categorySelection, regionSelection, updateURLParams]
  );

  const handleRegionChange = useCallback(
    (value: string) => {
      if (value !== regionSelection) {
        setLoading(true);
        updateURLParams(categorySelection, value);
      }
    },
    [categorySelection, regionSelection, updateURLParams]
  );

  const getPageTitle = () => {
    if (isAnime) return '动漫';
    return type === 'movie' ? '电影' : '剧集';
  };

  const getActivePath = () => {
    const params = new URLSearchParams();
    // 使用原始的 urlType 以便正确匹配侧边栏
    params.set('type', urlType);

    const queryString = params.toString();
    const activePath = `/tmdb${queryString ? `?${queryString}` : ''}`;
    return activePath;
  };

  return (
    <PageLayout activePath={getActivePath()}>
      <div className="px-4 sm:px-10 py-4 sm:py-8 overflow-visible">
        {/* 页面标题 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 dark:text-gray-200">
            {getPageTitle()}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            来自 TMDB 的精选内容
          </p>
        </div>

        {/* 选择器组件 - 吸顶效果 */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-10 px-4 sm:px-10 py-3 bg-gradient-to-b from-white/95 via-white/90 to-white/0 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-900/0 backdrop-blur-md">
          <div className="bg-white/80 dark:bg-gray-800/60 rounded-2xl p-4 sm:p-5 border border-gray-200/40 dark:border-gray-700/40 shadow-sm backdrop-blur-sm">
            <TMDBSelector
              type={urlType as 'movie' | 'tv' | 'anime'}
              categorySelection={categorySelection}
              regionSelection={regionSelection}
              onCategoryChange={handleCategoryChange}
              onRegionChange={handleRegionChange}
            />
          </div>
        </div>

        {/* 内容展示区域 */}
        <div className="mt-6 overflow-visible">
          {/* 内容网格 */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="enter"
            className="justify-start grid grid-cols-3 gap-x-2 gap-y-12 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-6 sm:gap-y-16"
          >
            {loading || !selectorsReady
              ? // 显示骨架屏
                skeletonData.map((index) => <DoubanCardSkeleton key={index} />)
              : // 显示实际数据
                tmdbData.map((item, index) => (
                  <motion.div
                    key={`${item.id}-${index}`}
                    variants={staggerItem}
                    className="w-full"
                  >
                    <VideoCard
                      from="tmdb"
                      title={item.title}
                      poster={item.poster}
                      tmdb_id={item.id}
                      rate={item.rate}
                      year={item.year}
                      type={item.media_type}
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
              className="flex justify-center mt-12 py-8"
            >
              {isLoadingMore && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500/20 border-t-green-500"></div>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">
                    加载中...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 没有更多数据提示 */}
          {!hasMore && tmdbData.length > 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              已加载全部内容
            </div>
          )}

          {/* 空状态 */}
          {!loading && tmdbData.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              暂无相关内容
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function TMDBPage() {
  return (
    <Suspense>
      <TMDBPageClient />
    </Suspense>
  );
}
