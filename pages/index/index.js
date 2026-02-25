const storage = require('../../utils/storage.js');
const dateUtil = require('../../utils/dateUtil.js');
const mixin = require('../../utils/todoMixin.js');
const pageManager = require('../../utils/pageManager.js');
const auth = require('../../utils/auth.js');
const todoCache = require('../../utils/todoCache.js');
const dataLoader = require('../../utils/dataLoader.js');

let isLoading = false;

Page({
  data: {
    todos: [],
    currentDate: '',
    titleDate: '',
    currentDateKey: '',
    expandedTodoId: null,
    showAbandonDialog: false,
    abandonTodoId: '',
    showEditDialog: false,
    editTitle: '',
    editContent: '',
    editImportance: 2,
    editingTodo: null,
    initialized: false
  },

  onLoad() {
    this.initDate();
    this.initialLoad();
  },

  onShow() {
    if (!this.data.initialized) {
      return;
    }
    
    if (!auth.checkLogin()) {
      this.setData({ todos: [] });
      return;
    }
    
    const { needRefresh } = pageManager.checkRefreshNeeded();
    if (needRefresh) {
      this.loadTodos(true);
    }
  },

  initDate() {
    const dateInfo = dateUtil.formatDate();
    wx.setNavigationBarTitle({ title: '今日待办' });
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

  async initialLoad() {
    if (!auth.checkLogin()) {
      this.setData({ initialized: true, todos: [] });
      return;
    }
    
    await this.loadTodos(false);
    this.setData({ initialized: true });
  },

  async loadTodos(forceRefresh = false) {
    if (!auth.checkLogin()) {
      this.setData({ todos: [] });
      return;
    }

    if (isLoading) return;
    isLoading = true;

    const currentDateKey = this.data.currentDateKey || dateUtil.getTodayKey();
    
    if (!forceRefresh) {
      const cachedTodos = todoCache.getCache();
      if (cachedTodos) {
        const todayTodos = this.filterTodayTodos(cachedTodos, currentDateKey);
        const processedTodos = dataLoader.processTodosWithProgress(todayTodos, currentDateKey);
        this.setData({ todos: processedTodos, expandedTodoId: null });
        isLoading = false;
        return;
      }
    }

    wx.showLoading({ title: '加载中' });
    try {
      console.log('[Index] 从后台获取数据');
      const allTodos = await storage.getAllTodos();
      
      todoCache.setCache(allTodos);
      pageManager.clearLoginRefreshPending();
      pageManager.clearDataChangedPending();
      
      const todayTodos = this.filterTodayTodos(allTodos, currentDateKey);
      const processedTodos = dataLoader.processTodosWithProgress(todayTodos, currentDateKey);
      this.setData({ todos: processedTodos, expandedTodoId: null });
    } catch (e) {
      console.error('[Index] loadTodos error:', e);
    } finally {
      wx.hideLoading();
      isLoading = false;
    }
  },

  filterTodayTodos(todos, currentDateKey) {
    return (todos || []).filter(todo => {
      // 先判断是否在日期范围内
      const inDateRange = todo.permanent 
        ? (todo.startDate <= currentDateKey)
        : (todo.startDate <= currentDateKey && todo.endDate >= currentDateKey);
      
      if (!inDateRange) return false;
      
      // 再判断是否显示
      if (!todo.completed && !todo.abandoned) return true;
      return todo.endDate === currentDateKey;
    });
  },

  onToggleExpand(e) {
    mixin.toggleExpand(this, e);
  },

  async onToggleTodo(e) {
    if (!auth.checkLogin()) return;
    
    const id = mixin.extractId(e, 'onToggleTodo');
    if (!id) return;
    e.stopPropagation && e.stopPropagation();

    wx.showLoading({ title: '处理中' });
    const result = await storage.toggleTodo(id);
    wx.hideLoading();

    if (result !== null) {
      wx.showToast({ title: '已完成', icon: 'success' });
      pageManager.setDataChangedPending();
      this.loadTodos(true);
    }
  },

  onAbandonTodo(e) {
    if (!auth.checkLogin()) return;
    
    const id = mixin.extractId(e, 'onAbandonTodo');
    if (!id) return;
    e.stopPropagation && e.stopPropagation();

    this.setData({
      showAbandonDialog: true,
      abandonTodoId: id
    });
  },

  async onConfirmAbandon() {
    if (!auth.checkLogin()) return;
    
    const id = this.data.abandonTodoId;
    if (!id) return;

    wx.showLoading({ title: '处理中' });
    const result = await storage.abandonTodo(id);
    wx.hideLoading();

    if (result) {
      wx.showToast({ title: '已放弃', icon: 'success' });
      pageManager.setDataChangedPending();
      this.loadTodos(true);
    }

    this.setData({
      showAbandonDialog: false,
      abandonTodoId: ''
    });
  },

  onCancelAbandon() {
    this.setData({
      showAbandonDialog: false,
      abandonTodoId: ''
    });
  },

  onShowAddDialog() {
    if (!auth.checkLogin()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/add/add'
    });
  },

  onShowEditDialog(e) {
    if (!auth.checkLogin()) return;
    
    const id = e.currentTarget.dataset.id;
    const todo = this.data.todos.find(item => item._id === id);
    if (!todo) return;

    this.setData({
      showEditDialog: true,
      editTitle: todo.title || '',
      editContent: todo.content || '',
      editImportance: todo.importance || 2,
      editingTodo: todo
    });
  },

  onEditTitleInput(e) {
    this.setData({ editTitle: e.detail.value });
  },

  onEditContentInput(e) {
    this.setData({ editContent: e.detail.value });
  },

  onSelectImportance(e) {
    const value = parseInt(e.currentTarget.dataset.value);
    this.setData({ editImportance: value });
  },

  async onSaveEdit() {
    if (!auth.checkLogin()) return;
    
    const todo = this.data.editingTodo;
    if (!todo) return;

    const title = this.data.editTitle.trim();
    if (!title) {
      wx.showToast({ title: '请输入待办标题', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中' });
    try {
      const result = await storage.updateTodo(todo._id, {
        title: title,
        content: this.data.editContent.trim(),
        importance: this.data.editImportance
      });

      if (result) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        pageManager.setDataChangedPending();
        this.loadTodos(true);
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    } catch (e) {
      console.error('[Index] 保存编辑失败:', e);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({
        showEditDialog: false,
        editingTodo: null
      });
    }
  },

  onCancelEdit() {
    this.setData({
      showEditDialog: false,
      editTitle: '',
      editContent: '',
      editImportance: 2,
      editingTodo: null
    });
  }
});