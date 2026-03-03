const storage = require('../../utils/storage.js');
const dateUtil = require('../../utils/dateUtil.js');
const pageManager = require('../../utils/pageManager.js');
const auth = require('../../utils/auth.js');
const todoCache = require('../../utils/todoCache.js');
const pageMixin = require('../../utils/pageMixin.js');
const todoFilters = require('../../utils/todoFilters.js');
const loadingManager = require('../../utils/loadingManager.js');

const DEFAULT_DIALOG_DATA = {
  editTitle: '',
  editContent: '',
  editStartDate: '',
  editDate: '',
  editPermanent: false,
  editPriority: 'normal'
};

const DEFAULT_VIEW_DATA = {
  showViewDialog: false,
  viewTitle: '',
  viewContent: '',
  viewEndDate: '',
  viewPermanent: false,
  viewPriority: 'normal'
};

Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    calendarWeeks: [],
    dateStats: {},
    monthTodos: {},
    allMonthTodos: [],
    selectedDate: '',
    selectedDateDay: new Date().getDate(),
    selectedDateTodos: [],
    todayDateKey: '',
    expandedTodoId: null,
    editingTodo: null,
    showEditDialog: false,
    showAddDialog: false,
    showDeleteDialog: false,
    deleteTodoId: '',
    initialized: false,
    dataSource: '',
    ...DEFAULT_DIALOG_DATA,
    ...DEFAULT_VIEW_DATA
  },

  onLoad() {
    const today = dateUtil.getTodayKey();
    const day = new Date().getDate();
    this.setData({ todayDateKey: today, selectedDate: today, selectedDateDay: day });
    this.initialLoad();
  },

  onShow() {
    pageMixin.handleOnShow.call(this);
    // 打印当前缓存
    const cachedTodos = todoCache.getCache();
    console.log('【日历页】当前缓存:', cachedTodos);
  },

  clearPageData() {
    this.setData({
      monthTodos: {},
      dateStats: {},
      allMonthTodos: [],
      selectedDateTodos: []
    });
  },

  async initialLoad() {
    this.renderCalendar();
    await pageMixin.handleInitialLoad.call(this);
  },

  refreshFromCache() {
    pageMixin.refreshPageFromCache.call(this, (cachedTodos, dataSource) => {
      const { currentYear, currentMonth } = this.data;
      const monthTodos = todoFilters.filterMonthTodos(cachedTodos, currentYear, currentMonth);
      const dateStats = todoFilters.calculateDateStats(monthTodos);
      const groupedTodos = todoFilters.groupTodosByDate(monthTodos);
      this.setData({
        monthTodos: groupedTodos,
        dateStats,
        allMonthTodos: monthTodos,
        dataSource
      });
      this.renderCalendar();
      this.loadTodosForDate(this.data.selectedDate);
      pageMixin.syncToIndexPage.call(this, cachedTodos);
    });
  },

  async loadFromServer() {
    const { currentYear, currentMonth } = this.data;

    await loadingManager.withLoading(async () => {
      const allTodos = await storage.getAllTodos();

      todoCache.setCache(allTodos);
      pageManager.clearLoginRefreshPending();

      const monthTodos = todoFilters.filterMonthTodos(allTodos, currentYear, currentMonth);
      const dateStats = todoFilters.calculateDateStats(monthTodos);
      const groupedTodos = todoFilters.groupTodosByDate(monthTodos);

      this.setData({ monthTodos: groupedTodos, dateStats, allMonthTodos: monthTodos, dataSource: 'server' });
      this.renderCalendar();
      this.loadTodosForDate(this.data.selectedDate);
      pageMixin.syncToIndexPage.call(this, allTodos);
    }, '加载中');
  },

  renderCalendar() {
    const { currentYear, currentMonth, todayDateKey, dateStats } = this.data;
    const weeks = dateUtil.generateCalendar(currentYear, currentMonth, todayDateKey, dateStats || {});
    this.setData({ calendarWeeks: weeks });
  },

  loadTodosForDate(dateKey) {
    const cachedTodos = todoCache.getCache();
    const { currentYear, currentMonth } = this.data;

    const monthTodos = cachedTodos !== undefined ? todoFilters.filterMonthTodos(cachedTodos, currentYear, currentMonth) : [];

    const todos = todoFilters.filterTodosByDate(monthTodos, dateKey);

    this.setData({
      allMonthTodos: monthTodos,
      selectedDateTodos: todos,
      expandedTodoId: null
    });
  },

  onSelectDate(e) {
    const dateKey = e.currentTarget.dataset.datekey;
    if (!dateKey) return;

    const day = parseInt(dateKey.split('-')[2]);
    const clickedMonth = parseInt(dateKey.split('-')[1]);
    const clickedYear = parseInt(dateKey.split('-')[0]);
    const { currentYear, currentMonth } = this.data;

    const cachedTodos = todoCache.getCache();
    const isSameMonth = clickedYear === currentYear && clickedMonth === currentMonth;

    if (cachedTodos !== undefined) {
      const monthTodos = todoFilters.filterMonthTodos(cachedTodos, currentYear, currentMonth);
      const dateStats = todoFilters.calculateDateStats(monthTodos);
      const groupedTodos = todoFilters.groupTodosByDate(monthTodos);
      this.setData({
        monthTodos: groupedTodos,
        dateStats,
        allMonthTodos: monthTodos,
        dataSource: 'cache'
      });
      this.renderCalendar();
    }

    this.setData({ selectedDate: dateKey, selectedDateDay: day });

    if (isSameMonth) {
      this.loadTodosForDate(dateKey);
    } else {
      this.changeMonthTo(clickedYear, clickedMonth, dateKey);
    }
  },

  changeMonthTo(targetYear, targetMonth, selectedDate) {
    const day = parseInt(selectedDate.split('-')[2]);

    this.setData({
      currentYear: targetYear,
      currentMonth: targetMonth,
      selectedDate: selectedDate,
      selectedDateDay: day
    });

    const cachedTodos = todoCache.getCache();
    if (cachedTodos !== undefined) {
      const monthTodos = todoFilters.filterMonthTodos(cachedTodos, targetYear, targetMonth);
      const dateStats = todoFilters.calculateDateStats(monthTodos);
      const groupedTodos = todoFilters.groupTodosByDate(monthTodos);
      this.setData({
        monthTodos: groupedTodos,
        dateStats,
        allMonthTodos: monthTodos,
        dataSource: 'cache'
      });
      this.renderCalendar();
      this.loadTodosForDate(selectedDate);
      pageMixin.syncToIndexPage.call(this, cachedTodos);
    }
  },

  getTargetDate(targetYear, targetMonth, currentSelectedDate) {
    const currentDay = parseInt(currentSelectedDate.split('-')[2]);
    const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
    const targetDay = Math.min(currentDay, lastDayOfMonth);

    const monthStr = String(targetMonth).padStart(2, '0');
    const dayStr = String(targetDay).padStart(2, '0');

    return `${targetYear}-${monthStr}-${dayStr}`;
  },

  onPrevMonth() {
    const { currentYear, currentMonth, selectedDate } = this.data;
    let newYear = currentYear;
    let newMonth = currentMonth - 1;

    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    const newDate = this.getTargetDate(newYear, newMonth, selectedDate);
    this.changeMonthTo(newYear, newMonth, newDate);
  },

  onNextMonth() {
    const { currentYear, currentMonth, selectedDate } = this.data;
    let newYear = currentYear;
    let newMonth = currentMonth + 1;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }

    const newDate = this.getTargetDate(newYear, newMonth, selectedDate);
    this.changeMonthTo(newYear, newMonth, newDate);
  },

  onExpandTodo(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedTodoId: this.data.expandedTodoId === id ? null : id
    });
  },

  onViewTodo(e) {
    if (!auth.checkLogin()) return;

    const id = e.currentTarget.dataset.id;
    const todo = this.data.selectedDateTodos.find(item => item._id === id);
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
    this.setData({ ...DEFAULT_VIEW_DATA });
  },

  onEditTodo(e) {
    if (!auth.checkLogin()) return;

    const id = e.currentTarget.dataset.id;
    const todo = this.data.selectedDateTodos.find(item => item._id === id);
    if (!todo) return;

    this.setData({
      editingTodo: todo,
      showEditDialog: true,
      editTitle: todo.title || '',
      editContent: todo.content || '',
      editStartDate: todo.startDate || '',
      editDate: todo.endDate || '',
      editPermanent: todo.permanent || false,
      editPriority: todo.importance === 3 ? 'high' : 'normal'
    });
  },

  onShowAddDialog() {
    if (!auth.checkLogin()) {
      wx.switchTab({ url: '/pages/profile/profile' });
      return;
    }

    const { selectedDate } = this.data;
    this.setData({
      showAddDialog: true,
      ...DEFAULT_DIALOG_DATA,
      editStartDate: selectedDate,
      editDate: selectedDate
    });
  },

  closeDialog() {
    this.setData({
      showEditDialog: false,
      showAddDialog: false,
      ...DEFAULT_DIALOG_DATA
    });
  },

  onTitleInput(e) {
    this.setData({ editTitle: e.detail.value });
  },

  onEditTitleChange(e) {
    this.setData({ editTitle: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ editContent: e.detail.value });
  },

  onEditContentChange(e) {
    this.setData({ editContent: e.detail.value });
  },

  onCancelEdit() {
    this.closeDialog();
  },

  onStartDateChange(e) {
    this.setData({ editStartDate: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ editDate: e.detail.value });
  },

  onPermanentChange(e) {
    this.setData({ editPermanent: e.detail.value });
  },

  onPriorityChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ editPriority: value });
  },

  async onConfirmDelete() {
    if (!auth.checkLogin()) return;

    const { deleteTodoId } = this.data;
    if (!deleteTodoId) {
      this.setData({ showDeleteDialog: false });
      return;
    }

    const result = await loadingManager.withLoading(
      () => storage.deleteTodo(deleteTodoId),
      '删除中'
    );

    if (result) {
      wx.showToast({ title: '已删除', icon: 'success' });
      pageMixin.afterOperation.call(this, 'delete', deleteTodoId);
    } else {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }

    this.setData({ deleteTodoId: '' });
  },

  onCancelDelete() {
    this.setData({ showDeleteDialog: false, deleteTodoId: '' });
  },

  async onSaveEdit() {
    await this.onConfirmSave();
  },

  async onConfirmSave() {
    if (!auth.checkLogin()) return;

    const { editTitle, editStartDate, editDate, editPermanent, editPriority, editingTodo, showAddDialog } = this.data;

    if (!editTitle.trim()) {
      wx.showToast({ title: '请输入任务标题', icon: 'none' });
      return;
    }

    if (!editStartDate || !editDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }

    const startDate = editStartDate;
    const endDate = editPermanent ? startDate : editDate;
    const todoData = {
      title: editTitle.trim(),
      content: this.data.editContent ? this.data.editContent.trim() : '',
      permanent: editPermanent,
      importance: editPriority === 'high' ? 3 : 2
    };

    let result;

    await loadingManager.withLoading(async () => {
      if (showAddDialog) {
        result = await storage.addTodo(todoData, startDate, endDate);
        if (result) {
          wx.showToast({ title: '添加成功', icon: 'success' });
          pageMixin.afterOperation.call(this, 'add', result._id, result);
        }
      } else if (editingTodo) {
        if (editingTodo.permanent && !editPermanent) {
          await storage.deleteTodo(editingTodo._id);
          result = await storage.addTodo(todoData, startDate, endDate);
          if (result) {
            wx.showToast({ title: '修改成功', icon: 'success' });
            pageMixin.afterOperation.call(this, 'delete', editingTodo._id);
            pageMixin.afterOperation.call(this, 'add', result._id, result);
          }
        } else {
          const updateData = {
            ...todoData,
            startDate,
            endDate
          };
          result = await storage.updateTodo(editingTodo._id, updateData);
          if (result) {
            wx.showToast({ title: '修改成功', icon: 'success' });
            pageMixin.afterOperation.call(this, 'update', editingTodo._id, updateData);
          }
        }
      }

      if (result) {
        this.closeDialog();
      } else {
        wx.showToast({ title: showAddDialog ? '添加失败' : '修改失败', icon: 'none' });
      }
    }, '保存中');
  },

  async onDeleteTodo(e) {
    if (!auth.checkLogin()) return;

    const id = e.currentTarget.dataset.id;
    if (!id) return;

    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条任务吗？',
      confirmText: '删除',
      confirmColor: '#ff4d4f'
    });

    if (res.confirm) {
      const result = await loadingManager.withLoading(
        () => storage.deleteTodo(id),
        '删除中'
      );

      if (result) {
        wx.showToast({ title: '删除成功', icon: 'success' });
        pageMixin.afterOperation.call(this, 'delete', id);
      } else {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  },

  async onClearAll() {
    if (!auth.checkLogin()) return;

    const res = await wx.showModal({
      title: '确认清除',
      content: '确定要清除所有任务数据吗？此操作不可恢复！',
      confirmText: '清除',
      confirmColor: '#ff4d4f'
    });

    if (res.confirm) {
      const result = await loadingManager.withLoading(
        () => storage.clearAllTodos(),
        '清除中'
      );

      if (result) {
        wx.showToast({ title: '已清除所有数据', icon: 'success' });
        todoCache.clearCache();
        todoCache.setCache([]);
        this.setData({
          monthTodos: {},
          dateStats: {},
          allMonthTodos: [],
          selectedDateTodos: [],
          dataSource: 'cache'
        });
        this.renderCalendar();
        pageMixin.syncToIndexPage.call(this, []);
      } else {
        wx.showToast({ title: '清除失败', icon: 'none' });
      }
    }
  }
});
