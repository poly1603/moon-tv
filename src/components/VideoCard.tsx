/* eslint-disable @typescript-eslint/no-explicit-any */

import { motion } from 'framer-motion';
import { CheckCircle, Heart, Link, PlayCircleIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';

import { triggerGlobalError } from '@/components/GlobalErrorIndicator';
import { ImagePlaceholder } from '@/components/ImagePlaceholder';

interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  query?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban' | 'tmdb';
  initialFavorited?: boolean;
  currentEpisode?: number;
  douban_id?: string;
  tmdb_id?: string;
  onDelete?: () => void;
  rate?: string;
  items?: SearchResult[];
  type?: string;
}

export default function VideoCard({
  id,
  title = '',
  query = '',
  poster = '',
  episodes,
  source,
  source_name,
  progress = 0,
  year,
  from,
  initialFavorited,
  currentEpisode,
  douban_id,
  tmdb_id,
  onDelete,
  rate,
  items,
  type = '',
}: VideoCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited ?? false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof initialFavorited === 'boolean') {
      setFavorited(initialFavorited);
    }
  }, [initialFavorited]);

  const isAggregate = from === 'search' && !!items?.length;

  const aggregateData = useMemo(() => {
    if (!isAggregate || !items) return null;
    const countMap = new Map<string | number, number>();
    const episodeCountMap = new Map<number, number>();
    items.forEach((item) => {
      if (item.douban_id && item.douban_id !== 0) {
        countMap.set(item.douban_id, (countMap.get(item.douban_id) || 0) + 1);
      }
      const len = item.episodes?.length || 0;
      if (len > 0) {
        episodeCountMap.set(len, (episodeCountMap.get(len) || 0) + 1);
      }
    });

    const getMostFrequent = <T extends string | number>(
      map: Map<T, number>
    ) => {
      let maxCount = 0;
      let result: T | undefined;
      map.forEach((cnt, key) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          result = key;
        }
      });
      return result;
    };

    return {
      first: items[0],
      mostFrequentDoubanId: getMostFrequent(countMap),
      mostFrequentEpisodes: getMostFrequent(episodeCountMap) || 0,
    };
  }, [isAggregate, items]);

  const actualTitle = aggregateData?.first.title ?? title;
  const actualPoster = aggregateData?.first.poster ?? poster;
  const actualSource = aggregateData?.first.source ?? source;
  const actualId = aggregateData?.first.id ?? id;
  const actualDoubanId = String(
    aggregateData?.mostFrequentDoubanId ?? douban_id
  );
  const actualEpisodes = aggregateData?.mostFrequentEpisodes ?? episodes;
  const actualYear = aggregateData?.first.year ?? year;
  const actualQuery = query || '';
  const actualSearchType = isAggregate
    ? aggregateData?.first.episodes?.length === 1
      ? 'movie'
      : 'tv'
    : type;

  const shouldManageFavorite =
    from !== 'douban' &&
    from !== 'tmdb' &&
    Boolean(actualSource) &&
    Boolean(actualId) &&
    !(from === 'search' && isAggregate);

  // 获取收藏状态
  useEffect(() => {
    if (!shouldManageFavorite || !actualSource || !actualId) return;

    const fetchFavoriteStatus = async () => {
      try {
        const fav = await isFavorited(actualSource, actualId);
        setFavorited(fav);
      } catch (err) {
        triggerGlobalError('检查收藏状态失败');
      }
    };

    if (typeof initialFavorited !== 'boolean') {
      fetchFavoriteStatus();
    }

    // 监听收藏状态更新事件
    const storageKey = generateStorageKey(actualSource, actualId);
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        // 检查当前项目是否在新的收藏列表中
        const isNowFavorited = !!newFavorites[storageKey];
        setFavorited(isNowFavorited);
      }
    );

    return unsubscribe;
  }, [shouldManageFavorite, actualSource, actualId, initialFavorited]);

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from === 'douban' || from === 'tmdb' || !actualSource || !actualId) return;
      try {
        if (favorited) {
          // 如果已收藏，删除收藏
          await deleteFavorite(actualSource, actualId);
          setFavorited(false);
        } else {
          // 如果未收藏，添加收藏
          await saveFavorite(actualSource, actualId, {
            title: actualTitle,
            source_name: source_name || '',
            year: actualYear || '',
            cover: actualPoster,
            total_episodes: actualEpisodes ?? 1,
            save_time: Date.now(),
          });
          setFavorited(true);
        }
      } catch (err) {
        triggerGlobalError('切换收藏状态失败');
      }
    },
    [
      from,
      actualSource,
      actualId,
      actualTitle,
      source_name,
      actualYear,
      actualPoster,
      actualEpisodes,
      favorited,
    ]
  );

  const handleDeleteRecord = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from !== 'playrecord' || !actualSource || !actualId) return;
      try {
        await deletePlayRecord(actualSource, actualId);
        onDelete?.();
      } catch (err) {
        triggerGlobalError('删除播放记录失败');
      }
    },
    [from, actualSource, actualId, onDelete]
  );

  const handleClick = useCallback(() => {
    if (from === 'douban' || from === 'tmdb') {
      router.push(
        `/play?title=${encodeURIComponent(actualTitle.trim())}${actualYear ? `&year=${actualYear}` : ''
        }${actualSearchType ? `&stype=${actualSearchType}` : ''}`
      );
    } else if (actualSource && actualId) {
      router.push(
        `/play?source=${actualSource}&id=${actualId}&title=${encodeURIComponent(
          actualTitle
        )}${actualYear ? `&year=${actualYear}` : ''}${isAggregate ? '&prefer=true' : ''
        }${actualQuery ? `&stitle=${encodeURIComponent(actualQuery.trim())}` : ''
        }${actualSearchType ? `&stype=${actualSearchType}` : ''}`
      );
    }
  }, [
    from,
    actualSource,
    actualId,
    router,
    actualTitle,
    actualYear,
    isAggregate,
    actualQuery,
    actualSearchType,
  ]);

  const config = useMemo(() => {
    const configs = {
      playrecord: {
        showSourceName: true,
        showProgress: true,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: true,
        showDoubanLink: false,
        showRating: false,
      },
      favorite: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: false,
        showDoubanLink: false,
        showRating: false,
      },
      search: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: !isAggregate,
        showCheckCircle: false,
        showDoubanLink: !!actualDoubanId,
        showRating: false,
      },
      douban: {
        showSourceName: false,
        showProgress: false,
        showPlayButton: true,
        showHeart: false,
        showCheckCircle: false,
        showDoubanLink: true,
        showRating: !!rate,
      },
      tmdb: {
        showSourceName: false,
        showProgress: false,
        showPlayButton: true,
        showHeart: false,
        showCheckCircle: false,
        showDoubanLink: false,
        showRating: !!rate,
      },
    };
    return configs[from] || configs.search;
  }, [from, isAggregate, actualDoubanId, rate]);

  return (
    <motion.div
      className='group relative w-full rounded-xl bg-transparent cursor-pointer'
      onClick={handleClick}
      whileHover={{ scale: 1.05, zIndex: 500 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* 海报容器 */}
      <div className='relative aspect-[2/3] overflow-hidden rounded-xl shadow-lg group-hover:shadow-2xl transition-shadow duration-300'>
        {/* 骨架屏 */}
        {!isLoading && <ImagePlaceholder aspectRatio='aspect-[2/3]' />}
        {/* 图片 */}
        <Image
          src={processImageUrl(actualPoster)}
          alt={actualTitle}
          fill
          className='object-cover transition-transform duration-500 group-hover:scale-110'
          sizes='(min-width: 640px) 176px, 96px'
          quality={70}
          loading='lazy'
          decoding='async'
          referrerPolicy='no-referrer'
          onLoadingComplete={() => setIsLoading(true)}
          onError={() => setIsLoading(true)}
        />

        {/* 悬浮遮罩 - 渐变更柔和 */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 transition-opacity duration-400 ease-out group-hover:opacity-100' />

        {/* 播放按钮 - 带弹性动画 */}
        {config.showPlayButton && (
          <motion.div
            className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100'
            initial={{ scale: 0.5, opacity: 0 }}
            whileHover={{ scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <motion.div
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              className='transition-all duration-300'
            >
              <PlayCircleIcon
                size={56}
                strokeWidth={0.8}
                className='text-white/90 fill-transparent drop-shadow-lg hover:fill-green-500/80 hover:text-green-400 transition-all duration-300'
              />
            </motion.div>
          </motion.div>
        )}

        {/* 操作按钮 */}
        {(config.showHeart || config.showCheckCircle) && (
          <motion.div
            className='absolute bottom-3 right-3 flex gap-3'
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {config.showCheckCircle && (
              <motion.button
                onClick={handleDeleteRecord}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className='opacity-0 group-hover:opacity-100 transition-opacity duration-300'
              >
                <CheckCircle
                  size={22}
                  className='text-white/90 hover:text-green-400 transition-colors duration-200 drop-shadow-md'
                />
              </motion.button>
            )}
            {config.showHeart && (
              <motion.button
                onClick={handleToggleFavorite}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className='opacity-0 group-hover:opacity-100 transition-opacity duration-300'
              >
                <Heart
                  size={22}
                  className={`transition-all duration-300 drop-shadow-md ${favorited
                      ? 'fill-red-500 stroke-red-500'
                      : 'fill-transparent stroke-white/90 hover:stroke-red-400'
                    }`}
                />
              </motion.button>
            )}
          </motion.div>
        )}

        {/* 徽章 - 评分 */}
        {config.showRating && rate && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className='absolute top-2 right-2 bg-gradient-to-br from-pink-500 to-rose-600 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300'
          >
            {rate}
          </motion.div>
        )}

        {/* 徽章 - 集数 */}
        {actualEpisodes && actualEpisodes > 1 && !config.showRating && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className='absolute top-2 right-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300'
          >
            {currentEpisode
              ? `${currentEpisode}/${actualEpisodes}`
              : actualEpisodes}
          </motion.div>
        )}

        {/* 豆瓣链接 */}
        {config.showDoubanLink && actualDoubanId && (
          <motion.a
            href={`https://movie.douban.com/subject/${actualDoubanId}`}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, x: -10 }}
            whileHover={{ scale: 1.1 }}
            className='absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-300'
          >
            <div className='bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300'>
              <Link size={16} />
            </div>
          </motion.a>
        )}
      </div>

      {/* 进度条 */}
      {config.showProgress && progress !== undefined && (
        <div className='mt-2 h-1.5 w-full bg-gray-200/80 dark:bg-gray-700/80 rounded-full overflow-hidden'>
          <motion.div
            className='h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full'
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* 标题与来源 */}
      <div className='mt-3 text-center'>
        <div className='relative'>
          <span className='block text-sm font-semibold truncate text-gray-800 dark:text-gray-100 transition-colors duration-300 group-hover:text-green-600 dark:group-hover:text-green-400 peer'>
            {actualTitle}
          </span>
          {/* 自定义 tooltip */}
          <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all duration-200 ease-out delay-100 whitespace-nowrap pointer-events-none backdrop-blur-sm'>
            {actualTitle}
            <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95'></div>
          </div>
        </div>
        {config.showSourceName && source_name && (
          <span className='block text-xs text-gray-500 dark:text-gray-400 mt-1.5'>
            <span className='inline-block border rounded-md px-2 py-0.5 border-gray-400/50 dark:border-gray-500/50 transition-all duration-300 group-hover:border-green-500/60 group-hover:text-green-600 dark:group-hover:text-green-400 group-hover:bg-green-50/50 dark:group-hover:bg-green-900/20'>
              {source_name}
            </span>
          </span>
        )}
      </div>
    </motion.div>
  );
}
