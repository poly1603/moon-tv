import { NextResponse } from 'next/server';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
}

interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
}

interface TMDBItem {
  id: string;
  title: string;
  poster: string;
  rate: string;
  year: string;
  media_type: 'movie' | 'tv';
}

// 构建 TMDB API URL
function buildTMDBUrl(
  endpoint: string,
  params: Record<string, string | number | undefined>
): string {
  const url = new URL(`${TMDB_API_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'zh-CN');

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

// 转换电影数据为统一格式
function transformMovie(movie: TMDBMovie): TMDBItem {
  return {
    id: String(movie.id),
    title: movie.title || movie.original_title,
    poster: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : '',
    rate: movie.vote_average ? movie.vote_average.toFixed(1) : '',
    year: movie.release_date?.substring(0, 4) || '',
    media_type: 'movie',
  };
}

// 转换电视剧数据为统一格式
function transformTVShow(show: TMDBTVShow): TMDBItem {
  return {
    id: String(show.id),
    title: show.name || show.original_name,
    poster: show.poster_path ? `${TMDB_IMAGE_BASE}${show.poster_path}` : '',
    rate: show.vote_average ? show.vote_average.toFixed(1) : '',
    year: show.first_air_date?.substring(0, 4) || '',
    media_type: 'tv',
  };
}

export async function GET(request: Request) {
  // 检查 API Key
  if (!TMDB_API_KEY) {
    return NextResponse.json(
      { error: 'TMDB_API_KEY 未配置', code: 500 },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);

  // 获取参数
  const mediaType = searchParams.get('type') || 'movie'; // movie 或 tv
  const category = searchParams.get('category') || 'popular'; // popular, top_rated, now_playing, upcoming, on_the_air
  const region = searchParams.get('region') || ''; // CN, US, JP, KR 等
  const genre = searchParams.get('genre') || ''; // 类型 ID
  const page = parseInt(searchParams.get('page') || '1');

  // 验证参数
  if (!['movie', 'tv'].includes(mediaType)) {
    return NextResponse.json(
      { error: 'type 参数必须是 movie 或 tv' },
      { status: 400 }
    );
  }

  if (page < 1 || page > 500) {
    return NextResponse.json(
      { error: 'page 必须在 1-500 之间' },
      { status: 400 }
    );
  }

  try {
    let endpoint: string;
    const params: Record<string, string | number | undefined> = { page };

    // 根据分类选择不同的端点
    if (category === 'popular') {
      endpoint = `/${mediaType}/popular`;
    } else if (category === 'top_rated') {
      endpoint = `/${mediaType}/top_rated`;
    } else if (category === 'now_playing' && mediaType === 'movie') {
      endpoint = '/movie/now_playing';
    } else if (category === 'upcoming' && mediaType === 'movie') {
      endpoint = '/movie/upcoming';
    } else if (category === 'on_the_air' && mediaType === 'tv') {
      endpoint = '/tv/on_the_air';
    } else if (category === 'airing_today' && mediaType === 'tv') {
      endpoint = '/tv/airing_today';
    } else {
      // 使用 discover 端点进行更灵活的筛选
      endpoint = `/discover/${mediaType}`;
      params.sort_by = 'popularity.desc';
    }

    // 添加地区筛选（使用 discover 端点）
    if (region) {
      endpoint = `/discover/${mediaType}`;
      params.with_origin_country = region;
      params.sort_by = 'popularity.desc';
    }

    // 添加类型筛选
    if (genre) {
      endpoint = `/discover/${mediaType}`;
      params.with_genres = genre;
      params.sort_by = 'popularity.desc';
    }

    // 高分筛选需要额外参数
    if (category === 'top_rated' && (region || genre)) {
      params.sort_by = 'vote_average.desc';
      params['vote_count.gte'] = 100;
    }

    const url = buildTMDBUrl(endpoint, params);

    const fetchResponse = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!fetchResponse.ok) {
      throw new Error(`TMDB API error! Status: ${fetchResponse.status}`);
    }

    const data: TMDBDiscoverResponse<TMDBMovie | TMDBTVShow> =
      await fetchResponse.json();

    // 转换数据格式
    const list: TMDBItem[] = data.results.map((item) => {
      if (mediaType === 'movie') {
        return transformMovie(item as TMDBMovie);
      } else {
        return transformTVShow(item as TMDBTVShow);
      }
    });

    const response = {
      code: 200,
      message: '获取成功',
      list,
      total_pages: data.total_pages,
      total_results: data.total_results,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('TMDB API Error:', error);
    return NextResponse.json(
      { error: '获取 TMDB 数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
