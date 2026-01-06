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

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  type: string;
}

interface CategoryOption {
  label: string;
  value: string;
}

interface CategoryConfig {
  primary?: CategoryOption[];
  secondary?: CategoryOption[];
  primaryLabel?: string;
  secondaryLabel?: string;
}

interface DataSourceConfig {
  dataSource: string;
  menuItems: MenuItem[];
  categories: Record<string, CategoryConfig>;
}

type CacheEntry = {
  expiresAt: number;
  value: DataSourceConfig;
};

const configCache = new Map<string, CacheEntry>();
const CACHE_TIME = 60 * 60 * 1000; // 1小时缓存

// 豆瓣的菜单和分类配置（豆瓣没有动态获取分类的API，所以这些是固定的）
function getDoubanConfig(): DataSourceConfig {
  return {
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
        secondary: [
          { label: '全部动漫', value: 'tv_animation' },
        ],
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
}

// 从 TMDB API 动态获取配置
async function getTMDBConfig(): Promise<DataSourceConfig> {
  // 获取电影和电视剧的 genres
  const [movieGenresRes, tvGenresRes] = await Promise.all([
    fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=zh-CN`),
    fetch(`${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}&language=zh-CN`),
  ]);

  let movieGenres: TMDBGenre[] = [];
  let tvGenres: TMDBGenre[] = [];

  if (movieGenresRes.ok) {
    const data: TMDBGenresResponse = await movieGenresRes.json();
    movieGenres = data.genres;
  }

  if (tvGenresRes.ok) {
    const data: TMDBGenresResponse = await tvGenresRes.json();
    tvGenres = data.genres;
  }

  // 找到动画类型的 ID
  const animationGenre = tvGenres.find(g => g.name === '动画' || g.name === 'Animation');
  const animationGenreId = animationGenre?.id || 16;

  // 构建分类配置
  // TMDB 的主要分类（popular, top_rated 等）是固定的排序方式
  const moviePrimaryCategories: CategoryOption[] = [
    { label: '热门电影', value: 'popular' },
    { label: '正在热映', value: 'now_playing' },
    { label: '高分佳作', value: 'top_rated' },
    { label: '即将上映', value: 'upcoming' },
  ];

  const tvPrimaryCategories: CategoryOption[] = [
    { label: '热门剧集', value: 'popular' },
    { label: '正在热播', value: 'on_the_air' },
    { label: '高分佳作', value: 'top_rated' },
    { label: '今日播出', value: 'airing_today' },
  ];

  // 地区选项
  const regionOptions: CategoryOption[] = [
    { label: '全部', value: '' },
    { label: '华语', value: 'CN' },
    { label: '欧美', value: 'US' },
    { label: '日本', value: 'JP' },
    { label: '韩国', value: 'KR' },
  ];

  const tvRegionOptions: CategoryOption[] = [
    { label: '全部', value: '' },
    { label: '国产剧', value: 'CN' },
    { label: '美剧', value: 'US' },
    { label: '日剧', value: 'JP' },
    { label: '韩剧', value: 'KR' },
    { label: '英剧', value: 'GB' },
  ];

  // genres 可以在未来用于更细粒度的类型筛选
  // 目前暂不使用，保留以备后续扩展
  void movieGenres;
  void tvGenres;
  void animationGenreId;

  return {
    dataSource: 'tmdb',
    menuItems: [
      { id: 'movie', label: '电影', icon: 'Film', type: 'movie' },
      { id: 'tv', label: '剧集', icon: 'Tv', type: 'tv' },
      { id: 'anime', label: '动漫', icon: 'Clapperboard', type: 'anime' },
    ],
    categories: {
      movie: {
        primary: moviePrimaryCategories,
        secondary: regionOptions,
        primaryLabel: '分类',
        secondaryLabel: '地区',
      },
      tv: {
        primary: tvPrimaryCategories,
        secondary: tvRegionOptions,
        primaryLabel: '分类',
        secondaryLabel: '地区',
      },
      anime: {
        primary: [
          { label: '热门动漫', value: 'popular' },
          { label: '正在热播', value: 'on_the_air' },
          { label: '高分佳作', value: 'top_rated' },
        ],
        secondary: [
          { label: '全部', value: '' },
          { label: '日本', value: 'JP' },
          { label: '美国', value: 'US' },
          { label: '中国', value: 'CN' },
        ],
        primaryLabel: '分类',
        secondaryLabel: '地区',
      },
    },
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataSource = searchParams.get('source') || 'tmdb';

  if (!['tmdb', 'douban'].includes(dataSource)) {
    return NextResponse.json(
      { error: 'source 参数必须是 tmdb 或 douban' },
      { status: 400 }
    );
  }

  const cacheKey = `config_${dataSource}`;
  const cached = configCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.value);
  }

  try {
    let config: DataSourceConfig;

    if (dataSource === 'douban') {
      config = getDoubanConfig();
    } else {
      if (!TMDB_API_KEY) {
        // 如果没有 TMDB API Key，返回默认配置
        config = {
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
              secondary: [
                { label: '全部', value: '' },
              ],
              primaryLabel: '分类',
              secondaryLabel: '地区',
            },
            tv: {
              primary: [
                { label: '热门剧集', value: 'popular' },
                { label: '高分佳作', value: 'top_rated' },
              ],
              secondary: [
                { label: '全部', value: '' },
              ],
              primaryLabel: '分类',
              secondaryLabel: '地区',
            },
            anime: {
              primary: [
                { label: '热门动漫', value: 'popular' },
              ],
              secondary: [
                { label: '全部', value: '' },
              ],
              primaryLabel: '分类',
              secondaryLabel: '地区',
            },
          },
        };
      } else {
        config = await getTMDBConfig();
      }
    }

    configCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TIME,
      value: config,
    });

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json(
      { error: '获取配置失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
