const storage = require('../../utils/storage.js');
const auth = require('../../utils/auth.js');
const todoCache = require('../../utils/todoCache.js');
const pageManager = require('../../utils/pageManager.js');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    userId: '',
    stats: {
      total: 0,
      completed: 0,
      pending: 0
    },
    showLoginPopup: false,
    tempUserInfo: null
  },

  onShow() {
    this.checkLoginStatus();
    this.loadStats();
  },

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    const isLoggedIn = auth.checkLogin();
    const userInfo = auth.getUserInfo();
    const userId = auth.getUserId();

    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: userInfo,
      userId: userId
    });
  },

  /**
   * 显示登录弹窗
   */
  onShowLoginPopup() {
    this.setData({
      showLoginPopup: true,
      tempUserInfo: {
        avatarUrl: '',
        nickName: ''
      }
    });
  },

  /**
   * 选择头像
   */
  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    console.log('[Profile] 选择头像:', avatarUrl);
    this.setData({
      'tempUserInfo.avatarUrl': avatarUrl
    });
  },

  /**
   * 昵称输入
   */
  onNickNameInput(e) {
    const nickName = e.detail.value;
    this.setData({
      'tempUserInfo.nickName': nickName
    });
  },

  /**
   * 关闭登录弹窗
   */
  onCloseLoginPopup() {
    this.setData({
      showLoginPopup: false,
      tempUserInfo: null
    });
  },

  /**
   * 阻止冒泡
   */
  stopPropagation() {
    // 什么都不做，只是阻止事件冒泡
  },

  /**
   * 确认登录
   */
  async onConfirmLogin() {
    const userInfo = this.data.tempUserInfo;

    if (!userInfo || !userInfo.nickName || !userInfo.nickName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    this.setData({
      showLoginPopup: false
    });

    // 获取微信 openid
    wx.showLoading({ title: '登录中' });
    const openId = await auth.getOpenId();
    wx.hideLoading();

    if (!openId) {
      wx.showToast({
        title: '获取登录信息失败',
        icon: 'none'
      });
      this.setData({ tempUserInfo: null });
      return;
    }

    // 保存用户信息
    auth.setLoginInfo(userInfo, openId);

    this.setData({
      isLoggedIn: true,
      userInfo: userInfo,
      userId: openId,
      tempUserInfo: null
    });

    // 登录成功后立即获取所有待办并缓存
    wx.showLoading({ title: '加载数据中' });
    try {
      const allTodos = await storage.getAllTodos();
      todoCache.setCache(allTodos);
      console.log('[Profile] 登录成功，已缓存所有待办数据');
    } catch (e) {
      console.error('[Profile] 缓存待办数据失败:', e);
    }
    wx.hideLoading();

    // 刷新待办统计
    this.loadStats();

    // 清除登录刷新标记，因为已经缓存数据了
    pageManager.clearLoginRefreshPending();

    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后不会删除本地数据，确定要退出吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
          auth.clearLoginInfo();
          
          // 清除待办缓存
          todoCache.clearCache();
          
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            userId: '',
            stats: { total: 0, completed: 0, pending: 0 }
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    if (!this.data.isLoggedIn) {
      return;
    }

    try {
      const cachedTodos = todoCache.getCache();
      
      if (cachedTodos) {
        const validTodos = cachedTodos.filter(todo => !todo.abandoned);
        const total = validTodos.length;
        const completed = validTodos.filter(todo => todo.completed).length;
        const pending = total - completed;
        
        this.setData({
          stats: {
            total,
            completed,
            pending
          }
        });
      } else {
        const { total, completed, pending } = await storage.getTodoStats();
        
        this.setData({
          stats: {
            total,
            completed,
            pending
          }
        });
      }
    } catch (e) {
      console.error('[Profile] 加载统计失败:', e);
    }
  },

  /**
   * 清除所有待办（保留登录信息）
   */
  async onClearAll() {
    const res = await wx.showModal({
      title: '确认清除',
      content: '确定要清除所有待办数据吗？\n登录信息将保留，此操作不可恢复！',
      confirmText: '清除',
      confirmColor: '#ff4d4f'
    });

    if (res.confirm) {
      wx.showLoading({ title: '清除中' });
      const result = await storage.clearAllTodos();
      wx.hideLoading();

      if (result) {
        wx.showToast({
          title: '已清除所有待办',
          icon: 'success'
        });
        this.loadStats();
      } else {
        wx.showToast({
          title: '清除失败',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 关于
   */
  onAbout() {
    wx.showModal({
      title: '关于',
      content: '叙程 - 您的每日待办助手\n\n版本：1.0.0',
      showCancel: false
    });
  }
});
