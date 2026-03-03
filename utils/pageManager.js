/**
 * 页面管理器
 * 统一管理页面生命周期中的数据刷新逻辑
 */

const todoCache = require('./todoCache.js');

let loginRefreshPending = false;

const setLoginRefreshPending = () => {
  loginRefreshPending = true;
};

const clearLoginRefreshPending = () => {
  loginRefreshPending = false;
};

const isCacheEmpty = () => {
  // 使用 hasCache 方法判断，空数组[]也视为有缓存
  return !todoCache.hasCache();
};

const checkRefreshNeeded = () => {
  const reasons = [];

  if (loginRefreshPending) {
    reasons.push('login');
  }

  if (isCacheEmpty()) {
    reasons.push('empty');
  }

  const needRefresh = reasons.length > 0;

  return {
    needRefresh,
    reasons,
    isLoginRefresh: reasons.includes('login')
  };
};

module.exports = {
  setLoginRefreshPending,
  clearLoginRefreshPending,
  checkRefreshNeeded
};
