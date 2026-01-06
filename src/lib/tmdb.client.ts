import { TMDBItem, TMDBResult } from './types';

export interface TMDBDiscoverParams {
  type: 'movie' | 'tv';
  category?: string; // popular, top_rated, now_playing, upcoming, on_the_air
  region?: string; // CN, US, JP, KR
  genre?: string; // 类型 ID
  page?: number;
}

/**
 * 获取 TMDB 发现数据
 */
export async function getTMDBDiscover(
  params: TMDBDiscoverParams
): Promise<TMDBResult> {
  const { type, category = 'popular', region = '', genre = '', page = 1 } = params;

  const searchParams = new URLSearchParams({
    type,
    category,
    page: String(page),
  });

  if (region) {
    searchParams.set('region', region);
  }

  if (genre) {
    searchParams.set('genre', genre);
  }

  try {
    const response = await fetch(`/api/tmdb/discover?${searchParams.toString()}`);

    if (!response.ok) {
      // 触发全局错误提示
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('globalError', {
            detail: { message: '获取 TMDB 数据失败' },
          })
        );
      }
      throw new Error('获取 TMDB 数据失败');
    }

    return response.json();
  } catch (error) {
    // 触发全局错误提示
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('globalError', {
          detail: { message: '获取 TMDB 数据失败' },
        })
      );
    }
    throw error;
  }
}

// TMDB 电影分类配置
export const TMDB_MOVIE_CATEGORIES = [
  { label: '热门电影', value: 'popular' },
  { label: '正在热映', value: 'now_playing' },
  { label: '高分佳作', value: 'top_rated' },
  { label: '即将上映', value: 'upcoming' },
];

// TMDB 电影地区配置
export const TMDB_MOVIE_REGIONS = [
  { label: '全部', value: '' },
  { label: '华语', value: 'CN' },
  { label: '欧美', value: 'US' },
  { label: '日本', value: 'JP' },
  { label: '韩国', value: 'KR' },
];

// TMDB 电视剧分类配置
export const TMDB_TV_CATEGORIES = [
  { label: '热门剧集', value: 'popular' },
  { label: '正在热播', value: 'on_the_air' },
  { label: '高分佳作', value: 'top_rated' },
  { label: '今日播出', value: 'airing_today' },
];

// TMDB 电视剧地区配置
export const TMDB_TV_REGIONS = [
  { label: '全部', value: '' },
  { label: '国产剧', value: 'CN' },
  { label: '美剧', value: 'US' },
  { label: '日剧', value: 'JP' },
  { label: '韩剧', value: 'KR' },
  { label: '英剧', value: 'GB' },
];

// TMDB 动漫类型 ID（Animation genre）
export const TMDB_ANIMATION_GENRE_ID = '16';

// 热门搜索（从 TMDB 热门数据中提取）
interface HotSearchItem {
  word: string;
  type: string;
}

interface HotSearchResult {
  code: number;
  message: string;
  list: HotSearchItem[];
}

/**
 * 获取 TMDB 热门搜索（从热门电影/剧集中提取）
 */
export async function getTMDBHotSearch(): Promise<HotSearchResult> {
  try {
    const [movieRes, tvRes] = await Promise.allSettled([
      getTMDBDiscover({ type: 'movie', category: 'popular', page: 1 }),
      getTMDBDiscover({ type: 'tv', category: 'popular', page: 1 }),
    ]);

    const list: HotSearchItem[] = [];
    const seen = new Set<string>();

    if (movieRes.status === 'fulfilled' && movieRes.value.code === 200) {
      for (const item of movieRes.value.list.slice(0, 6)) {
        if (item.title && !seen.has(item.title)) {
          seen.add(item.title);
          list.push({ word: item.title, type: 'movie' });
        }
      }
    }

    if (tvRes.status === 'fulfilled' && tvRes.value.code === 200) {
      for (const item of tvRes.value.list.slice(0, 6)) {
        if (item.title && !seen.has(item.title)) {
          seen.add(item.title);
          list.push({ word: item.title, type: 'tv' });
        }
      }
    }

    return {
      code: 200,
      message: list.length > 0 ? '获取成功' : '暂无数据',
      list,
    };
  } catch {
    return { code: 200, message: '获取失败', list: [] };
  }
}

// 将 TMDBItem 转换为兼容 DoubanItem 的格式（用于 VideoCard）
export function tmdbItemToDoubanFormat(item: TMDBItem) {
  return {
    id: item.id,
    title: item.title,
    poster: item.poster,
    rate: item.rate,
    year: item.year,
  };
}
