/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'edge';

// 导出配置数据
export async function GET(request: NextRequest) {
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
    const config = await getConfig();

    // 检查权限：只有站长可以导出数据
    if (username !== process.env.USERNAME) {
      return NextResponse.json(
        { error: '只有站长可以导出数据' },
        { status: 403 }
      );
    }

    // 构建导出数据（排除敏感信息）
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      data: {
        SiteConfig: {
          SiteName: config.SiteConfig.SiteName,
          Announcement: config.SiteConfig.Announcement,
          SearchDownstreamMaxPage: config.SiteConfig.SearchDownstreamMaxPage,
          SiteInterfaceCacheTime: config.SiteConfig.SiteInterfaceCacheTime,
          DisableYellowFilter: config.SiteConfig.DisableYellowFilter,
        },
        SourceConfig: config.SourceConfig.map((s) => ({
          key: s.key,
          name: s.name,
          api: s.api,
          detail: s.detail,
          from: s.from,
          disabled: s.disabled,
        })),
        CustomCategories: config.CustomCategories.map((c) => ({
          name: c.name,
          type: c.type,
          query: c.query,
          from: c.from,
          disabled: c.disabled,
        })),
        ConfigFile: config.ConfigFile || '',
      },
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="moontv-config-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('导出数据失败:', error);
    return NextResponse.json(
      { error: '导出数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}
