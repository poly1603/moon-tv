/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { AdminConfig } from './admin.types';
import { D1Storage } from './d1.db';
import { RedisStorage } from './redis.db';
import { Favorite, IStorage, PlayRecord, SkipConfig } from './types';
import { UpstashRedisStorage } from './upstash.db';

// storage type 常量: 'localstorage' | 'redis' | 'd1' | 'upstash'，默认 'localstorage'
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'd1'
    | 'upstash'
    | undefined) || 'localstorage';

// 创建存储实例
function createStorage(): IStorage {
  switch (STORAGE_TYPE) {
    case 'redis':
      return new RedisStorage();
    case 'upstash':
      return new UpstashRedisStorage();
    case 'd1':
      return new D1Storage();
    case 'localstorage':
    default:
      // 默认返回内存实现，保证本地开发可用
      return null as unknown as IStorage;
  }
}

// 单例存储实例
let storageInstance: IStorage | null = null;

export function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}

// 工具函数：生成存储key
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// 导出便捷方法
export class DbManager {
  private storage: IStorage;

  constructor() {
    this.storage = getStorage();
  }

  // 播放记录相关方法
  async getPlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<PlayRecord | null> {
    const key = generateStorageKey(source, id);
    return this.storage.getPlayRecord(userName, key);
  }

  async savePlayRecord(
    userName: string,
    source: string,
    id: string,
    record: PlayRecord
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.setPlayRecord(userName, key, record);
  }

  async getAllPlayRecords(userName: string): Promise<{
    [key: string]: PlayRecord;
  }> {
    return this.storage.getAllPlayRecords(userName);
  }

  async deletePlayRecord(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.deletePlayRecord(userName, key);
  }

  // 收藏相关方法
  async getFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<Favorite | null> {
    const key = generateStorageKey(source, id);
    return this.storage.getFavorite(userName, key);
  }

  async saveFavorite(
    userName: string,
    source: string,
    id: string,
    favorite: Favorite
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.setFavorite(userName, key, favorite);
  }

  async getAllFavorites(
    userName: string
  ): Promise<{ [key: string]: Favorite }> {
    return this.storage.getAllFavorites(userName);
  }

  async deleteFavorite(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    const key = generateStorageKey(source, id);
    await this.storage.deleteFavorite(userName, key);
  }

  async isFavorited(
    userName: string,
    source: string,
    id: string
  ): Promise<boolean> {
    const favorite = await this.getFavorite(userName, source, id);
    return favorite !== null;
  }

  // ---------- 用户相关 ----------
  async registerUser(userName: string, password: string): Promise<void> {
    await this.storage.registerUser(userName, password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    return this.storage.verifyUser(userName, password);
  }

  // 检查用户是否已存在
  async checkUserExist(userName: string): Promise<boolean> {
    return this.storage.checkUserExist(userName);
  }

  // ---------- 搜索历史 ----------
  async getSearchHistory(userName: string): Promise<string[]> {
    return this.storage.getSearchHistory(userName);
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    await this.storage.addSearchHistory(userName, keyword);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    await this.storage.deleteSearchHistory(userName, keyword);
  }

  // 获取全部用户名
  async getAllUsers(): Promise<string[]> {
    if (typeof (this.storage as any).getAllUsers === 'function') {
      return (this.storage as any).getAllUsers();
    }
    return [];
  }

  // ---------- 管理员配置 ----------
  async getAdminConfig(): Promise<AdminConfig | null> {
    if (typeof (this.storage as any).getAdminConfig === 'function') {
      return (this.storage as any).getAdminConfig();
    }
    return null;
  }

  async saveAdminConfig(config: AdminConfig): Promise<void> {
    if (typeof (this.storage as any).setAdminConfig === 'function') {
      await (this.storage as any).setAdminConfig(config);
    }
  }

  // ---------- 跳过片头片尾配置 ----------
  async getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<SkipConfig | null> {
    if (typeof (this.storage as any).getSkipConfig === 'function') {
      return (this.storage as any).getSkipConfig(userName, source, id);
    }
    return null;
  }

  async setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig
  ): Promise<void> {
    if (typeof (this.storage as any).setSkipConfig === 'function') {
      await (this.storage as any).setSkipConfig(userName, source, id, config);
    }
  }

  async deleteSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<void> {
    if (typeof (this.storage as any).deleteSkipConfig === 'function') {
      await (this.storage as any).deleteSkipConfig(userName, source, id);
    }
  }

  async getAllSkipConfigs(
    userName: string
  ): Promise<{ [key: string]: SkipConfig }> {
    if (typeof (this.storage as any).getAllSkipConfigs === 'function') {
      return (this.storage as any).getAllSkipConfigs(userName);
    }
    return {};
  }

  // ---------- 新版分离存储方法 ----------

  // 站点配置
  async getSiteConfig(): Promise<AdminConfig['SiteConfig'] | null> {
    if (typeof (this.storage as any).getSiteConfig === 'function') {
      return (this.storage as any).getSiteConfig();
    }
    return null;
  }

  async setSiteConfig(config: AdminConfig['SiteConfig']): Promise<void> {
    if (typeof (this.storage as any).setSiteConfig === 'function') {
      await (this.storage as any).setSiteConfig(config);
    }
  }

  // 视频源配置
  async getSourceConfig(): Promise<AdminConfig['SourceConfig'] | null> {
    if (typeof (this.storage as any).getSourceConfig === 'function') {
      return (this.storage as any).getSourceConfig();
    }
    return null;
  }

  async setSourceConfig(config: AdminConfig['SourceConfig']): Promise<void> {
    if (typeof (this.storage as any).setSourceConfig === 'function') {
      await (this.storage as any).setSourceConfig(config);
    }
  }

  // 自定义分类
  async getCustomCategories(): Promise<AdminConfig['CustomCategories'] | null> {
    if (typeof (this.storage as any).getCustomCategories === 'function') {
      return (this.storage as any).getCustomCategories();
    }
    return null;
  }

  async setCustomCategories(categories: AdminConfig['CustomCategories']): Promise<void> {
    if (typeof (this.storage as any).setCustomCategories === 'function') {
      await (this.storage as any).setCustomCategories(categories);
    }
  }

  // 允许注册
  async getAllowRegister(): Promise<boolean> {
    if (typeof (this.storage as any).getAllowRegister === 'function') {
      return (this.storage as any).getAllowRegister();
    }
    return false;
  }

  async setAllowRegister(allow: boolean): Promise<void> {
    if (typeof (this.storage as any).setAllowRegister === 'function') {
      await (this.storage as any).setAllowRegister(allow);
    }
  }

  // 用户角色
  async getUserRole(userName: string): Promise<'owner' | 'admin' | 'user' | null> {
    if (typeof (this.storage as any).getUserRole === 'function') {
      return (this.storage as any).getUserRole(userName);
    }
    return null;
  }

  async setUserRole(userName: string, role: 'owner' | 'admin' | 'user'): Promise<void> {
    if (typeof (this.storage as any).setUserRole === 'function') {
      await (this.storage as any).setUserRole(userName, role);
    }
  }

  async deleteUserRole(userName: string): Promise<void> {
    if (typeof (this.storage as any).deleteUserRole === 'function') {
      await (this.storage as any).deleteUserRole(userName);
    }
  }

  // 用户封禁状态
  async getUserBanned(userName: string): Promise<boolean> {
    if (typeof (this.storage as any).getUserBanned === 'function') {
      return (this.storage as any).getUserBanned(userName);
    }
    return false;
  }

  async setUserBanned(userName: string, banned: boolean): Promise<void> {
    if (typeof (this.storage as any).setUserBanned === 'function') {
      await (this.storage as any).setUserBanned(userName, banned);
    }
  }

  // 获取所有用户及角色
  async getAllUsersWithRoles(): Promise<Array<{ username: string; role: 'owner' | 'admin' | 'user'; banned?: boolean }>> {
    if (typeof (this.storage as any).getAllUsersWithRoles === 'function') {
      return (this.storage as any).getAllUsersWithRoles();
    }
    return [];
  }

  // 数据迁移
  async migrateFromLegacy(): Promise<boolean> {
    if (typeof (this.storage as any).migrateFromLegacy === 'function') {
      return (this.storage as any).migrateFromLegacy();
    }
    return false;
  }

  // 从分离结构获取完整配置
  async getAdminConfigFromSeparated(): Promise<AdminConfig | null> {
    if (typeof (this.storage as any).getAdminConfigFromSeparated === 'function') {
      return (this.storage as any).getAdminConfigFromSeparated();
    }
    return null;
  }

  // 保存完整配置到分离结构
  async setAdminConfigSeparated(config: AdminConfig): Promise<void> {
    if (typeof (this.storage as any).setAdminConfigSeparated === 'function') {
      await (this.storage as any).setAdminConfigSeparated(config);
    }
  }
}

// 导出默认实例
export const db = new DbManager();
