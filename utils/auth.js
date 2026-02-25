/**
 * 登录认证工具
 */

/**
 * 获取微信 OpenID（通过云函数，失败则使用临时ID）
 * @returns {Promise<string|null>} OpenID
 */
const getOpenId = async () => {
  // 先检查本地缓存
  const cachedOpenId = wx.getStorageSync('openId');
  if (cachedOpenId) {
    return cachedOpenId;
  }

  try {
    // 调用云函数获取 OpenID
    const { result } = await wx.cloud.callFunction({
      name: 'getOpenId'
    });

    // 云函数返回的是 _openid
    if (result && result._openid) {
      wx.setStorageSync('openId', result._openid);
      return result._openid;
    }
  } catch (e) {
    console.error('[Auth] 云函数调用失败，使用临时ID:', e);
  }

  // 云函数失败，使用 wx.login 获取 code 作为临时ID
  try {
    const loginRes = await new Promise((resolve, reject) => {
      wx.login({ success: resolve, fail: reject });
    });

    if (loginRes.code) {
      // 使用 code 生成临时ID（code 有效期5分钟，但这里只是作为标识）
      const tempId = `temp_${loginRes.code}`;
      wx.setStorageSync('openId', tempId);
      console.log('[Auth] 使用临时ID:', tempId);
      return tempId;
    }
  } catch (e) {
    console.error('[Auth] wx.login 失败:', e);
  }

  return null;
};

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
const checkLogin = () => {
  const userInfo = wx.getStorageSync('userInfo');
  const openId = wx.getStorageSync('openId');
  return !!(userInfo && openId);
};

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息
 */
const getUserInfo = () => {
  return wx.getStorageSync('userInfo') || null;
};

/**
 * 获取用户OpenID
 * @returns {string} OpenID
 */
const getUserId = () => {
  return wx.getStorageSync('openId') || '';
};

/**
 * 检查登录状态，未登录则显示提示并跳转到登录页
 * @param {boolean} showTip 是否显示提示
 * @returns {boolean} 是否已登录
 */
const requireLogin = (showTip = true) => {
  if (checkLogin()) {
    return true;
  }

  if (showTip) {
    wx.showModal({
      title: '需要登录',
      content: '请先登录后再进行操作',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      }
    });
  }

  return false;
};

/**
 * 保存登录信息
 * @param {Object} userInfo 用户信息
 * @param {string} openId OpenID
 */
const setLoginInfo = (userInfo, openId) => {
  wx.setStorageSync('userInfo', userInfo);
  wx.setStorageSync('openId', openId);
};

/**
 * 清除登录信息
 */
const clearLoginInfo = () => {
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('openId');
  wx.removeStorageSync('userId'); // 兼容旧数据
};

module.exports = {
  getOpenId,
  checkLogin,
  getUserInfo,
  getUserId,
  requireLogin,
  setLoginInfo,
  clearLoginInfo
};
