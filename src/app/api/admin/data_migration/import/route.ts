/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'edge';

// 导入配置数据
export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json(
      { error: '不支持本地存储进行数据迁移' },
      { status: 400 }
    );
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = authInfo.username;

  try {
    // 检查权限：只有站长可以导入数据
    if (username !== process.env.USERNAME) {
      return NextResponse.json(
        { error: '只有站长可以导入数据' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 验证导入数据格式
    if (!body.version || !body.data) {
      return NextResponse.json(
        { error: '无效的导入数据格式' },
        { status: 400 }
      );
    }

    const importData = body.data;
    const config = await getConfig();

    // 合并站点配置
    if (importData.SiteConfig) {
      if (importData.SiteConfig.SearchDownstreamMaxPage !== undefined) {
        config.SiteConfig.SearchDownstreamMaxPage =
          importData.SiteConfig.SearchDownstreamMaxPage;
      }
      if (importData.SiteConfig.SiteInterfaceCacheTime !== undefined) {
        config.SiteConfig.SiteInterfaceCacheTime =
          importData.SiteConfig.SiteInterfaceCacheTime;
      }
      if (importData.SiteConfig.DisableYellowFilter !== undefined) {
        config.SiteConfig.DisableYellowFilter =
          importData.SiteConfig.DisableYellowFilter;
      }
    }

    // 合并视频源配置
    if (importData.SourceConfig && Array.isArray(importData.SourceConfig)) {
      const existingKeys = new Set(config.SourceConfig.map((s) => s.key));

      importData.SourceConfig.forEach(
        (source: {
          key: string;
          name: string;
          api: string;
          detail?: string;
          from?: 'config' | 'custom';
          disabled?: boolean;
        }) => {
          if (!existingKeys.has(source.key)) {
            config.SourceConfig.push({
              key: source.key,
              name: source.name,
              api: source.api,
              detail: source.detail,
              from: source.from || 'custom',
              disabled: source.disabled || false,
            });
          }
        }
      );
    }

    // 合并自定义分类
    if (
      importData.CustomCategories &&
      Array.isArray(importData.CustomCategories)
    ) {
      const existingKeys = new Set(
        config.CustomCategories.map((c) => `${c.query}:${c.type}`)
      );

      importData.CustomCategories.forEach(
        (category: {
          name?: string;
          type: 'movie' | 'tv';
          query: string;
          from?: 'config' | 'custom';
          disabled?: boolean;
        }) => {
          const key = `${category.query}:${category.type}`;
          if (!existingKeys.has(key)) {
            config.CustomCategories.push({
              name: category.name,
              type: category.type,
              query: category.query,
              from: category.from || 'custom',
              disabled: category.disabled || false,
            });
          }
        }
      );
    }

    // 合并配置文件
    if (importData.ConfigFile) {
      config.ConfigFile = importData.ConfigFile;
    }

    // 保存配置
    await db.saveAdminConfig(config);

    return NextResponse.json({
      ok: true,
      message: '导入成功',
    });
  } catch (error) {
    console.error('导入数据失败:', error);
    return NextResponse.json(
      { error: '导入数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
