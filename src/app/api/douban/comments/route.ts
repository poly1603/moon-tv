import { NextRequest, NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';

type CacheEntry = {
  expiresAt: number;
  value: CommentsResult;
  headers: Record<string, string>;
};

const responseCache = new Map<string, CacheEntry>();

interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  rating: number;
  date: string;
  useful_count: number;
}

interface CommentsResult {
  code: number;
  message: string;
  comments: Comment[];
  hasMore: boolean;
}

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const start = parseInt(searchParams.get('start') || '0', 10);
  const count = parseInt(searchParams.get('count') || '20', 10);

  if (!id) {
    return NextResponse.json({
      code: 400,
      message: '缺少豆瓣ID参数',
      comments: [],
      hasMore: false,
    });
  }

  const cacheKey = `douban-comments-${id}-${start}-${count}`;
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
      Referer: `https://movie.douban.com/subject/${id}/`,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    },
  };

  try {
    // 获取豆瓣短评页面
    const url = `https://movie.douban.com/subject/${id}/comments?start=${start}&limit=${count}&status=P&sort=new_score`;
    const res = await fetch(url, fetchOptions);

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({
        code: res.status,
        message: '获取评论失败',
        comments: [],
        hasMore: false,
      });
    }

    const html = await res.text();
    const comments = parseComments(html);
    
    // 检查是否还有更多评论
    const hasMore = comments.length >= count;

    const result: CommentsResult = {
      code: 200,
      message: '获取成功',
      comments,
      hasMore,
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
    console.error('获取豆瓣评论失败:', error);
    return NextResponse.json({
      code: 500,
      message: '获取评论失败',
      comments: [],
      hasMore: false,
    });
  }
}

function parseComments(html: string): Comment[] {
  const comments: Comment[] = [];
  
  // 先找到评论区域
  const commentsSection = html.match(/<div class="mod-bd" id="comments">([\s\S]*?)<div id="paginator"/);
  if (!commentsSection) {
    // 尝试备用匹配
    const altSection = html.match(/<div class="mod-bd" id="comments">([\s\S]*)$/);
    if (!altSection) return comments;
  }

  // 使用更精确的方式分割评论项
  const commentBlocks = html.split(/<div class="comment-item"/).slice(1);
  
  for (const block of commentBlocks) {
    // 提取 data-cid
    const cidMatch = block.match(/^[^>]*data-cid="(\d+)"/);
    const id = cidMatch ? cidMatch[1] : `comment-${Date.now()}-${Math.random()}`;

    // 解析头像 - 在 avatar div 中的 img
    const avatarMatch = block.match(/<div class="avatar">[\s\S]*?<img\s+src="([^"]+)"/);
    const avatar = avatarMatch ? avatarMatch[1] : '';

    // 解析作者 - 在 comment-info 中的第一个 a 标签
    const authorMatch = block.match(/<span class="comment-info">[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
    const author = authorMatch ? authorMatch[1].trim() : '匿名用户';

    // 解析评分 (allstar10-50 对应 1-5 星)
    const ratingMatch = block.match(/class="allstar(\d+)/);
    const rating = ratingMatch ? Math.min(5, Math.max(0, Math.floor(parseInt(ratingMatch[1], 10) / 10))) : 0;

    // 解析日期
    const dateMatch = block.match(/<span class="comment-time"[^>]*title="([^"]+)"/);
    const date = dateMatch ? dateMatch[1].trim() : '';

    // 解析评论内容
    const contentMatch = block.match(/<span class="short">([\s\S]*?)<\/span>/);
    const content = contentMatch ? contentMatch[1].trim().replace(/<[^>]+>/g, '') : '';

    // 解析有用数
    const usefulMatch = block.match(/<span class="[^"]*vote-count[^"]*">(\d+)<\/span>/);
    const useful_count = usefulMatch ? parseInt(usefulMatch[1], 10) : 0;

    if (content) {
      comments.push({
        id,
        author,
        avatar,
        content,
        rating,
        date,
        useful_count,
      });
    }
  }

  return comments;
}
