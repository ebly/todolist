const auth = require('../../utils/auth.js');
const storage = require('../../utils/storage.js');
const todoCache = require('../../utils/todoCache.js');
const dateUtil = require('../../utils/dateUtil.js');
const dataLoader = require('../../utils/dataLoader.js');
const pageManager = require('../../utils/pageManager.js');
const pageMixin = require('../../utils/pageMixin.js');
const todoFilters = require('../../utils/todoFilters.js');
const loadingManager = require('../../utils/loadingManager.js');

Page({
  data: {
    todos: [],
    filteredTodos: [],
    highPriorityTodos: [],
    normalPriorityTodos: [],
    currentDate: '',
    titleDate: '',
    currentDateKey: '',
    activeFilter: 'all',
    showViewDialog: false,
    viewTitle: '',
    viewContent: '',
    viewEndDate: '',
    viewPermanent: false,
    viewPriority: 'normal',
    showEditDialog: false,
    editingTodo: null,
    editTitle: '',
    editContent: '',
    editPriority: 'normal',
    showAbandonDialog: false,
    abandonTodoId: '',
    initialized: false,
    dataSource: ''
  },

  onLoad() {
    this.initDate();
    this.initialLoad();
  },

  onShow() {
    pageMixin.handleOnShow.call(this);
  },

  clearPageData() {
    this.setData({
      todos: [],
      filteredTodos: [],
      highPriorityTodos: [],
      normalPriorityTodos: []
    });
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
    await pageMixin.handleInitialLoad.call(this);
  },

  refreshFromCache() {
    pageMixin.refreshPageFromCache.call(this, (cachedTodos, dataSource) => {
      const currentDateKey = this.data.currentDateKey || dateUtil.getTodayKey();
      const todayTodos = todoFilters.filterTodayTodos(cachedTodos, currentDateKey);
      const processedTodos = dataLoader.processTodosWithProgress(todayTodos, currentDateKey);
      this.updateTodoData(processedTodos, dataSource);
    });
  },

  async loadFromServer() {
    if (loadingManager.getIsLoading()) return;

    const currentDateKey = this.data.currentDateKey || dateUtil.getTodayKey();

    await loadingManager.withLoading(async () => {
      const allTodos = await storage.getAllTodos();

      todoCache.setCache(allTodos);
      pageManager.clearLoginRefreshPending();

      const todayTodos = todoFilters.filterTodayTodos(allTodos, currentDateKey);
      const processedTodos = dataLoader.processTodosWithProgress(todayTodos, currentDateKey);
      this.updateTodoData(processedTodos, 'server');
    }, '加载中');
  },

  updateTodoData(todos, source = '') {
    const { activeFilter } = this.data;
    const filteredTodos = todoFilters.filterTodosByStatus(todos, activeFilter);
    const { highPriorityTodos, normalPriorityTodos } = todoFilters.groupTodosByPriority(filteredTodos);

    this.setData({
      todos,
      filteredTodos,
      highPriorityTodos,
      normalPriorityTodos,
      dataSource: source
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

    const result = await loadingManager.withLoading(
      () => storage.toggleTodo(id),
      '处理中'
    );

    if (result !== null) {
      wx.showToast({ title: result === 'done' ? '已完成' : '已取消', icon: 'success' });
      pageMixin.afterOperation.call(this, 'toggle', id, result);
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

    const result = await loadingManager.withLoading(
      () => storage.abandonTodo(id),
      '处理中'
    );

    if (result) {
      wx.showToast({ title: '已放弃', icon: 'success' });
      pageMixin.afterOperation.call(this, 'abandon', id);
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
    this.refreshFromCache();

    const todo = this.data.todos.find(item => item._id === id);
    if (!todo) {
      return;
    }

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
    if (!id) return;
    e.stopPropagation && e.stopPropagation();

    const todo = this.data.todos.find(item => item._id === id);
    if (!todo) return;

    this.setData({
      showEditDialog: true,
      editingTodo: todo,
      editTitle: todo.title || '',
      editContent: todo.content || '',
      editPriority: todo.importance === 3 ? 'high' : 'normal'
    });
  },

  onCloseEdit() {
    this.setData({
      showEditDialog: false,
      editingTodo: null,
      editTitle: '',
      editContent: '',
      editPriority: 'normal'
    });
  },

  onEditTitleChange(e) {
    this.setData({ editTitle: e.detail.value });
  },

  onEditContentChange(e) {
    this.setData({ editContent: e.detail.value });
  },

  onPriorityChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ editPriority: value });
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

    const updateData = {
      title: title,
      content: this.data.editContent.trim(),
      importance: this.data.editPriority === 'high' ? 3 : 2
    };

    const result = await loadingManager.withLoading(
      () => storage.updateTodo(todo._id, updateData),
      '保存中'
    );

    if (result) {
      wx.showToast({ title: '保存成功', icon: 'success' });
      pageMixin.afterOperation.call(this, 'update', todo._id, updateData);
    } else {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }

    this.setData({
      showEditDialog: false,
      editingTodo: null,
      editTitle: '',
      editContent: '',
      editPriority: 'normal'
    });
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
