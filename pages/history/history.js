const storage = require('../../utils/storage.js');
const dateUtil = require('../../utils/dateUtil.js');
const mixin = require('../../utils/todoMixin.js');
const pageManager = require('../../utils/pageManager.js');
const auth = require('../../utils/auth.js');
const todoCache = require('../../utils/todoCache.js');

const DEFAULT_DIALOG_DATA = {
  editTitle: '',
  editContent: '',
  editStartDate: '',
  editDate: '',
  editPermanent: false
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
    ...DEFAULT_DIALOG_DATA
  },

  onLoad() {
    const today = dateUtil.getTodayKey();
    const day = new Date().getDate();
    this.setData({ todayDateKey: today, selectedDate: today, selectedDateDay: day });
    this.initialLoad();
  },

  onShow() {
    const today = dateUtil.getTodayKey();
    this.setData({ todayDateKey: today });
    
    if (!this.data.initialized) {
      return;
    }
    
    if (!auth.checkLogin()) {
      this.setData({ 
        monthTodos: {}, 
        dateStats: {}, 
        allMonthTodos: [],
        selectedDateTodos: []
      });
      return;
    }
    
    const { needRefresh } = pageManager.checkRefreshNeeded();
    if (needRefresh) {
      this.loadMonthData(this.data.currentYear, this.data.currentMonth, true);
    }
  },

  async initialLoad() {
    this.renderCalendar();
    
    if (!auth.checkLogin()) {
      this.setData({ initialized: true });
      return;
    }
    
    await this.loadMonthData(this.data.currentYear, this.data.currentMonth, false);
    this.setData({ initialized: true });
  },

  async loadMonthData(year, month, forceRefresh = false) {
    if (!auth.checkLogin()) {
      this.setData({ 
        monthTodos: {}, 
        dateStats: {}, 
        allMonthTodos: [],
        selectedDateTodos: []
      });
      this.renderCalendar();
      return;
    }

    if (!forceRefresh) {
      const cachedTodos = todoCache.getCache();
      if (cachedTodos) {
        const monthTodos = this.filterMonthTodos(cachedTodos, year, month);
        const dateStats = this.calculateDateStats(monthTodos);
        const groupedTodos = this.groupTodosByDate(monthTodos);
        this.setData({ 
          monthTodos: groupedTodos, 
          dateStats, 
          allMonthTodos: monthTodos 
        });
        this.renderCalendar();
        this.loadTodosForDate(this.data.selectedDate);
        return;
      }
    }

    wx.showLoading({ title: '加载中' });
    try {
      console.log('[History] 从后台获取数据');
      const allTodos = await storage.getAllTodos();
      
      todoCache.setCache(allTodos);
      pageManager.clearLoginRefreshPending();
      pageManager.clearDataChangedPending();
      
      const monthTodos = this.filterMonthTodos(allTodos, year, month);
      const dateStats = this.calculateDateStats(monthTodos);
      const groupedTodos = this.groupTodosByDate(monthTodos);
      
      this.setData({ monthTodos: groupedTodos, dateStats, allMonthTodos: monthTodos });
    } catch (e) {
      console.error('loadMonthData error:', e);
      this.setData({ monthTodos: {}, dateStats: {}, allMonthTodos: [] });
    } finally {
      this.renderCalendar();
      this.loadTodosForDate(this.data.selectedDate);
      wx.hideLoading();
    }
  },

  filterMonthTodos(todos, year, month) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return (todos || []).filter(todo => {
      return todo.startDate.startsWith(monthStr) || todo.endDate.startsWith(monthStr);
    });
  },

  calculateDateStats(todos) {
    const stats = {};
    (todos || []).forEach(todo => {
      const date = todo.endDate;
      if (!stats[date]) {
        stats[date] = { total: 0, completed: 0 };
      }
      stats[date].total++;
      if (todo.completed) {
        stats[date].completed++;
      }
    });
    return stats;
  },

  groupTodosByDate(todos) {
    return (todos || []).reduce((acc, todo) => {
      const key = todo.startDate;
      if (!acc[key]) acc[key] = [];
      acc[key].push(todo);
      return acc;
    }, {});
  },

  renderCalendar() {
    const { currentYear, currentMonth, todayDateKey, dateStats } = this.data;
    const weeks = dateUtil.generateCalendar(currentYear, currentMonth, todayDateKey, dateStats || {});
    this.setData({ calendarWeeks: weeks });
  },

  loadTodosForDate(dateKey) {
    const { allMonthTodos } = this.data;
    
    const todos = (allMonthTodos || []).filter(todo => {
      if (todo.completed || todo.abandoned) {
        return todo.endDate === dateKey;
      }
      if (todo.permanent) {
        return dateKey >= todo.startDate;
      }
      return dateKey >= todo.startDate && dateKey <= todo.endDate;
    });
    
    this.setData({ selectedDateTodos: todos, expandedTodoId: null });
  },

  onSelectDate(e) {
    const dateKey = e.currentTarget.dataset.datekey;
    if (!dateKey) return;
    
    const day = parseInt(dateKey.split('-')[2]);
    
    this.setData({ selectedDate: dateKey, selectedDateDay: day });
    this.loadTodosForDate(dateKey);
  },

  getTargetDate(targetYear, targetMonth, currentSelectedDate) {
    const currentDay = parseInt(currentSelectedDate.split('-')[2]);
    const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
    const targetDay = Math.min(currentDay, lastDayOfMonth);
    
    const monthStr = String(targetMonth).padStart(2, '0');
    const dayStr = String(targetDay).padStart(2, '0');
    
    return `${targetYear}-${monthStr}-${dayStr}`;
  },

  changeMonth(delta) {
    let { currentYear, currentMonth, selectedDate } = this.data;
    currentMonth += delta;
    
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    } else if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    
    const targetDate = this.getTargetDate(currentYear, currentMonth, selectedDate);
    const day = parseInt(targetDate.split('-')[2]);
    
    this.setData({ currentYear, currentMonth, selectedDate: targetDate, selectedDateDay: day });
    this.loadMonthData(currentYear, currentMonth, false);
  },

  onPrevMonth() {
    this.changeMonth(-1);
  },

  onNextMonth() {
    this.changeMonth(1);
  },

  onToggleExpand(e) {
    mixin.toggleExpand(this, e);
  },

  onDeleteTodo(e) {
    if (!auth.checkLogin()) return;
    
    const id = mixin.extractId(e, 'onDeleteTodo');
    if (!id) return;
    e.stopPropagation && e.stopPropagation();
    
    this.setData({ showDeleteDialog: true, deleteTodoId: id });
  },

  async onConfirmDelete() {
    if (!auth.checkLogin()) return;
    
    const { deleteTodoId, selectedDate } = this.data;
    this.setData({ showDeleteDialog: false });
    
    if (!deleteTodoId) {
      this.setData({ deleteTodoId: '' });
      return;
    }
    
    wx.showLoading({ title: '删除中' });
    try {
      const result = await storage.deleteTodo(deleteTodoId);
      if (result) {
        wx.showToast({ title: '已删除', icon: 'success' });
        pageManager.setDataChangedPending();
        this.loadMonthData(this.data.currentYear, this.data.currentMonth, true);
      } else {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    } finally {
      wx.hideLoading();
      this.setData({ deleteTodoId: '' });
    }
  },

  onCancelDelete() {
    this.setData({ showDeleteDialog: false, deleteTodoId: '' });
  },

  onEditTodo(e) {
    if (!auth.checkLogin()) return;
    
    const id = mixin.extractId(e, 'onEditTodo');
    if (!id) return;
    e.stopPropagation && e.stopPropagation();
    
    const { selectedDateTodos, selectedDate } = this.data;
    const todo = selectedDateTodos.find(t => t._id === id);
    
    if (!todo) {
      wx.showToast({ title: '未找到待办事项', icon: 'none' });
      return;
    }
    
    this.setData({
      editingTodo: todo,
      showEditDialog: true,
      showAddDialog: false,
      editContent: todo.content || '',
      editTitle: todo.title || '',

      editStartDate: todo.startDate || selectedDate,
      editDate: selectedDate,
      editPermanent: todo.permanent || false
    });
  },

  onShowAddDialog() {
    if (!auth.checkLogin()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    const { selectedDate, todayDateKey, monthTodos } = this.data;
    
    if (selectedDate < todayDateKey) {
      wx.showToast({ title: '该日期已过期，无法添加待办', icon: 'none', duration: 2000 });
      return;
    }
    
    const dayTodos = monthTodos[selectedDate] || [];
    if (dayTodos.length >= 10) {
      wx.showToast({ title: '该日期待办已满（最多10个）', icon: 'none', duration: 2000 });
      return;
    }
    
    this.setData({
      showAddDialog: true,
      showEditDialog: false,
      ...DEFAULT_DIALOG_DATA,
      editStartDate: selectedDate,
      editDate: selectedDate
    });
  },

  closeDialog() {
    this.setData({
      editingTodo: null,
      showEditDialog: false,
      showAddDialog: false,
      ...DEFAULT_DIALOG_DATA
    });
  },

  onCancelEdit() {
    this.closeDialog();
  },

  onStopPropagation() {},

  onEditTitleChange(e) {
    this.setData({ editTitle: e.detail.value });
  },

  onEditContentChange(e) {
    this.setData({ editContent: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ editDate: e.detail.value });
  },

  onPermanentChange(e) {
    this.setData({ editPermanent: e.detail.value });
  },

  async onSaveEdit() {
    if (!auth.checkLogin()) return;
    
    const { editingTodo, editContent, selectedDate, showAddDialog, editTitle, editDate, editStartDate, editPermanent } = this.data;
    const newTitle = editTitle ? editTitle.trim() : '';
    
    if (!newTitle) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中' });

    try {
      const startDate = editStartDate || selectedDate;
      const endDate = editPermanent ? startDate : (editDate || startDate);
      const todoData = {
        title: newTitle,
        content: editContent ? editContent.trim() : '',
        permanent: editPermanent
      };

      let result;
      
      if (showAddDialog) {
        result = await storage.addTodo(todoData, startDate, endDate);
        if (result) wx.showToast({ title: '添加成功', icon: 'success' });
      } else if (editingTodo) {
        if (editingTodo.permanent && !editPermanent) {
          await storage.deleteTodo(editingTodo._id);
          result = await storage.addTodo(todoData, startDate, endDate);
        } else {
          result = await storage.updateTodo(editingTodo._id, {
            ...todoData,
            startDate,
            endDate
          });
        }
        if (result) wx.showToast({ title: '修改成功', icon: 'success' });
      }

      if (result) {
        pageManager.setDataChangedPending();
        this.closeDialog();
        this.loadMonthData(this.data.currentYear, this.data.currentMonth, true);
      } else {
        wx.showToast({ title: showAddDialog ? '添加失败' : '修改失败', icon: 'none' });
      }
    } finally {
      wx.hideLoading();
    }
  },

  async onDeleteTodo(e) {
    if (!auth.checkLogin()) return;
    
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条待办吗？',
      confirmText: '删除',
      confirmColor: '#ff4d4f'
    });

    if (res.confirm) {
      wx.showLoading({ title: '删除中' });
      const result = await storage.deleteTodo(id);
      wx.hideLoading();

      if (result) {
        wx.showToast({ title: '删除成功', icon: 'success' });
        pageManager.setDataChangedPending();
        this.loadMonthData(this.data.currentYear, this.data.currentMonth, true);
      } else {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  },

  async onClearAll() {
    if (!auth.checkLogin()) return;
    
    const res = await wx.showModal({
      title: '确认清除',
      content: '确定要清除所有待办数据吗？此操作不可恢复！',
      confirmText: '清除',
      confirmColor: '#ff4d4f'
    });

    if (res.confirm) {
      wx.showLoading({ title: '清除中' });
      const result = await storage.clearAllTodos();
      wx.hideLoading();

      if (result) {
        wx.showToast({ title: '已清除所有数据', icon: 'success' });
        pageManager.setDataChangedPending();
        this.loadMonthData(this.data.currentYear, this.data.currentMonth, true);
      } else {
        wx.showToast({ title: '清除失败', icon: 'none' });
      }
    }
  }
});