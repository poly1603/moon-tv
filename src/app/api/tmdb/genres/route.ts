import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBGenresResponse {
  genres: TMDBGenre[];
}

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const genresCache = new Map<string, CacheEntry>();
const CACHE_TIME = 24 * 60 * 60 * 1000; // 24小时缓存

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'movie'; // movie 或 tv

  if (!['movie', 'tv'].includes(type)) {
    return NextResponse.json(
      { error: 'type 参数必须是 movie 或 tv' },
      { status: 400 }
    );
  }

  const cacheKey = `genres_${type}`;
  const cached = genresCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value);
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json(
      { error: 'TMDB API Key 未配置' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/genre/${type}/list?api_key=${TMDB_API_KEY}&language=zh-CN`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data: TMDBGenresResponse = await response.json();

    const result = {
      code: 200,
      message: '获取成功',
      type,
      genres: data.genres.map(g => ({
        id: g.id,
        name: g.name,
        value: String(g.id),
      })),
    };

    genresCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TIME,
      value: result,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('获取 TMDB genres 失败:', error);
    return NextResponse.json(
      { error: '获取类型列表失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
