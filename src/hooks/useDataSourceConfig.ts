'use client';

import { useCallback, useEffect, useState } from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  type: string;
}

export interface CategoryOption {
  label: string;
  value: string;
}

export interface CategoryConfig {
  primary?: CategoryOption[];
  secondary?: CategoryOption[];
  primaryLabel?: string;
  secondaryLabel?: string;
}

export interface DataSourceConfig {
  dataSource: string;
  menuItems: MenuItem[];
  categories: Record<string, CategoryConfig>;
}

type DataSourceType = 'tmdb' | 'douban';

// 默认配置（在 API 加载前使用）
const defaultTMDBConfig: DataSourceConfig = {
  dataSource: 'tmdb',
  menuItems: [
    { id: 'movie', label: '电影', icon: 'Film', type: 'movie' },
    { id: 'tv', label: '剧集', icon: 'Tv', type: 'tv' },
    { id: 'anime', label: '动漫', icon: 'Clapperboard', type: 'anime' },
  ],
  categories: {
    movie: {
      primary: [
        { label: '热门电影', value: 'popular' },
        { label: '高分佳作', value: 'top_rated' },
      ],
      secondary: [{ label: '全部', value: '' }],
      primaryLabel: '分类',
      secondaryLabel: '地区',
    },
    tv: {
      primary: [
        { label: '热门剧集', value: 'popular' },
        { label: '高分佳作', value: 'top_rated' },
      ],
      secondary: [{ label: '全部', value: '' }],
      primaryLabel: '分类',
      secondaryLabel: '地区',
    },
    anime: {
      primary: [{ label: '热门动漫', value: 'popular' }],
      secondary: [{ label: '全部', value: '' }],
      primaryLabel: '分类',
      secondaryLabel: '地区',
    },
  },
};

const defaultDoubanConfig: DataSourceConfig = {
  dataSource: 'douban',
  menuItems: [
    { id: 'movie', label: '电影', icon: 'Film', type: 'movie' },
    { id: 'tv', label: '剧集', icon: 'Tv', type: 'tv' },
    { id: 'anime', label: '动漫', icon: 'Clapperboard', type: 'anime' },
    { id: 'show', label: '综艺', icon: 'Mic2', type: 'show' },
  ],
  categories: {
    movie: {
      primary: [
        { label: '热门电影', value: '热门' },
        { label: '最新电影', value: '最新' },
        { label: '豆瓣高分', value: '豆瓣高分' },
        { label: '冷门佳片', value: '冷门佳片' },
      ],
      secondary: [
        { label: '全部', value: '全部' },
        { label: '华语', value: '华语' },
        { label: '欧美', value: '欧美' },
        { label: '韩国', value: '韩国' },
        { label: '日本', value: '日本' },
      ],
      primaryLabel: '分类',
      secondaryLabel: '地区',
    },
    tv: {
      secondary: [
        { label: '全部', value: 'tv' },
        { label: '国产剧', value: 'tv_domestic' },
        { label: '欧美剧', value: 'tv_american' },
        { label: '日剧', value: 'tv_japanese' },
        { label: '韩剧', value: 'tv_korean' },
        { label: '纪录片', value: 'tv_documentary' },
      ],
      secondaryLabel: '类型',
    },
    anime: {
      secondary: [{ label: '全部动漫', value: 'tv_animation' }],
      secondaryLabel: '类型',
    },
    show: {
      secondary: [
        { label: '全部', value: 'show' },
        { label: '国内综艺', value: 'show_domestic' },
        { label: '国外综艺', value: 'show_foreign' },
      ],
      secondaryLabel: '类型',
    },
  },
};

// 全局缓存
const configCache: Record<string, DataSourceConfig> = {};

export function useDataSourceConfig() {
  const [dataSource, setDataSource] = useState<DataSourceType>('tmdb');
  const [config, setConfig] = useState<DataSourceConfig>(defaultTMDBConfig);
  const [loading, setLoading] = useState(true);

  // 读取本地存储的数据源设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dataSource');
      if (saved === 'douban' || saved === 'tmdb') {
        setDataSource(saved);
        // 立即使用默认配置
        setConfig(saved === 'douban' ? defaultDoubanConfig : defaultTMDBConfig);
      }

      // 监听数据源变更事件
      const handleDataSourceChange = (e: Event) => {
        const customEvent = e as CustomEvent<DataSourceType>;
        setDataSource(customEvent.detail);
      };
      window.addEventListener('dataSourceChanged', handleDataSourceChange);
      return () => {
        window.removeEventListener('dataSourceChanged', handleDataSourceChange);
      };
    }
  }, []);

  // 从 API 获取配置
  const fetchConfig = useCallback(async (source: DataSourceType) => {
    // 检查缓存
    if (configCache[source]) {
      setConfig(configCache[source]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/config/categories?source=${source}`);
      if (response.ok) {
        const data: DataSourceConfig = await response.json();
        configCache[source] = data;
        setConfig(data);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
      // 使用默认配置
      setConfig(source === 'douban' ? defaultDoubanConfig : defaultTMDBConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  // 数据源变化时获取配置
  useEffect(() => {
    setLoading(true);
    // 先使用默认配置
    setConfig(dataSource === 'douban' ? defaultDoubanConfig : defaultTMDBConfig);
    // 然后从 API 获取最新配置
    fetchConfig(dataSource);
  }, [dataSource, fetchConfig]);

  // 获取指定类型的分类配置
  const getCategoryConfig = useCallback(
    (type: string): CategoryConfig | undefined => {
      return config.categories[type];
    },
    [config]
  );

  return {
    dataSource,
    config,
    loading,
    menuItems: config.menuItems,
    getCategoryConfig,
  };
}

// 导出默认配置供其他地方使用
export { defaultDoubanConfig, defaultTMDBConfig };
