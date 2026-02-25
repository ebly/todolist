/**
 * 全局错误处理和日志上报模块
 */

// 错误日志存储键
const ERROR_LOG_KEY = 'error_logs';
const MAX_LOG_COUNT = 50; // 最多保留50条错误日志

/**
 * 获取设备信息
 * @returns {Object} 设备信息
 */
const getDeviceInfo = () => {
  try {
    const systemInfo = wx.getSystemInfoSync();
    return {
      brand: systemInfo.brand,
      model: systemInfo.model,
      system: systemInfo.system,
      platform: systemInfo.platform,
      version: systemInfo.version,
      SDKVersion: systemInfo.SDKVersion
    };
  } catch (e) {
    return {};
  }
};

/**
 * 保存错误日志到本地
 * @param {Object} errorInfo 错误信息
 */
const saveErrorLog = (errorInfo) => {
  try {
    let logs = wx.getStorageSync(ERROR_LOG_KEY) || [];
    
    // 添加新日志
    logs.unshift(errorInfo);
    
    // 限制日志数量
    if (logs.length > MAX_LOG_COUNT) {
      logs = logs.slice(0, MAX_LOG_COUNT);
    }
    
    wx.setStorageSync(ERROR_LOG_KEY, logs);
  } catch (e) {
    console.error('[ErrorHandler] 保存错误日志失败:', e);
  }
};

/**
 * 上报错误到云端（如果有网络）
 * @param {Object} errorInfo 错误信息
 */
const reportError = async (errorInfo) => {
  try {
    // 检查网络状态
    const networkType = await new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => resolve(res.networkType),
        fail: () => resolve('unknown')
      });
    });
    
    if (networkType === 'none') {
      console.log('[ErrorHandler] 无网络，错误日志已保存本地');
      return;
    }
    
    // 上报到云数据库（如果有错误日志集合）
    if (wx.cloud) {
      try {
        await wx.cloud.callFunction({
          name: 'reportError',
          data: errorInfo
        });
      } catch (e) {
        // 云函数可能不存在，静默处理
        console.log('[ErrorHandler] 云端上报失败:', e.message);
      }
    }
  } catch (e) {
    console.error('[ErrorHandler] 上报错误失败:', e);
  }
};

/**
 * 处理错误
 * @param {Error} error 错误对象
 * @param {string} type 错误类型
 * @param {Object} extra 额外信息
 */
const handleError = (error, type = 'unknown', extra = {}) => {
  const errorInfo = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    type,
    message: error.message || '未知错误',
    stack: error.stack || '',
    timestamp: new Date().toISOString(),
    deviceInfo: getDeviceInfo(),
    page: getCurrentPage(),
    extra
  };
  
  // 控制台输出
  console.error(`[ErrorHandler][${type}]`, errorInfo.message, error);
  
  // 保存到本地
  saveErrorLog(errorInfo);
  
  // 上报到云端
  reportError(errorInfo);
  
  return errorInfo;
};

/**
 * 获取当前页面路径
 * @returns {string} 页面路径
 */
const getCurrentPage = () => {
  try {
    const pages = getCurrentPages();
    if (pages.length > 0) {
      return pages[pages.length - 1].route;
    }
    return '';
  } catch (e) {
    return '';
  }
};

/**
 * 获取所有错误日志
 * @returns {Array} 错误日志列表
 */
const getErrorLogs = () => {
  try {
    return wx.getStorageSync(ERROR_LOG_KEY) || [];
  } catch (e) {
    return [];
  }
};

/**
 * 清空错误日志
 */
const clearErrorLogs = () => {
  try {
    wx.removeStorageSync(ERROR_LOG_KEY);
  } catch (e) {
    console.error('[ErrorHandler] 清空错误日志失败:', e);
  }
};

/**
 * 初始化全局错误监听
 */
const initGlobalErrorHandling = () => {
  // 监听全局错误
  wx.onError((error) => {
    handleError(new Error(error), 'global');
  });
  
  // 监听未处理的 Promise 拒绝
  wx.onUnhandledRejection((res) => {
    const error = res.reason instanceof Error ? res.reason : new Error(String(res.reason));
    handleError(error, 'unhandledRejection');
  });
  
  // 监听页面不存在
  wx.onPageNotFound((res) => {
    handleError(new Error(`页面不存在: ${res.path}`), 'pageNotFound', res);
  });
  
  console.log('[ErrorHandler] 全局错误监听已初始化');
};

/**
 * 包装异步函数，自动捕获错误
 * @param {Function} fn 异步函数
 * @param {string} name 函数名称
 * @returns {Function} 包装后的函数
 */
const wrapAsync = (fn, name = 'anonymous') => {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      handleError(error, `async:${name}`, { args });
      throw error;
    }
  };
};

module.exports = {
  handleError,
  getErrorLogs,
  clearErrorLogs,
  initGlobalErrorHandling,
  wrapAsync
};
