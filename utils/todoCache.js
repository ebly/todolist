/**
 * 待办数据本地缓存管理模块
 * 用于减少网络请求，提升用户体验
 * 带缓存大小限制和过期机制
 */

const CACHE_KEY = 'todo_cache';
const CACHE_VERSION = '1.3'; // 版本升级，简化缓存结构

// 缓存配置
const CACHE_CONFIG = {
  // 最大缓存条数（超过则清理已完成/已放弃的待办）
  MAX_CACHE_SIZE: 200,
  // 缓存过期时间（7天）
  EXPIRE_TIME: 7 * 24 * 60 * 60 * 1000,
  // 单条数据最大字符数（防止单条数据过大）
  MAX_ITEM_SIZE: 5000
};

/**
 * 获取缓存的待办数据
 * @returns {Array|undefined} 待办列表数组，无缓存或过期返回undefined
 * 注意：返回空数组[]表示缓存存在但任务为空，返回undefined表示无缓存
 */
const getCache = () => {
  try {
    const cache = wx.getStorageSync(CACHE_KEY);
    if (!cache) return undefined;

    // 检查缓存版本
    if (cache.version !== CACHE_VERSION) {
      clearCache();
      return undefined;
    }

    // 检查缓存是否过期（7天）
    if (cache.timestamp && Date.now() - cache.timestamp > CACHE_CONFIG.EXPIRE_TIME) {
      clearCache();
      return undefined;
    }

    // 返回缓存数据，如果没有data字段则返回空数组
    return cache.data || [];
  } catch (e) {
    return undefined;
  }
};

/**
 * 检查是否需要从服务器刷新数据
 * 只有缓存不存在（从未设置过）或缓存过期时才需要刷新
 * 空任务列表[]也视为有效缓存，不需要刷新
 * @returns {boolean} true表示需要刷新，false表示使用缓存
 */
const needRefresh = () => {
  try {
    const cache = wx.getStorageSync(CACHE_KEY);
    // 缓存对象不存在，说明从未设置过缓存
    if (!cache) {
      return true;
    }

    // 检查缓存版本
    if (cache.version !== CACHE_VERSION) {
      return true;
    }

    // 检查缓存是否过期（7天）
    if (cache.timestamp && Date.now() - cache.timestamp > CACHE_CONFIG.EXPIRE_TIME) {
      return true;
    }

    // 缓存存在且未过期，即使data是空数组也不需要刷新
    return false;
  } catch (e) {
    return true;
  }
};

/**
 * 清理过期或过大的数据
 * @param {Array} todos 待办列表
 * @returns {Array} 清理后的列表
 */
const cleanupCacheData = (todos) => {
  if (!todos || todos.length === 0) return [];

  // 1. 过滤掉过大的单条数据
  let filtered = todos.filter(todo => {
    const size = JSON.stringify(todo).length;
    if (size > CACHE_CONFIG.MAX_ITEM_SIZE) {
      return false;
    }
    return true;
  });

  // 2. 如果数据量超过限制，清理已完成/已放弃的待办（保留最近30天的）
  if (filtered.length > CACHE_CONFIG.MAX_CACHE_SIZE) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // 分离活跃待办和已完成待办
    const activeTodos = filtered.filter(t => !t.completed);
    const completedTodos = filtered.filter(t => t.completed);

    // 只保留最近30天的已完成待办
    const recentCompleted = completedTodos.filter(t => {
      const todoTime = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
      return todoTime > thirtyDaysAgo;
    });

    // 优先保留活跃待办，然后补充最近的已完成待办
    filtered = [...activeTodos];
    const remainingSlots = CACHE_CONFIG.MAX_CACHE_SIZE - activeTodos.length;
    if (remainingSlots > 0) {
      filtered = filtered.concat(recentCompleted.slice(0, remainingSlots));
    }
  }

  return filtered;
};

/**
 * 保存待办数据到缓存（带大小限制）
 * @param {Array} todos 待办列表
 */
const setCache = (todos) => {
  try {
    // 清理数据
    const cleanedTodos = cleanupCacheData(todos);

    wx.setStorageSync(CACHE_KEY, {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data: cleanedTodos
    });

    // 检查存储空间使用情况
    checkStorageUsage();
  } catch (e) {
    // 如果存储失败（可能是空间不足），清除缓存
    if (e.message && e.message.includes('storage')) {
      clearCache();
    }
  }
};

/**
 * 检查存储空间使用情况
 */
const checkStorageUsage = () => {
  try {
    const res = wx.getStorageInfoSync();
    const usagePercent = (res.currentSize / res.limitSize) * 100;

    // 如果使用超过80%，清除缓存
    if (usagePercent > 80) {
      clearCache();
    }
  } catch (e) {
  }
};

/**
 * 清空缓存
 */
const clearCache = () => {
  try {
    wx.removeStorageSync(CACHE_KEY);
  } catch (e) {
  }
};

/**
 * 添加待办到缓存
 * @param {Object} todo 待办对象
 */
const addToCache = (todo) => {
  const todos = getCache();
  if (todos === undefined) return;
  todos.unshift(todo);
  setCache(todos);
};

/**
 * 从缓存中删除待办
 * @param {string} id 待办ID
 */
const removeFromCache = (id) => {
  const todos = getCache();
  if (todos === undefined) return;

  const index = todos.findIndex(t => t._id === id);
  if (index > -1) {
    todos.splice(index, 1);
    setCache(todos);
  }
};

/**
 * 更新缓存中的待办
 * @param {string} id 待办ID
 * @param {Object} updateData 更新数据
 */
const updateInCache = (id, updateData) => {
  const todos = getCache();
  if (todos === undefined) return;

  const index = todos.findIndex(t => t._id === id);
  if (index > -1) {
    todos[index] = { ...todos[index], ...updateData, updatedAt: new Date() };
    setCache(todos);
  }
};

/**
 * 切换待办完成状态（本地缓存）
 * @param {string} id 待办ID
 * @param {string} status 完成状态 ('done', 'abandoned', '')
 */
const toggleCacheTodo = (id, status) => {
  const updateData = { completed: status };
  if (status === 'done') {
    const dateUtil = require('./dateUtil.js');
    updateData.endDate = dateUtil.getTodayKey();
    updateData.permanent = false;
  }
  updateInCache(id, updateData);
};

/**
 * 放弃待办（本地缓存）
 * @param {string} id 待办ID
 */
const abandonCacheTodo = (id) => {
  const dateUtil = require('./dateUtil.js');
  updateInCache(id, {
    completed: 'abandoned',
    endDate: dateUtil.getTodayKey()
  });
};

/**
 * 检查是否有缓存
 * @returns {boolean}
 */
const hasCache = () => {
  return getCache() !== undefined;
};

/**
 * 获取缓存统计信息
 * @returns {Object}
 */
const getCacheStats = () => {
  try {
    const cache = wx.getStorageSync(CACHE_KEY);
    if (!cache) return null;

    const data = cache.data || [];
    const size = JSON.stringify(cache).length;

    return {
      count: data.length,
      size: `${(size / 1024).toFixed(2)}KB`,
      timestamp: cache.timestamp,
      age: Date.now() - cache.timestamp
    };
  } catch (e) {
    return null;
  }
};

module.exports = {
  getCache,
  setCache,
  clearCache,
  addToCache,
  removeFromCache,
  updateInCache,
  toggleCacheTodo,
  abandonCacheTodo,
  hasCache,
  getCacheStats,
  needRefresh
};
