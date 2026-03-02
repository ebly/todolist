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
    filteredTodos: [],
    highPriorityTodos: [],
    normalPriorityTodos: [],
    activeFilter: 'all',
    currentDate: '',
    titleDate: '',
    currentDateKey: '',
    showAbandonDialog: false,
    abandonTodoId: '',
    showViewDialog: false,
    viewTitle: '',
    viewContent: '',
    viewEndDate: '',
    viewPermanent: false,
    viewPriority: 'normal',
    showEditDialog: false,
    editTitle: '',
    editContent: '',
    editPriority: 'normal',
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
      this.setData({ todos: [], filteredTodos: [], highPriorityTodos: [], normalPriorityTodos: [] });
      return;
    }
    
    const { needRefresh } = pageManager.checkRefreshNeeded();
    // 如果需要刷新则从后台获取，否则从缓存拉取
    this.loadTodos(needRefresh);
  },

  initDate() {
    const dateInfo = dateUtil.formatDate();
    wx.setNavigationBarTitle({ title: '任务' });
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#ffffff'
    });
    this.setData({
      currentDate: dateInfo.fullDate,
      titleDate: dateInfo.shortDate,
      currentDateKey: dateInfo.dateKey
    });
  },

  async initialLoad() {
    if (!auth.checkLogin()) {
      this.setData({ initialized: true, todos: [], filteredTodos: [], highPriorityTodos: [], normalPriorityTodos: [] });
      return;
    }
    
    await this.loadTodos(false);
    this.setData({ initialized: true });
  },

  async loadTodos(forceRefresh = false) {
    console.log('[Index] loadTodos - forceRefresh:', forceRefresh);
    if (!auth.checkLogin()) {
      this.setData({ todos: [], filteredTodos: [], highPriorityTodos: [], normalPriorityTodos: [] });
      return;
    }

    if (isLoading) return;
    isLoading = true;

    const currentDateKey = this.data.currentDateKey || dateUtil.getTodayKey();
    
    if (!forceRefresh) {
      const cachedTodos = todoCache.getCache();
      console.log('[Index] 尝试使用缓存，缓存是否存在:', !!cachedTodos, '缓存数量:', cachedTodos ? cachedTodos.length : 0);
      if (cachedTodos) {
        console.log('[Index] 使用缓存数据:', JSON.stringify(cachedTodos, null, 2));
        const todayTodos = this.filterTodayTodos(cachedTodos, currentDateKey);
        console.log('[Index] 过滤后今日任务数量:', todayTodos.length);
        const processedTodos = dataLoader.processTodosWithProgress(todayTodos, currentDateKey);
        this.updateTodoData(processedTodos);
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
      this.updateTodoData(processedTodos);
    } catch (e) {
      console.error('[Index] loadTodos error:', e);
    } finally {
      wx.hideLoading();
      isLoading = false;
    }
  },

  updateTodoData(todos) {
    const { activeFilter } = this.data;
    let filteredTodos = todos;

    // 根据筛选条件过滤
    if (activeFilter === 'active') {
      filteredTodos = todos.filter(t => !t.completed);
    } else if (activeFilter === 'completed') {
      filteredTodos = todos.filter(t => t.completed);
    }

    // 按优先级分组（重要性3为高优先级，1和2为普通优先级）
    const highPriorityTodos = filteredTodos.filter(t => t.importance === 3);
    const normalPriorityTodos = filteredTodos.filter(t => t.importance !== 3);

    this.setData({
      todos: todos,
      filteredTodos: filteredTodos,
      highPriorityTodos: highPriorityTodos,
      normalPriorityTodos: normalPriorityTodos
    });
  },

  filterTodayTodos(todos, currentDateKey) {
    return (todos || []).filter(todo => {
      // 先判断是否在日期范围内
      const inDateRange = todo.permanent
        ? (todo.startDate <= currentDateKey)
        : (todo.startDate <= currentDateKey && todo.endDate >= currentDateKey);

      if (!inDateRange) return false;

      // 再判断是否显示
      if (!todo.completed) return true;
      return todo.endDate === currentDateKey;
    });
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ activeFilter: filter });
    this.updateTodoData(this.data.todos);
  },

  async onToggleTodo(e) {
    if (!auth.checkLogin()) return;

    const id = e.currentTarget.dataset.id;
    if (!id) return;
    e.stopPropagation && e.stopPropagation();

    wx.showLoading({ title: '处理中' });
    const result = await storage.toggleTodo(id);
    wx.hideLoading();

    if (result !== null) {
      wx.showToast({ title: result === 'done' ? '已完成' : '已取消', icon: 'success' });
      // 更新本地缓存
      todoCache.toggleCacheTodo(id, result);
      pageManager.setDataChangedPending();
      this.loadTodos(true);
    }
  },

  onAbandonTodo(e) {
    if (!auth.checkLogin()) return;
    
    const id = e.currentTarget.dataset.id;
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
      // 更新本地缓存
      todoCache.abandonCacheTodo(id);
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

  onViewTodo(e) {
    if (!auth.checkLogin()) return;

    const id = e.currentTarget.dataset.id;
    const todo = this.data.todos.find(item => item._id === id);
    if (!todo) return;

    this.setData({
      showViewDialog: true,
      viewTitle: todo.title || '',
      viewContent: todo.content || '',
      viewEndDate: todo.endDate || '',
      viewPermanent: todo.permanent || false,
      viewPriority: todo.importance === 3 ? 'high' : 'normal'
    });
  },

  onCloseView() {
    this.setData({
      showViewDialog: false,
      viewTitle: '',
      viewContent: '',
      viewEndDate: '',
      viewPermanent: false,
      viewPriority: 'normal'
    });
  },

  onEditTodo(e) {
    if (!auth.checkLogin()) return;

    const id = e.currentTarget.dataset.id;
    const todo = this.data.todos.find(item => item._id === id);
    if (!todo) return;

    this.setData({
      showEditDialog: true,
      editTitle: todo.title || '',
      editContent: todo.content || '',
      editPriority: todo.importance === 3 ? 'high' : 'normal',
      editingTodo: todo
    });
  },

  onPriorityChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ editPriority: value });
  },

  onEditTitleChange(e) {
    this.setData({ editTitle: e.detail.value });
  },

  onEditContentChange(e) {
    this.setData({ editContent: e.detail.value });
  },

  async onSaveEdit() {
    if (!auth.checkLogin()) return;
    
    const todo = this.data.editingTodo;
    if (!todo) return;

    const title = this.data.editTitle.trim();
    if (!title) {
      wx.showToast({ title: '请输入任务标题', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中' });
    try {
      const result = await storage.updateTodo(todo._id, {
        title: title,
        content: this.data.editContent.trim(),
        importance: this.data.editPriority === 'high' ? 3 : 2
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
        editingTodo: null,
        editTitle: '',
        editContent: '',
        editPriority: 'normal'
      });
    }
  },

  onCancelEdit() {
    this.setData({
      showEditDialog: false,
      editTitle: '',
      editContent: '',
      editPriority: 'normal',
      editingTodo: null
    });
  }
});
