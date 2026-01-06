import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';

type CacheEntry = {
  expiresAt: number;
  value: HotSearchResult;
  headers: Record<string, string>;
};

const responseCache = new Map<string, CacheEntry>();

interface HotSearchItem {
  word: string;
  type: string;
}

interface HotSearchResult {
  code: number;
  message: string;
  list: HotSearchItem[];
}

export const runtime = 'edge';

export async function GET() {
  const cacheKey = 'douban-hot-search';
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value, {
      headers: cached.headers,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
    },
  };

  try {
    // 从豆瓣热门电影和电视剧接口获取数据
    const [movieRes, tvRes] = await Promise.allSettled([
      fetch(
        'https://movie.douban.com/j/search_subjects?type=movie&tag=热门&sort=recommend&page_limit=10&page_start=0',
        fetchOptions
      ),
      fetch(
        'https://movie.douban.com/j/search_subjects?type=tv&tag=热门&sort=recommend&page_limit=10&page_start=0',
        fetchOptions
      ),
    ]);

    clearTimeout(timeoutId);

    const list: HotSearchItem[] = [];
    const seen = new Set<string>();

    // 处理电影数据
    if (movieRes.status === 'fulfilled' && movieRes.value.ok) {
      const movieData = await movieRes.value.json();
      if (movieData.subjects) {
        for (const item of movieData.subjects.slice(0, 6)) {
          if (item.title && !seen.has(item.title)) {
            seen.add(item.title);
            list.push({ word: item.title, type: 'movie' });
          }
        }
      }
    }

    // 处理电视剧数据
    if (tvRes.status === 'fulfilled' && tvRes.value.ok) {
      const tvData = await tvRes.value.json();
      if (tvData.subjects) {
        for (const item of tvData.subjects.slice(0, 6)) {
          if (item.title && !seen.has(item.title)) {
            seen.add(item.title);
            list.push({ word: item.title, type: 'tv' });
          }
        }
      }
    }

    // 如果没有获取到数据，返回空列表
    if (list.length === 0) {
      return NextResponse.json({
        code: 200,
        message: '暂无热门数据',
        list: [],
      });
    }

    const result: HotSearchResult = {
      code: 200,
      message: '获取成功',
      list,
    };

    const cacheTime = await getCacheTime();
    const headers = {
      'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
      'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
      'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
    };

    responseCache.set(cacheKey, {
      expiresAt: Date.now() + cacheTime * 1000,
      value: result,
      headers,
    });

    return NextResponse.json(result, { headers });
  } catch (error) {
    clearTimeout(timeoutId);
    return NextResponse.json({
      code: 200,
      message: '获取失败',
      list: [],
    });
  }
}
