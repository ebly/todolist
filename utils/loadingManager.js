/**
 * Loading 状态管理器
 * 统一管理页面加载状态，避免重复代码
 */

class LoadingManager {
  constructor() {
    this.loadingCount = 0;
    this.isLoading = false;
  }

  /**
   * 显示加载中
   * @param {string} title 加载提示文字
   * @param {Object} options 可选配置
   */
  show(title = '加载中', options = {}) {
    this.loadingCount++;
    if (!this.isLoading) {
      this.isLoading = true;
      wx.showLoading({
        title,
        mask: options.mask !== false,
        ...options
      });
    }
  }

  /**
   * 隐藏加载中
   */
  hide() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0 && this.isLoading) {
      this.isLoading = false;
      wx.hideLoading();
    }
  }

  /**
   * 强制隐藏所有加载中
   */
  hideAll() {
    this.loadingCount = 0;
    this.isLoading = false;
    wx.hideLoading();
  }

  /**
   * 执行异步操作并自动管理 Loading 状态
   * @param {Function} asyncFn 异步函数
   * @param {string} loadingText 加载提示文字
   * @param {Object} options 可选配置
   * @returns {Promise<any>} 异步操作结果
   */
  async withLoading(asyncFn, loadingText = '加载中', options = {}) {
    this.show(loadingText, options);
    try {
      return await asyncFn();
    } finally {
      this.hide();
    }
  }

  /**
   * 检查是否正在加载
   * @returns {boolean}
   */
  getIsLoading() {
    return this.isLoading;
  }
}

// 创建全局单例
const loadingManager = new LoadingManager();

module.exports = loadingManager;
