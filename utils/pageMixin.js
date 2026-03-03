const auth = require('./auth.js');
const todoCache = require('./todoCache.js');

/**
 * 页面公共 Mixin
 * 提取 index 和 history 页面的公共逻辑
 */
const pageMixin = {
  /**
   * 检查用户登录状态
   * @returns {boolean} 是否已登录
   */
  checkAuth() {
    return auth.checkLogin();
  },

  /**
   * 处理未登录状态 - 清空数据
   */
  handleNotLoggedIn() {
    if (this.clearPageData) {
      this.clearPageData();
    }
  },

  /**
   * 通用的 onShow 处理
   * 子页面需要实现 refreshFromCache 方法
   */
  handleOnShow() {
    if (!this.data.initialized) {
      return;
    }

    if (!auth.checkLogin()) {
      if (this.clearPageData) {
        this.clearPageData();
      }
      return;
    }

    if (this.refreshFromCache) {
      this.refreshFromCache();
    }
  },

  /**
   * 通用的首次加载处理
   * 子页面需要实现 refreshFromCache 和 loadFromServer 方法
   */
  async handleInitialLoad() {
    if (!auth.checkLogin()) {
      this.setData({ initialized: true });
      if (this.clearPageData) {
        this.clearPageData();
      }
      return;
    }

    const needRefreshFromServer = todoCache.needRefresh();
    if (needRefreshFromServer && this.loadFromServer) {
      await this.loadFromServer();
    } else if (this.refreshFromCache) {
      this.refreshFromCache();
    }

    this.setData({ initialized: true });
  },

  /**
   * 统一的缓存刷新方法
   * @param {Function} processData 处理数据的回调函数
   * @param {string} dataSource 数据源标识
   */
  refreshPageFromCache(processData, dataSource = 'cache') {
    const cachedTodos = todoCache.getCache();
    if (cachedTodos !== undefined && processData) {
      processData(cachedTodos, dataSource);
    }
    return cachedTodos;
  },

  /**
   * 更新首页任务数据（用于跨页面同步）
   * @param {Array} todos 任务列表
   */
  syncToIndexPage(todos) {
    const pages = getCurrentPages();
    const indexPage = pages.find(p => p.route === 'pages/index/index');
    if (indexPage && indexPage.updateTodoData) {
      indexPage.updateTodoData(todos);
    }
  },

  /**
   * 操作后的统一处理
   * 更新缓存、刷新页面、同步到其他页面
   * @param {string} operation 操作类型: 'add' | 'update' | 'delete' | 'toggle' | 'abandon'
   * @param {string} id 任务ID
   * @param {Object} data 操作数据
   */
  afterOperation(operation, id, data = null) {
    // 1. 更新缓存
    switch (operation) {
      case 'add':
        if (data) todoCache.addToCache(data);
        break;
      case 'update':
        if (data) todoCache.updateInCache(id, data);
        break;
      case 'delete':
        todoCache.removeFromCache(id);
        break;
      case 'toggle':
        todoCache.toggleCacheTodo(id, data);
        break;
      case 'abandon':
        todoCache.abandonCacheTodo(id);
        break;
    }

    // 2. 刷新当前页面
    if (this.refreshFromCache) {
      this.refreshFromCache();
    }

    // 3. 同步到首页
    const cachedTodos = todoCache.getCache();
    if (cachedTodos !== undefined) {
      pageMixin.syncToIndexPage(cachedTodos);
    }
  }
};

module.exports = pageMixin;
