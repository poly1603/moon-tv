'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Database, Image as ImageIcon, Link2, Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import PageLayout from '@/components/PageLayout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: Window & { RUNTIME_CONFIG?: any };

export default function SettingsPage() {
  const router = useRouter();

  // 数据源设置
  const [dataSource, setDataSource] = useState<'tmdb' | 'douban'>('tmdb');

  // 设置相关状态
  const [defaultAggregateSearch, setDefaultAggregateSearch] = useState(true);
  const [doubanProxyUrl, setDoubanProxyUrl] = useState('');
  const [imageProxyUrl, setImageProxyUrl] = useState('');
  const [enableOptimization, setEnableOptimization] = useState(true);
  const [enableImageProxy, setEnableImageProxy] = useState(false);
  const [enableDoubanProxy, setEnableDoubanProxy] = useState(false);

  // 从 localStorage 读取设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 数据源设置
      const savedDataSource = localStorage.getItem('dataSource');
      if (savedDataSource === 'douban' || savedDataSource === 'tmdb') {
        setDataSource(savedDataSource);
      }

      const savedAggregateSearch = localStorage.getItem('defaultAggregateSearch');
      if (savedAggregateSearch !== null) {
        setDefaultAggregateSearch(JSON.parse(savedAggregateSearch));
      }

      const savedEnableDoubanProxy = localStorage.getItem('enableDoubanProxy');
      const defaultDoubanProxy = window.RUNTIME_CONFIG?.DOUBAN_PROXY || '';
      if (savedEnableDoubanProxy !== null) {
        setEnableDoubanProxy(JSON.parse(savedEnableDoubanProxy));
      } else if (defaultDoubanProxy) {
        setEnableDoubanProxy(true);
      }

      const savedDoubanProxyUrl = localStorage.getItem('doubanProxyUrl');
      if (savedDoubanProxyUrl !== null) {
        setDoubanProxyUrl(savedDoubanProxyUrl);
      } else if (defaultDoubanProxy) {
        setDoubanProxyUrl(defaultDoubanProxy);
      }

      const savedEnableImageProxy = localStorage.getItem('enableImageProxy');
      const defaultImageProxy = window.RUNTIME_CONFIG?.IMAGE_PROXY || '';
      if (savedEnableImageProxy !== null) {
        setEnableImageProxy(JSON.parse(savedEnableImageProxy));
      } else if (defaultImageProxy) {
        setEnableImageProxy(true);
      }

      const savedImageProxyUrl = localStorage.getItem('imageProxyUrl');
      if (savedImageProxyUrl !== null) {
        setImageProxyUrl(savedImageProxyUrl);
      } else if (defaultImageProxy) {
        setImageProxyUrl(defaultImageProxy);
      }

      const savedEnableOptimization = localStorage.getItem('enableOptimization');
      if (savedEnableOptimization !== null) {
        setEnableOptimization(JSON.parse(savedEnableOptimization));
      }
    }
  }, []);

  // 处理数据源变更
  const handleDataSourceChange = (value: 'tmdb' | 'douban') => {
    setDataSource(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dataSource', value);
      // 触发自定义事件，通知其他组件数据源已更改
      window.dispatchEvent(new CustomEvent('dataSourceChanged', { detail: value }));
    }
  };

  // 设置相关的处理函数
  const handleAggregateToggle = (value: boolean) => {
    setDefaultAggregateSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(value));
    }
  };

  const handleDoubanProxyUrlChange = (value: string) => {
    setDoubanProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanProxyUrl', value);
    }
  };

  const handleImageProxyUrlChange = (value: string) => {
    setImageProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('imageProxyUrl', value);
    }
  };

  const handleOptimizationToggle = (value: boolean) => {
    setEnableOptimization(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableOptimization', JSON.stringify(value));
    }
  };

  const handleImageProxyToggle = (value: boolean) => {
    setEnableImageProxy(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableImageProxy', JSON.stringify(value));
    }
  };

  const handleDoubanProxyToggle = (value: boolean) => {
    setEnableDoubanProxy(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableDoubanProxy', JSON.stringify(value));
    }
  };

  const handleResetSettings = () => {
    const defaultImageProxy = window.RUNTIME_CONFIG?.IMAGE_PROXY || '';
    const defaultDoubanProxy = window.RUNTIME_CONFIG?.DOUBAN_PROXY || '';

    setDataSource('tmdb');
    setDefaultAggregateSearch(true);
    setEnableOptimization(true);
    setDoubanProxyUrl(defaultDoubanProxy);
    setEnableDoubanProxy(!!defaultDoubanProxy);
    setEnableImageProxy(!!defaultImageProxy);
    setImageProxyUrl(defaultImageProxy);

    if (typeof window !== 'undefined') {
      localStorage.setItem('dataSource', 'tmdb');
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(true));
      localStorage.setItem('enableOptimization', JSON.stringify(true));
      localStorage.setItem('doubanProxyUrl', defaultDoubanProxy);
      localStorage.setItem('enableDoubanProxy', JSON.stringify(!!defaultDoubanProxy));
      localStorage.setItem('enableImageProxy', JSON.stringify(!!defaultImageProxy));
      localStorage.setItem('imageProxyUrl', defaultImageProxy);
      window.dispatchEvent(new CustomEvent('dataSourceChanged', { detail: 'tmdb' }));
    }
  };

  // Toggle 开关组件
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) => (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600"></div>
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
      </div>
    </label>
  );

  return (
    <PageLayout activePath="/settings">
      <div className="px-4 sm:px-10 py-4 sm:py-8 max-w-3xl mx-auto">
        {/* 返回按钮和标题 */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200">
              设置
            </h1>
            <button
              onClick={handleResetSettings}
              className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              重置所有设置
            </button>
          </div>
        </div>

        {/* 设置卡片 */}
        <div className="space-y-6">
          {/* 数据源设置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                数据源
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              选择影视数据的来源。TMDB 提供更全面的国际影视数据，豆瓣则更适合华语内容。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDataSourceChange('tmdb')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  dataSource === 'tmdb'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-medium">TMDB</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  国际影视数据库
                </div>
              </button>
              <button
                onClick={() => handleDataSourceChange('douban')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  dataSource === 'douban'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-medium">豆瓣</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  华语影视数据库
                </div>
              </button>
            </div>
          </motion.div>

          {/* 搜索设置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                搜索
              </h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  默认聚合搜索结果
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  搜索时默认按标题和年份聚合显示结果
                </p>
              </div>
              <Toggle checked={defaultAggregateSearch} onChange={handleAggregateToggle} />
            </div>
          </motion.div>

          {/* 播放设置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                播放
              </h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  启用优选和测速
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  如出现播放器劫持问题可关闭
                </p>
              </div>
              <Toggle checked={enableOptimization} onChange={handleOptimizationToggle} />
            </div>
          </motion.div>

          {/* 豆瓣代理设置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <Link2 className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                豆瓣代理
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    启用豆瓣代理
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    启用后，豆瓣数据将通过代理服务器获取
                  </p>
                </div>
                <Toggle checked={enableDoubanProxy} onChange={handleDoubanProxyToggle} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  代理地址
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    enableDoubanProxy
                      ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 placeholder-gray-400 dark:placeholder-gray-600 cursor-not-allowed'
                  }`}
                  placeholder="例如: https://proxy.example.com/fetch?url="
                  value={doubanProxyUrl}
                  onChange={(e) => handleDoubanProxyUrlChange(e.target.value)}
                  disabled={!enableDoubanProxy}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  仅在启用豆瓣代理时生效，留空则使用服务器 API
                </p>
              </div>
            </div>
          </motion.div>

          {/* 图片代理设置 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <ImageIcon className="w-5 h-5 text-cyan-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                图片代理
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    启用图片代理
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    启用后，所有图片加载将通过代理服务器
                  </p>
                </div>
                <Toggle checked={enableImageProxy} onChange={handleImageProxyToggle} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  代理地址
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    enableImageProxy
                      ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 placeholder-gray-400 dark:placeholder-gray-600 cursor-not-allowed'
                  }`}
                  placeholder="例如: https://imageproxy.example.com/?url="
                  value={imageProxyUrl}
                  onChange={(e) => handleImageProxyUrlChange(e.target.value)}
                  disabled={!enableImageProxy}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  仅在启用图片代理时生效
                </p>
              </div>
            </div>
          </motion.div>

          {/* 底部说明 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="text-center py-4"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">
              所有设置保存在本地浏览器中
            </p>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}
