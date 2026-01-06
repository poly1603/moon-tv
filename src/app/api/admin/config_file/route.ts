/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'edge';

// 获取配置文件内容
export async function GET(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      { error: '不支持本地存储进行配置文件管理' },
      { status: 400 }
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = authInfo.username;

  try {
    const config = await getConfig();

    // 检查权限：只有站长和管理员可以访问
    if (username !== process.env.USERNAME) {
      const user = config.UserConfig.Users.find((u) => u.username === username);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return NextResponse.json(
          { error: '无权限访问' },
          { status: 403 }
        );
      }
    }

    // 返回配置文件内容
    return NextResponse.json({
      configFile: config.ConfigFile || '{}',
    });
  } catch (error) {
    console.error('获取配置文件失败:', error);
    return NextResponse.json(
      { error: '获取配置文件失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 保存配置文件内容
export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      { error: '不支持本地存储进行配置文件管理' },
      { status: 400 }
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = authInfo.username;

  try {
    const config = await getConfig();

    // 检查权限：只有站长可以修改配置文件
    if (username !== process.env.USERNAME) {
      return NextResponse.json(
        { error: '只有站长可以修改配置文件' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { configFile } = body;

    if (typeof configFile !== 'string') {
      return NextResponse.json(
        { error: '配置文件内容必须是字符串' },
        { status: 400 }
      );
    }

    // 验证 JSON 格式
    try {
      JSON.parse(configFile);
    } catch (e) {
      return NextResponse.json(
        { error: 'JSON 格式错误: ' + (e as Error).message },
        { status: 400 }
      );
    }

    // 更新配置
    config.ConfigFile = configFile;
    await db.saveAdminConfig(config);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('保存配置文件失败:', error);
    return NextResponse.json(
      { error: '保存配置文件失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
