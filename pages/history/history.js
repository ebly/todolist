const storage = require('../../utils/storage.js');
const dateUtil = require('../../utils/dateUtil.js');
const mixin = require('../../utils/todoMixin.js');

// 对话框默认数据
const DEFAULT_DIALOG_DATA = {
  editTitle: '',
  editContent: '',
  editImportance: 2,
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
    selectedDateTodos: [],
    todayDateKey: '',
    expandedTodoId: null,
    editingTodo: null,
    showEditDialog: false,
    showAddDialog: false,
    showDeleteDialog: false,
    deleteTodoId: '',
    ...DEFAULT_DIALOG_DATA
  },

  onLoad() {
    const today = dateUtil.getTodayKey();
    this.setData({ todayDateKey: today, selectedDate: today });
    this.refreshData(today);
  },

  onShow() {
    const today = dateUtil.getTodayKey();
    this.setData({ todayDateKey: today });
    this.refreshData(this.data.selectedDate);
  },

  /**
   * 刷新数据（月份 + 选中日期）
   */
  async refreshData(dateKey) {
    await this.loadMonthData(this.data.currentYear, this.data.currentMonth);
    this.loadTodosForDate(dateKey);
  },

  /**
   * 加载指定月份的数据
   */
  async loadMonthData(year, month) {
    wx.showLoading({ title: '加载中' });
    try {
      // 复用 storage.getDateStats 获取统计数据
      const dateStats = await storage.getDateStats(year, month);
      const todos = await storage.getTodosByMonth(year, month);
      
      // 按开始日期分组
      const monthTodos = todos.reduce((acc, todo) => {
        const key = todo.startDate;
        if (!acc[key]) acc[key] = [];
        acc[key].push(todo);
        return acc;
      }, {});
      
      this.setData({ monthTodos, dateStats, allMonthTodos: todos });
      this.renderCalendar();
    } catch (e) {
      console.error('loadMonthData error:', e);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 渲染日历
   */
  renderCalendar() {
    const { currentYear, currentMonth, todayDateKey, dateStats } = this.data;
    const weeks = dateUtil.generateCalendar(currentYear, currentMonth, todayDateKey, dateStats || {});
    this.setData({ calendarWeeks: weeks });
  },

  /**
   * 加载指定日期的待办
   */
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

  /**
   * 选择日期
   */
  onSelectDate(e) {
    const dateKey = e.currentTarget.dataset.datekey;
    if (!dateKey) return;
    
    this.setData({ selectedDate: dateKey });
    this.loadTodosForDate(dateKey);
  },

  /**
   * 获取目标月份应该选中的日期
   */
  getTargetDate(targetYear, targetMonth, currentSelectedDate) {
    const currentDay = parseInt(currentSelectedDate.split('-')[2]);
    const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
    const targetDay = Math.min(currentDay, lastDayOfMonth);
    
    const monthStr = String(targetMonth).padStart(2, '0');
    const dayStr = String(targetDay).padStart(2, '0');
    
    return `${targetYear}-${monthStr}-${dayStr}`;
  },

  /**
   * 切换月份
   */
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
    
    this.setData({ currentYear, currentMonth, selectedDate: targetDate });
    this.refreshData(targetDate);
  },

  onPrevMonth() {
    this.changeMonth(-1);
  },

  onNextMonth() {
    this.changeMonth(1);
  },

  /**
   * 切换展开状态
   */
  onToggleExpand(e) {
    mixin.toggleExpand(this, e);
  },

  /**
   * 删除待办
   */
  onDeleteTodo(e) {
    const id = mixin.extractId(e, 'onDeleteTodo');
    if (!id) return;
    e.stopPropagation && e.stopPropagation();
    
    this.setData({ showDeleteDialog: true, deleteTodoId: id });
  },

  async onConfirmDelete() {
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
        mixin.showSuccess('已删除');
        this.refreshData(selectedDate);
      } else {
        mixin.showError('删除失败');
      }
    } finally {
      wx.hideLoading();
      this.setData({ deleteTodoId: '' });
    }
  },

  onCancelDelete() {
    this.setData({ showDeleteDialog: false, deleteTodoId: '' });
  },

  /**
   * 编辑待办
   */
  onEditTodo(e) {
    const id = mixin.extractId(e, 'onEditTodo');
    if (!id) return;
    e.stopPropagation && e.stopPropagation();
    
    const { selectedDateTodos, selectedDate } = this.data;
    const todo = selectedDateTodos.find(t => t._id === id);
    
    if (!todo) {
      mixin.showError('未找到待办事项');
      return;
    }
    
    this.setData({
      editingTodo: todo,
      showEditDialog: true,
      showAddDialog: false,
      editContent: todo.content || '',
      editTitle: todo.title || '',
      editImportance: todo.importance || 2,
      editStartDate: todo.startDate || selectedDate,
      editDate: selectedDate,
      editPermanent: todo.permanent || false
    });
  },

  /**
   * 显示新增对话框
   */
  onShowAddDialog() {
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

  /**
   * 关闭对话框
   */
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

  // 表单输入处理
  onEditTitleChange(e) {
    this.setData({ editTitle: e.detail.value });
  },

  onEditContentChange(e) {
    this.setData({ editContent: e.detail.value });
  },

  onImportanceChange(e) {
    this.setData({ editImportance: parseInt(e.currentTarget.dataset.value) });
  },

  onDateChange(e) {
    this.setData({ editDate: e.detail.value });
  },

  onPermanentChange(e) {
    this.setData({ editPermanent: e.detail.value });
  },

  /**
   * 保存编辑/新增
   */
  async onSaveEdit() {
    const { editingTodo, editContent, selectedDate, showAddDialog, editTitle, editImportance, editDate, editStartDate, editPermanent } = this.data;
    const newTitle = editTitle ? editTitle.trim() : '';
    
    if (!newTitle) {
      mixin.showError('请输入标题');
      return;
    }

    wx.showLoading({ title: '保存中' });

    try {
      const startDate = editStartDate || selectedDate;
      const endDate = editPermanent ? startDate : (editDate || startDate);
      const todoData = {
        title: newTitle,
        content: editContent ? editContent.trim() : '',
        importance: editImportance,
        permanent: editPermanent
      };

      let result;
      
      if (showAddDialog) {
        // 新增
        result = await storage.addTodo(todoData, startDate, endDate);
        if (result) mixin.showSuccess('添加成功');
      } else if (editingTodo) {
        // 编辑
        if (editingTodo.permanent && !editPermanent) {
          // 不限 -> 有限：删除原记录，创建新记录
          await storage.deleteTodo(editingTodo._id);
          result = await storage.addTodo(todoData, startDate, endDate);
        } else {
          // 普通更新
          result = await storage.updateTodo(editingTodo._id, {
            ...todoData,
            startDate,
            endDate
          });
        }
        if (result) mixin.showSuccess('修改成功');
      }

      if (result) {
        this.closeDialog();
        this.refreshData(selectedDate);
      } else {
        mixin.showError(showAddDialog ? '添加失败' : '修改失败');
      }
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 清除所有待办
   */
  async onClearAll() {
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
        mixin.showSuccess('已清除所有数据');
        this.refreshData(this.data.selectedDate);
      } else {
        mixin.showError('清除失败');
      }
    }
  }
});
