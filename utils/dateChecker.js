/**
 * 日期检查工具
 * 用于检测是否需要刷新数据
 */

const DATE_KEY = 'last_active_date';

/**
 * 获取存储的最后活跃日期
 * @returns {string} 日期字符串 YYYY-MM-DD
 */
const getLastActiveDate = () => {
  return wx.getStorageSync(DATE_KEY) || '';
};

/**
 * 保存当前日期为最后活跃日期
 */
const saveCurrentDate = () => {
  const today = new Date().toISOString().split('T')[0];
  wx.setStorageSync(DATE_KEY, today);
  console.log('[DateChecker] 保存当前日期:', today);
};

/**
 * 检查日期是否变化（跨天了）
 * @returns {boolean} true-日期变化了, false-日期未变化
 */
const hasDateChanged = () => {
  const lastDate = getLastActiveDate();
  const today = new Date().toISOString().split('T')[0];
  
  if (!lastDate) {
    // 首次使用
    console.log('[DateChecker] 首次使用');
    return true;
  }
  
  if (lastDate !== today) {
    console.log('[DateChecker] 日期变化:', lastDate, '->', today);
    return true;
  }
  
  return false;
};

/**
 * 检查缓存是否为空
 * @returns {boolean} true-缓存为空, false-缓存有数据
 */
const isCacheEmpty = () => {
  const todos = wx.getStorageSync('todo_cache');
  return !todos || !todos.data || todos.data.length === 0;
};

/**
 * 检查是否需要刷新数据
 * - 缓存为空 → 需要刷新
 * - 非同一天的第一次操作 → 需要刷新
 * - 登录后 → 需要刷新（由调用方传入forceRefresh控制）
 * - 其他情况 → 使用缓存
 * @param {boolean} forceRefresh 是否强制刷新（如登录后）
 * @returns {boolean} true-需要刷新, false-使用缓存
 */
const shouldRefreshData = (forceRefresh = false) => {
  // 强制刷新（如登录后）
  if (forceRefresh) {
    console.log('[DateChecker] 强制刷新（登录后）');
    saveCurrentDate();
    return true;
  }
  
  // 缓存为空，需要刷新
  if (isCacheEmpty()) {
    console.log('[DateChecker] 缓存为空，需要刷新');
    saveCurrentDate();
    return true;
  }
  
  // 日期变化了，需要刷新
  if (hasDateChanged()) {
    console.log('[DateChecker] 日期变化，需要刷新');
    saveCurrentDate();
    return true;
  }
  
  console.log('[DateChecker] 使用缓存数据');
  return false;
};

module.exports = {
  getLastActiveDate,
  saveCurrentDate,
  hasDateChanged,
  isCacheEmpty,
  shouldRefreshData
};
