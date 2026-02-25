/**
 * 页面管理器
 * 统一管理页面生命周期中的数据刷新逻辑
 */

const dateUtil = require('./dateUtil.js');
const todoCache = require('./todoCache.js');

let loginRefreshPending = false;
let dataChangedPending = false;

const DATE_KEY = 'last_active_date';

const setLoginRefreshPending = () => {
  loginRefreshPending = true;
  console.log('[PageManager] 标记登录后需要刷新');
};

const clearLoginRefreshPending = () => {
  loginRefreshPending = false;
};

const setDataChangedPending = () => {
  dataChangedPending = true;
  console.log('[PageManager] 标记数据变更，其他页面需要刷新');
  
  try {
    todoCache.clearCache();
    console.log('[PageManager] 已清除通用待办缓存');
  } catch (e) {
    console.error('[PageManager] 清除通用待办缓存失败:', e);
  }
};

const clearDataChangedPending = () => {
  dataChangedPending = false;
};

const isCacheEmpty = () => {
  try {
    const cachedData = todoCache.getCache();
    return !cachedData || cachedData.length === 0;
  } catch (e) {
    return true;
  }
};

const hasDateChanged = () => {
  try {
    const lastDate = wx.getStorageSync(DATE_KEY);
    const today = dateUtil.getTodayKey();
    
    wx.setStorageSync(DATE_KEY, today);
    
    if (!lastDate) {
      console.log('[PageManager] 首次使用');
      return true;
    }
    
    if (lastDate !== today) {
      console.log('[PageManager] 日期变化:', lastDate, '->', today);
      return true;
    }
    
    return false;
  } catch (e) {
    return true;
  }
};

const checkRefreshNeeded = () => {
  const reasons = [];

  if (loginRefreshPending) {
    reasons.push('login');
  }

  if (dataChangedPending) {
    reasons.push('dataChanged');
  }

  if (hasDateChanged()) {
    reasons.push('date');
  }

  if (isCacheEmpty() && reasons.length === 0) {
    reasons.push('empty');
  }

  const needRefresh = reasons.length > 0;

  if (needRefresh) {
    console.log('[PageManager] 需要刷新，原因:', reasons);
  } else {
    console.log('[PageManager] 使用缓存数据');
  }

  return {
    needRefresh,
    reasons,
    isLoginRefresh: reasons.includes('login'),
    isDataChanged: reasons.includes('dataChanged')
  };
};

module.exports = {
  setLoginRefreshPending,
  clearLoginRefreshPending,
  setDataChangedPending,
  clearDataChangedPending,
  checkRefreshNeeded
};