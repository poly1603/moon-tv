/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';

const hmacKeyCache = new Map<string, Promise<CryptoKey>>();

async function getHmacKey(secret: string): Promise<CryptoKey> {
  let cached = hmacKeyCache.get(secret);
  if (!cached) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    cached = crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    hmacKeyCache.set(secret, cached);
  }
  return cached;
}

function hexToUint8Array(hex: string): Uint8Array {
  if (!hex || hex.length % 2 !== 0) {
    return new Uint8Array(new ArrayBuffer(0));
  }
  const buffer = new ArrayBuffer(hex.length / 2);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const password = (process.env.PASSWORD || '').trim();

  const allowEmptyPasswordInDev =
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_ALLOW_EMPTY_PASSWORD === 'true';

  if (pathname.startsWith('/login')) {
    if (!password) {
      if (allowEmptyPasswordInDev) {
        return NextResponse.next();
      }
      const warningUrl = new URL('/warning', request.url);
      return NextResponse.redirect(warningUrl);
    }
    return NextResponse.next();
  }

  // 跳过不需要认证的路径
  if (shouldSkipAuth(pathname)) {
    return NextResponse.next();
  }

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';

  if (!password) {
    if (allowEmptyPasswordInDev) {
      return NextResponse.next();
    }
    const warningUrl = new URL('/warning', request.url);
    return NextResponse.redirect(warningUrl);
  }

  // 从cookie获取认证信息
  const authInfo = getAuthInfoFromCookie(request);

  console.log('[Middleware Debug] pathname:', pathname);
  console.log('[Middleware Debug] storageType:', storageType);
  console.log('[Middleware Debug] authInfo:', authInfo ? JSON.stringify(authInfo) : 'null');

  if (!authInfo) {
    console.log('[Middleware Debug] No authInfo, redirecting to login');
    return handleAuthFailure(request, pathname);
  }

  // localstorage模式：在middleware中完成验证
  if (storageType === 'localstorage') {
    if (!authInfo.password || authInfo.password !== password) {
      return handleAuthFailure(request, pathname);
    }
    return NextResponse.next();
  }

  // 其他模式：只验证签名
  // 检查是否有用户名（非lasticsearch模式下密码不存储在cookie中）
  if (!authInfo.username || !authInfo.signature) {
    console.log('[Middleware Debug] Missing username or signature, redirecting to login');
    return handleAuthFailure(request, pathname);
  }

  // 验证签名（如果存在）
  if (authInfo.signature) {
    const isValidSignature = await verifySignature(
      authInfo.username,
      authInfo.signature,
      password
    );

    console.log('[Middleware Debug] Signature verification result:', isValidSignature);

    // 签名验证通过即可
    if (isValidSignature) {
      console.log('[Middleware Debug] Auth success, allowing access');
      return NextResponse.next();
    }
  }

  // 签名验证失败或不存在签名
  console.log('[Middleware Debug] Signature verification failed, redirecting to login');
  return handleAuthFailure(request, pathname);
}

// 验证签名
async function verifySignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!secret) {
    return false;
  }
  const encoder = new TextEncoder();
  const messageData = encoder.encode(data);

  try {
    const key = await getHmacKey(secret);

    const signatureBytes = hexToUint8Array(signature);
    if (signatureBytes.length === 0) {
      return false;
    }

    // Edge Runtime 中直接使用 Uint8Array
    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      messageData
    );
  } catch (error) {
    console.error('签名验证失败:', error);
    return false;
  }
}

// 处理认证失败的情况
function handleAuthFailure(
  request: NextRequest,
  pathname: string
): NextResponse {
  // 如果是 API 路由，返回 401 状态码
  if (pathname.startsWith('/api')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 否则重定向到登录页面
  const loginUrl = new URL('/login', request.url);
  // 保留完整的URL，包括查询参数
  const fullUrl = `${pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set('redirect', fullUrl);
  return NextResponse.redirect(loginUrl);
}

// 判断是否需要跳过认证的路径
function shouldSkipAuth(pathname: string): boolean {
  const skipPaths = [
    '/_next',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/icons/',
    '/logo.png',
    '/screenshot.png',
  ];

  return skipPaths.some((path) => pathname.startsWith(path));
}

// 配置middleware匹配规则
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|warning|api/login|api/register|api/logout|api/cron|api/server-config).*)',
  ],
};
