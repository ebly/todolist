/**
 * 错误处理工具
 * 统一处理应用中的错误和提示
 */

const errorHandler = {
  /**
   * 显示错误提示
   * @param {string} message 错误消息
   * @param {Object} options 可选配置
   */
  showError(message, options = {}) {
    console.error('[Error]', message);
    wx.showToast({
      title: message || '操作失败',
      icon: 'none',
      duration: options.duration || 2000,
      ...options
    });
  },

  /**
   * 显示成功提示
   * @param {string} message 成功消息
   * @param {Object} options 可选配置
   */
  showSuccess(message, options = {}) {
    wx.showToast({
      title: message || '操作成功',
      icon: 'success',
      duration: options.duration || 1500,
      ...options
    });
  },

  /**
   * 显示加载中
   * @param {string} title 加载提示文字
   */
  showLoading(title = '加载中') {
    wx.showLoading({ title, mask: true });
  },

  /**
   * 隐藏加载中
   */
  hideLoading() {
    wx.hideLoading();
  },

  /**
   * 处理异步操作错误
   * @param {Function} asyncFn 异步函数
   * @param {string} errorMessage 错误提示消息
   * @param {Function} onError 错误回调
   * @returns {Promise<any>} 操作结果
   */
  async handleAsync(asyncFn, errorMessage = '操作失败', onError = null) {
    try {
      return await asyncFn();
    } catch (error) {
      console.error('[Async Error]', error);
      this.showError(errorMessage);
      if (onError) onError(error);
      return null;
    }
  },

  /**
   * 显示确认对话框
   * @param {Object} options 对话框配置
   * @returns {Promise<boolean>} 用户是否确认
   */
  async showConfirm(options = {}) {
    const defaultOptions = {
      title: '确认操作',
      content: '确定要执行此操作吗？',
      confirmText: '确定',
      confirmColor: '#576b95',
      cancelText: '取消'
    };

    const res = await wx.showModal({
      ...defaultOptions,
      ...options
    });

    return res.confirm;
  }
};

module.exports = errorHandler;
