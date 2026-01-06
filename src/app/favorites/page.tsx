/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';

import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';

import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

const staggerContainer = {
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

type FavoriteItem = {
  id: string;
  source: string;
  title: string;
  poster: string;
  episodes: number;
  source_name: string;
  currentEpisode?: number;
  search_title?: string;
};

function FavoritesClient() {
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const updateFavoriteItems = async (allFavorites: Record<string, any>) => {
    const allPlayRecords = await getAllPlayRecords();

    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);

        const playRecord = allPlayRecords[key];
        const currentEpisode = playRecord?.index;

        return {
          id,
          source,
          title: fav.title,
          year: fav.year,
          poster: fav.cover,
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode,
          search_title: fav?.search_title,
        } as FavoriteItem;
      });
    setFavoriteItems(sorted);
    setLoading(false);
  };

  useEffect(() => {
    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };

    loadFavorites();

    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        updateFavoriteItems(newFavorites);
      }
    );

    return unsubscribe;
  }, []);

  return (
    <PageLayout>
      <div className='px-2 sm:px-10 py-4 sm:py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <h1 className='text-2xl font-bold text-gray-800 dark:text-gray-200'>
            我的收藏
          </h1>
          {favoriteItems.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors'
              onClick={async () => {
                await clearAllFavorites();
                setFavoriteItems([]);
              }}
            >
              清空
            </motion.button>
          )}
        </div>

        {loading ? (
          <div className='grid grid-cols-3 gap-x-2 gap-y-12 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-6 sm:gap-y-16'>
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className='w-full'>
                <div className='relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gray-200 animate-pulse dark:bg-gray-800' />
                <div className='mt-3 h-4 bg-gray-200 rounded-lg animate-pulse dark:bg-gray-800' />
              </div>
            ))}
          </div>
        ) : favoriteItems.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial='initial'
            animate='enter'
            className='grid grid-cols-3 gap-x-2 gap-y-12 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-x-6 sm:gap-y-16'
          >
            {favoriteItems.map((item) => (
              <motion.div
                key={item.id + item.source}
                variants={staggerItem}
                className='w-full'
              >
                <VideoCard
                  query={item.search_title}
                  {...item}
                  initialFavorited={true}
                  from='favorite'
                  type={item.episodes > 1 ? 'tv' : ''}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className='text-center text-gray-500 py-16 dark:text-gray-400'>
            暂无收藏内容
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense>
      <FavoritesClient />
    </Suspense>
  );
}
