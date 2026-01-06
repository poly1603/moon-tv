/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { Redis } from '@upstash/redis';

import { AdminConfig } from './admin.types';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';

// 搜索历史最大条数
const SEARCH_HISTORY_LIMIT = 20;

// 数据类型转换辅助函数
function ensureString(value: any): string {
  return String(value);
}

function ensureStringArray(value: any[]): string[] {
  return value.map((item) => String(item));
}

// 添加Upstash Redis操作重试包装器
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err: any) {
      const isLastAttempt = i === maxRetries - 1;
      const isConnectionError =
        err.message?.includes('Connection') ||
        err.message?.includes('ECONNREFUSED') ||
        err.message?.includes('ENOTFOUND') ||
        err.code === 'ECONNRESET' ||
        err.code === 'EPIPE' ||
        err.name === 'UpstashError';

      if (isConnectionError && !isLastAttempt) {
        console.log(
          `Upstash Redis operation failed, retrying... (${i + 1}/${maxRetries})`
        );
        console.error('Error:', err.message);

        // 等待一段时间后重试
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      throw err;
    }
  }

  throw new Error('Max retries exceeded');
}

export class UpstashRedisStorage implements IStorage {
  private client: Redis;

  constructor() {
    this.client = getUpstashRedisClient();
  }

  // ---------- 播放记录 ----------
  private prKey(user: string, key: string) {
    return `u:${user}:pr:${key}`; // u:username:pr:source+id
  }

  async getPlayRecord(
    userName: string,
    key: string
  ): Promise<PlayRecord | null> {
    const val = await withRetry(() =>
      this.client.get(this.prKey(userName, key))
    );
    return val ? (val as PlayRecord) : null;
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void> {
    await withRetry(() => this.client.set(this.prKey(userName, key), record));
  }

  async getAllPlayRecords(
    userName: string
  ): Promise<Record<string, PlayRecord>> {
    const pattern = `u:${userName}:pr:*`;
    const keys: string[] = await withRetry(() => this.client.keys(pattern));
    if (keys.length === 0) return {};

    const result: Record<string, PlayRecord> = {};
    for (const fullKey of keys) {
      const value = await withRetry(() => this.client.get(fullKey));
      if (value) {
        // 截取 source+id 部分
        const keyPart = ensureString(fullKey.replace(`u:${userName}:pr:`, ''));
        result[keyPart] = value as PlayRecord;
      }
    }
    return result;
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    await withRetry(() => this.client.del(this.prKey(userName, key)));
  }

  // ---------- 收藏 ----------
  private favKey(user: string, key: string) {
    return `u:${user}:fav:${key}`;
  }

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    const val = await withRetry(() =>
      this.client.get(this.favKey(userName, key))
    );
    return val ? (val as Favorite) : null;
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite
  ): Promise<void> {
    await withRetry(() =>
      this.client.set(this.favKey(userName, key), favorite)
    );
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    const pattern = `u:${userName}:fav:*`;
    const keys: string[] = await withRetry(() => this.client.keys(pattern));
    if (keys.length === 0) return {};

    const result: Record<string, Favorite> = {};
    for (const fullKey of keys) {
      const value = await withRetry(() => this.client.get(fullKey));
      if (value) {
        const keyPart = ensureString(fullKey.replace(`u:${userName}:fav:`, ''));
        result[keyPart] = value as Favorite;
      }
    }
    return result;
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    await withRetry(() => this.client.del(this.favKey(userName, key)));
  }

  // ---------- 用户注册 / 登录 ----------
  private userPwdKey(user: string) {
    return `u:${user}:pwd`;
  }

  async registerUser(userName: string, password: string): Promise<void> {
    // 简单存储明文密码，生产环境应加密
    await withRetry(() => this.client.set(this.userPwdKey(userName), password));
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    const stored = await withRetry(() =>
      this.client.get(this.userPwdKey(userName))
    );
    if (stored === null) return false;
    // 确保比较时都是字符串类型
    return ensureString(stored) === password;
  }

  // 检查用户是否存在
  async checkUserExist(userName: string): Promise<boolean> {
    // 使用 EXISTS 判断 key 是否存在
    const exists = await withRetry(() =>
      this.client.exists(this.userPwdKey(userName))
    );
    return exists === 1;
  }

  // 修改用户密码
  async changePassword(userName: string, newPassword: string): Promise<void> {
    // 简单存储明文密码，生产环境应加密
    await withRetry(() =>
      this.client.set(this.userPwdKey(userName), newPassword)
    );
  }

  // 删除用户及其所有数据
  async deleteUser(userName: string): Promise<void> {
    // 删除用户密码
    await withRetry(() => this.client.del(this.userPwdKey(userName)));

    // 删除搜索历史
    await withRetry(() => this.client.del(this.shKey(userName)));

    // 删除播放记录
    const playRecordPattern = `u:${userName}:pr:*`;
    const playRecordKeys = await withRetry(() =>
      this.client.keys(playRecordPattern)
    );
    if (playRecordKeys.length > 0) {
      await withRetry(() => this.client.del(...playRecordKeys));
    }

    // 删除收藏夹
    const favoritePattern = `u:${userName}:fav:*`;
    const favoriteKeys = await withRetry(() =>
      this.client.keys(favoritePattern)
    );
    if (favoriteKeys.length > 0) {
      await withRetry(() => this.client.del(...favoriteKeys));
    }

    // 删除跳过片头片尾配置
    const skipConfigPattern = `u:${userName}:skip:*`;
    const skipConfigKeys = await withRetry(() =>
      this.client.keys(skipConfigPattern)
    );
    if (skipConfigKeys.length > 0) {
      await withRetry(() => this.client.del(...skipConfigKeys));
    }
  }

  // ---------- 搜索历史 ----------
  private shKey(user: string) {
    return `u:${user}:sh`; // u:username:sh
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    const result = await withRetry(() =>
      this.client.lrange(this.shKey(userName), 0, -1)
    );
    // 确保返回的都是字符串类型
    return ensureStringArray(result as any[]);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    const key = this.shKey(userName);
    // 先去重
    await withRetry(() => this.client.lrem(key, 0, ensureString(keyword)));
    // 插入到最前
    await withRetry(() => this.client.lpush(key, ensureString(keyword)));
    // 限制最大长度
    await withRetry(() => this.client.ltrim(key, 0, SEARCH_HISTORY_LIMIT - 1));
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    const key = this.shKey(userName);
    if (keyword) {
      await withRetry(() => this.client.lrem(key, 0, ensureString(keyword)));
    } else {
      await withRetry(() => this.client.del(key));
    }
  }

  // ---------- 获取全部用户 ----------
  async getAllUsers(): Promise<string[]> {
    const keys = await withRetry(() => this.client.keys('u:*:pwd'));
    return keys
      .map((k) => {
        const match = k.match(/^u:(.+?):pwd$/);
        return match ? ensureString(match[1]) : undefined;
      })
      .filter((u): u is string => typeof u === 'string');
  }

  // ---------- 管理员配置 (旧版，保留用于迁移) ----------
  private adminConfigKey() {
    return 'admin:config';
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    const val = await withRetry(() => this.client.get(this.adminConfigKey()));
    return val ? (val as AdminConfig) : null;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    await withRetry(() => this.client.set(this.adminConfigKey(), config));
  }

  // ---------- 新版分离存储 ----------

  // 站点配置
  private siteConfigKey() {
    return 'site:config';
  }

  async getSiteConfig(): Promise<AdminConfig['SiteConfig'] | null> {
    const val = await withRetry(() => this.client.get(this.siteConfigKey()));
    return val ? (val as AdminConfig['SiteConfig']) : null;
  }

  async setSiteConfig(config: AdminConfig['SiteConfig']): Promise<void> {
    await withRetry(() => this.client.set(this.siteConfigKey(), config));
  }

  // 视频源配置
  private sourceConfigKey() {
    return 'site:sources';
  }

  async getSourceConfig(): Promise<AdminConfig['SourceConfig'] | null> {
    const val = await withRetry(() => this.client.get(this.sourceConfigKey()));
    return val ? (val as AdminConfig['SourceConfig']) : null;
  }

  async setSourceConfig(config: AdminConfig['SourceConfig']): Promise<void> {
    await withRetry(() => this.client.set(this.sourceConfigKey(), config));
  }

  // 自定义分类
  private categoriesKey() {
    return 'site:categories';
  }

  async getCustomCategories(): Promise<AdminConfig['CustomCategories'] | null> {
    const val = await withRetry(() => this.client.get(this.categoriesKey()));
    return val ? (val as AdminConfig['CustomCategories']) : null;
  }

  async setCustomCategories(categories: AdminConfig['CustomCategories']): Promise<void> {
    await withRetry(() => this.client.set(this.categoriesKey(), categories));
  }

  // 允许注册
  private allowRegisterKey() {
    return 'site:allow_register';
  }

  async getAllowRegister(): Promise<boolean> {
    const val = await withRetry(() => this.client.get(this.allowRegisterKey()));
    return val === true || val === 'true';
  }

  async setAllowRegister(allow: boolean): Promise<void> {
    await withRetry(() => this.client.set(this.allowRegisterKey(), allow));
  }

  // 用户角色
  private userRoleKey(user: string) {
    return `u:${user}:role`;
  }

  async getUserRole(userName: string): Promise<'owner' | 'admin' | 'user' | null> {
    const val = await withRetry(() => this.client.get(this.userRoleKey(userName)));
    if (val === 'owner' || val === 'admin' || val === 'user') {
      return val;
    }
    return null;
  }

  async setUserRole(userName: string, role: 'owner' | 'admin' | 'user'): Promise<void> {
    await withRetry(() => this.client.set(this.userRoleKey(userName), role));
  }

  async deleteUserRole(userName: string): Promise<void> {
    await withRetry(() => this.client.del(this.userRoleKey(userName)));
  }

  // 用户封禁状态
  private userBannedKey(user: string) {
    return `u:${user}:banned`;
  }

  async getUserBanned(userName: string): Promise<boolean> {
    const val = await withRetry(() => this.client.get(this.userBannedKey(userName)));
    return val === true || val === 'true';
  }

  async setUserBanned(userName: string, banned: boolean): Promise<void> {
    if (banned) {
      await withRetry(() => this.client.set(this.userBannedKey(userName), true));
    } else {
      await withRetry(() => this.client.del(this.userBannedKey(userName)));
    }
  }

  // 获取所有用户及其角色/状态
  async getAllUsersWithRoles(): Promise<Array<{ username: string; role: 'owner' | 'admin' | 'user'; banned?: boolean }>> {
    const userNames = await this.getAllUsers();
    const users: Array<{ username: string; role: 'owner' | 'admin' | 'user'; banned?: boolean }> = [];
    
    for (const username of userNames) {
      const role = await this.getUserRole(username) || 'user';
      const banned = await this.getUserBanned(username);
      users.push({ username, role, banned: banned || undefined });
    }
    
    return users;
  }

  // 数据迁移: 从旧的 admin:config 迁移到新结构
  async migrateFromLegacy(): Promise<boolean> {
    // 检查是否存在旧的 admin:config
    const legacyConfig = await this.getAdminConfig();
    if (!legacyConfig) {
      return false; // 没有旧数据需要迁移
    }

    // 检查是否已经迁移过 (新 key 已存在)
    const siteConfig = await this.getSiteConfig();
    if (siteConfig) {
      return false; // 已经迁移过
    }

    console.log('[Migration] Starting migration from legacy admin:config...');

    // 迁移站点配置
    if (legacyConfig.SiteConfig) {
      await this.setSiteConfig(legacyConfig.SiteConfig);
      console.log('[Migration] Site config migrated');
    }

    // 迁移视频源配置
    if (legacyConfig.SourceConfig) {
      await this.setSourceConfig(legacyConfig.SourceConfig);
      console.log('[Migration] Source config migrated');
    }

    // 迁移自定义分类
    if (legacyConfig.CustomCategories) {
      await this.setCustomCategories(legacyConfig.CustomCategories);
      console.log('[Migration] Custom categories migrated');
    }

    // 迁移允许注册设置
    if (legacyConfig.UserConfig) {
      await this.setAllowRegister(legacyConfig.UserConfig.AllowRegister || false);
      console.log('[Migration] Allow register setting migrated');

      // 迁移用户角色和封禁状态
      for (const user of legacyConfig.UserConfig.Users || []) {
        if (user.role && user.role !== 'user') {
          await this.setUserRole(user.username, user.role);
        }
        if (user.banned) {
          await this.setUserBanned(user.username, true);
        }
      }
      console.log('[Migration] User roles migrated');
    }

    // 删除旧的 admin:config
    await withRetry(() => this.client.del(this.adminConfigKey()));
    console.log('[Migration] Legacy admin:config removed');
    console.log('[Migration] Migration completed successfully!');

    return true;
  }

  // 从新结构组装 AdminConfig (用于兼容现有 API)
  async getAdminConfigFromSeparated(): Promise<AdminConfig | null> {
    const siteConfig = await this.getSiteConfig();
    const sourceConfig = await this.getSourceConfig();
    const categories = await this.getCustomCategories();
    const allowRegister = await this.getAllowRegister();
    const users = await this.getAllUsersWithRoles();

    // 如果没有站点配置，说明没有初始化
    if (!siteConfig) {
      return null;
    }

    return {
      SiteConfig: siteConfig,
      UserConfig: {
        AllowRegister: allowRegister,
        Users: users,
      },
      SourceConfig: sourceConfig || [],
      CustomCategories: categories || [],
    };
  }

  // 保存完整的 AdminConfig 到分离结构
  async setAdminConfigSeparated(config: AdminConfig): Promise<void> {
    // 保存站点配置
    await this.setSiteConfig(config.SiteConfig);

    // 保存视频源配置
    await this.setSourceConfig(config.SourceConfig);

    // 保存自定义分类
    await this.setCustomCategories(config.CustomCategories);

    // 保存允许注册设置
    await this.setAllowRegister(config.UserConfig.AllowRegister);

    // 保存用户角色和封禁状态
    for (const user of config.UserConfig.Users) {
      if (user.role && user.role !== 'user') {
        await this.setUserRole(user.username, user.role);
      } else {
        // 如果是普通用户，删除可能存在的 role key
        await this.deleteUserRole(user.username);
      }
      await this.setUserBanned(user.username, user.banned || false);
    }
  }

  // ---------- 跳过片头片尾配置 ----------
  private skipConfigKey(user: string, source: string, id: string) {
    return `u:${user}:skip:${source}+${id}`;
  }

  async getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<SkipConfig | null> {
    const val = await withRetry(() =>
      this.client.get(this.skipConfigKey(userName, source, id))
    );
    return val ? (val as SkipConfig) : null;
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig
  ): Promise<void> {
    await withRetry(() =>
      this.client.set(this.skipConfigKey(userName, source, id), config)
    );
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    await withRetry(() =>
      this.client.del(this.skipConfigKey(userName, source, id))
    );
  }

  async getAllSkipConfigs(
    userName: string
  ): Promise<{ [key: string]: SkipConfig }> {
    const pattern = `u:${userName}:skip:*`;
    const keys = await withRetry(() => this.client.keys(pattern));

    if (keys.length === 0) {
      return {};
    }

    const configs: { [key: string]: SkipConfig } = {};

    // 批量获取所有配置
    const values = await withRetry(() => this.client.mget(keys));

    keys.forEach((key, index) => {
      const value = values[index];
      if (value) {
        // 从key中提取source+id
        const match = key.match(/^u:.+?:skip:(.+)$/);
        if (match) {
          const sourceAndId = match[1];
          configs[sourceAndId] = value as SkipConfig;
        }
      }
    });

    return configs;
  }
}

// 单例 Upstash Redis 客户端
function getUpstashRedisClient(): Redis {
  const globalKey = Symbol.for('__MOONTV_UPSTASH_REDIS_CLIENT__');
  let client: Redis | undefined = (global as any)[globalKey];

  if (!client) {
    const upstashUrl = process.env.UPSTASH_URL;
    const upstashToken = process.env.UPSTASH_TOKEN;

    if (!upstashUrl || !upstashToken) {
      throw new Error(
        'UPSTASH_URL and UPSTASH_TOKEN env variables must be set'
      );
    }

    // 创建 Upstash Redis 客户端
    client = new Redis({
      url: upstashUrl,
      token: upstashToken,
      // 可选配置
      retry: {
        retries: 3,
        backoff: (retryCount: number) =>
          Math.min(1000 * Math.pow(2, retryCount), 30000),
      },
    });

    console.log('Upstash Redis client created successfully');

    (global as any)[globalKey] = client;
  }

  return client;
}
