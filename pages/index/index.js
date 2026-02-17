const storage = require('../../utils/storage.js');
const dateUtil = require('../../utils/dateUtil.js');
const mixin = require('../../utils/todoMixin.js');

Page({
  data: {
    todos: [],
    currentDate: '',
    titleDate: '',
    currentDateKey: '',
    expandedTodoId: null,
    showAbandonDialog: false,
    abandonTodoId: ''
  },

  onLoad() {
    this.initDate();
    this.loadTodos();
  },

  onShow() {
    this.loadTodos();
  },

  /**
   * 初始化日期信息
   */
  initDate() {
    const dateInfo = dateUtil.formatDate();
    wx.setNavigationBarTitle({ title: '今日待办' });
    // 设置导航栏左侧清除按钮
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#f7f8f9'
    });
    this.setData({
      currentDate: dateInfo.fullDate,
      titleDate: dateInfo.shortDate,
      currentDateKey: dateInfo.dateKey
    });
  },

  /**
   * 加载今日待办
   */
  async loadTodos() {
    wx.showLoading({ title: '加载中' });
    try {
      const todos = await storage.getTodayTodos();
      this.setData({ todos, expandedTodoId: null });
    } catch (e) {
      console.error('[Index] loadTodos error:', e);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 切换展开状态
   */
  onToggleExpand(e) {
    mixin.toggleExpand(this, e);
  },

  /**
   * 完成待办
   */
  async onToggleTodo(e) {
    const id = mixin.extractId(e, 'onToggleTodo');
    if (!id) return;
    
    e.stopPropagation && e.stopPropagation();
    
    wx.showLoading({ title: '处理中' });
    const result = await storage.toggleTodo(id);
    wx.hideLoading();
    
    if (result !== null) {
      this.loadTodos();
    }
  },

  /**
   * 放弃待办（删除）- 显示确认对话框
   */
  onAbandonTodo(e) {
    const id = mixin.extractId(e, 'onAbandonTodo');
    if (!id) return;
    
    e.stopPropagation && e.stopPropagation();
    
    this.setData({
      showAbandonDialog: true,
      abandonTodoId: id
    });
  },

  /**
   * 确认放弃
   */
  async onConfirmAbandon() {
    const { abandonTodoId } = this.data;
    
    this.setData({ showAbandonDialog: false });
    
    if (!abandonTodoId) return;
    
    wx.showLoading({ title: '处理中' });
    const result = await storage.abandonTodo(abandonTodoId);
    wx.hideLoading();
    
    if (result) {
      mixin.showSuccess('已放弃');
      this.loadTodos();
    } else {
      mixin.showError('放弃失败');
    }
    
    this.setData({ abandonTodoId: '' });
  },

  /**
   * 取消放弃
   */
  onCancelAbandon() {
    this.setData({
      showAbandonDialog: false,
      abandonTodoId: ''
    });
  },


});
