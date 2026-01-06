/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

import { getDoubanCategories } from '@/lib/douban.client';
import { getTMDBDiscover } from '@/lib/tmdb.client';
import { DoubanItem, TMDBItem } from '@/lib/types';

import ContinueWatching from '@/components/ContinueWatching';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';

// 统一的数据类型
type VideoItem = (TMDBItem | DoubanItem) & { id: string | number };

function HomeClient() {
  const [hotMovies, setHotMovies] = useState<VideoItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'tmdb' | 'douban'>('tmdb');
  const { announcement } = useSite();

  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // 检查公告弹窗状态
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeenAnnouncement && announcement));
      }
    }
  }, [announcement]);

  // 读取数据源设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dataSource');
      if (saved === 'douban' || saved === 'tmdb') {
        setDataSource(saved);
      }

      // 监听数据源变更事件
      const handleDataSourceChange = (e: Event) => {
        const customEvent = e as CustomEvent<'tmdb' | 'douban'>;
        setDataSource(customEvent.detail);
      };
      window.addEventListener('dataSourceChanged', handleDataSourceChange);
      return () => {
        window.removeEventListener('dataSourceChanged', handleDataSourceChange);
      };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setHotMovies([]);
        setHotTvShows([]);

        const withTimeout = <T,>(promise: Promise<T>, ms: number) => {
          return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), ms)
            ),
          ]);
        };

        const maxWaitMs = process.env.NODE_ENV === 'development' ? 4000 : 8000;

        if (dataSource === 'tmdb') {
          // TMDB 数据源
          const tasks = [
            {
              promise: withTimeout(
                getTMDBDiscover({
                  type: 'movie',
                  category: 'popular',
                  page: 1,
                }),
                maxWaitMs
              ),
              setter: setHotMovies,
            },
            {
              promise: withTimeout(
                getTMDBDiscover({
                  type: 'tv',
                  category: 'popular',
                  page: 1,
                }),
                maxWaitMs
              ),
              setter: setHotTvShows,
            },
          ];

          tasks.forEach(({ promise, setter }) => {
            promise
              .then((data) => {
                if (cancelled) return;
                if (data && (data as any).code === 200) {
                  setter((data as any).list || []);
                }
              })
              .catch(() => {
                // 忽略单路失败
              });
          });

          const allSettled = Promise.allSettled(tasks.map((t) => t.promise));
          const maxWait = new Promise((resolve) => setTimeout(resolve, maxWaitMs));
          await Promise.race([allSettled, maxWait]);
        } else {
          // 豆瓣数据源
          const tasks = [
            {
              promise: withTimeout(
                getDoubanCategories({
                  kind: 'movie',
                  category: '热门',
                  type: '全部',
                  pageLimit: 20,
                  pageStart: 0,
                }),
                maxWaitMs
              ),
              setter: setHotMovies,
            },
            {
              promise: withTimeout(
                getDoubanCategories({
                  kind: 'tv',
                  category: '热门',
                  type: '全部',
                  pageLimit: 20,
                  pageStart: 0,
                }),
                maxWaitMs
              ),
              setter: setHotTvShows,
            },
          ];

          tasks.forEach(({ promise, setter }) => {
            promise
              .then((data) => {
                if (cancelled) return;
                if (data && (data as any).code === 200) {
                  setter((data as any).list || []);
                }
              })
              .catch(() => {
                // 忽略单路失败
              });
          });

          const allSettled = Promise.allSettled(tasks.map((t) => t.promise));
          const maxWait = new Promise((resolve) => setTimeout(resolve, maxWaitMs));
          await Promise.race([allSettled, maxWait]);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  const handleCloseAnnouncement = (announcement: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', announcement);
  };

  return (
    <PageLayout>
      <div className='px-2 sm:px-10 py-4 sm:py-8 overflow-visible'>
        {/* 继续观看 */}
        <ContinueWatching />

        {/* 热门电影 */}
        <section className='mb-8'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
              热门电影
            </h2>
            <Link
              href={dataSource === 'tmdb' ? '/tmdb?type=movie' : '/douban?type=movie'}
              className='flex items-center text-sm text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors'
            >
              查看更多
              <ChevronRight className='w-4 h-4 ml-1' />
            </Link>
          </div>
          <ScrollableRow>
            {loading && hotMovies.length === 0
              ? Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                >
                  <div className='relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gray-200 animate-pulse dark:bg-gray-800'>
                    <div className='absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800'></div>
                  </div>
                  <div className='mt-3 h-4 bg-gray-200 rounded-lg animate-pulse dark:bg-gray-800'></div>
                </div>
              ))
              : hotMovies.length > 0
                ? hotMovies.map((movie, index) => (
                  <motion.div
                    key={`${dataSource}-movie-${movie.id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                  >
                    <VideoCard
                      from={dataSource}
                      title={movie.title}
                      poster={movie.poster}
                      douban_id={dataSource === 'douban' ? String(movie.id) : undefined}
                      tmdb_id={dataSource === 'tmdb' ? Number(movie.id) : undefined}
                      rate={movie.rate}
                      year={movie.year}
                      type='movie'
                    />
                  </motion.div>
                ))
                : (
                  <div className='px-4 text-sm text-gray-500 dark:text-gray-400'>
                    暂无数据
                  </div>
                )}
          </ScrollableRow>
        </section>

        {/* 热门剧集 */}
        <section className='mb-8'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
              热门剧集
            </h2>
            <Link
              href={dataSource === 'tmdb' ? '/tmdb?type=tv' : '/douban?type=tv'}
              className='flex items-center text-sm text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors'
            >
              查看更多
              <ChevronRight className='w-4 h-4 ml-1' />
            </Link>
          </div>
          <ScrollableRow>
            {loading && hotTvShows.length === 0
              ? Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                >
                  <div className='relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gray-200 animate-pulse dark:bg-gray-800'>
                    <div className='absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800'></div>
                  </div>
                  <div className='mt-3 h-4 bg-gray-200 rounded-lg animate-pulse dark:bg-gray-800'></div>
                </div>
              ))
              : hotTvShows.length > 0
                ? hotTvShows.map((show, index) => (
                  <motion.div
                    key={`${dataSource}-tv-${show.id}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                  >
                    <VideoCard
                      from={dataSource}
                      title={show.title}
                      poster={show.poster}
                      douban_id={dataSource === 'douban' ? String(show.id) : undefined}
                      tmdb_id={dataSource === 'tmdb' ? Number(show.id) : undefined}
                      rate={show.rate}
                      year={show.year}
                      type='tv'
                    />
                  </motion.div>
                ))
                : (
                  <div className='px-4 text-sm text-gray-500 dark:text-gray-400'>
                    暂无数据
                  </div>
                )}
          </ScrollableRow>
        </section>
      </div>

      {announcement && showAnnouncement && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4'
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900'
            >
              <div className='flex justify-between items-start mb-4'>
                <h3 className='text-2xl font-bold tracking-tight text-gray-800 dark:text-white'>
                  <span className='bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent'>
                    提示
                  </span>
                </h3>
                <motion.button
                  onClick={() => handleCloseAnnouncement(announcement)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-white transition-colors'
                  aria-label='关闭'
                >
                  <X className='w-5 h-5' />
                </motion.button>
              </div>
              <div className='mb-6'>
                <div className='relative overflow-hidden rounded-xl mb-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4'>
                  <div className='absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-green-500 to-emerald-600'></div>
                  <p className='ml-2 text-gray-600 dark:text-gray-300 leading-relaxed'>
                    {announcement}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={() => handleCloseAnnouncement(announcement)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className='w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-white font-medium shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300'
              >
                我知道了
              </motion.button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
