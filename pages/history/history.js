const storage = require('../../utils/storage.js');
const dateUtil = require('../../utils/dateUtil.js');
const mixin = require('../../utils/todoMixin.js');

Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    calendarWeeks: [],
    dateStats: {},
    monthTodos: {}, // 存储整个月份的待办数据，按开始日期分组
    allMonthTodos: [], // 存储当前月份的所有待办（用于日期范围查询）
    selectedDate: '',
    selectedDateTodos: [],
    todayDateKey: '',
    expandedTodoId: null,
    editingTodo: null,
    showEditDialog: false,
    showAddDialog: false,
    showDeleteDialog: false,
    deleteTodoId: '',
    editContent: '',
    editTitle: '',
    editImportance: 2,
    editStartDate: '',  // 开始日期
    editDate: '',       // 截至日期
    editPermanent: false
  },

  onLoad() {
    const today = dateUtil.getTodayKey();
    this.setData({ todayDateKey: today, selectedDate: today });
    this.loadMonthData(this.data.currentYear, this.data.currentMonth).then(() => {
      this.loadTodosForDate(today);
    });
  },

  onShow() {
    const today = dateUtil.getTodayKey();
    this.setData({ todayDateKey: today });
    // 刷新当前月份数据和选中日期的待办
    this.loadMonthData(this.data.currentYear, this.data.currentMonth).then(() => {
      this.loadTodosForDate(this.data.selectedDate);
    });
  },

  /**
   * 加载指定月份的数据（从服务器获取）
   */
  async loadMonthData(year, month) {
    wx.showLoading({ title: '加载中' });
    try {
      // 从服务器获取当前月份的所有待办
      const todos = await storage.getTodosByMonth(year, month);
      
      // 按开始日期分组
      const monthTodos = {};
      const dateStats = {};
      
      todos.forEach(todo => {
        // 使用 startDate 作为分组键
        const dateKey = todo.startDate;
        if (!monthTodos[dateKey]) {
          monthTodos[dateKey] = [];
        }
        monthTodos[dateKey].push(todo);
        
        // 统计日期数据
        if (!dateStats[dateKey]) {
          dateStats[dateKey] = { total: 0, completed: 0, hasIncomplete: false, hasCompleted: false };
        }
        dateStats[dateKey].total++;
        if (todo.completed) {
          dateStats[dateKey].completed++;
        }
      });
      
      // 计算 hasIncomplete 和 hasCompleted
      Object.keys(dateStats).forEach(dateKey => {
        const stat = dateStats[dateKey];
        stat.hasCompleted = stat.completed > 0;
        stat.hasIncomplete = stat.completed < stat.total;
        console.log('[History] dateStats:', dateKey, 'total:', stat.total, 'completed:', stat.completed, 'hasIncomplete:', stat.hasIncomplete, 'hasCompleted:', stat.hasCompleted);
      });
      
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
    const safeDateStats = dateStats || {};
    
    const weeks = dateUtil.generateCalendar(currentYear, currentMonth, todayDateKey, safeDateStats);
    this.setData({ calendarWeeks: weeks });
  },

  /**
   * 加载指定日期的待办（从本地月份数据获取）
   */
  loadTodosForDate(dateKey) {
    const { allMonthTodos } = this.data;
    
    // 筛选出日期范围包含该日期的待办，以及不限日期的待办
    // 已完成/放弃的待办只在 endDate 当天显示
    const todos = (allMonthTodos || []).filter(todo => {
      // 如果待办已完成或放弃，只在 endDate 当天显示
      if (todo.completed || todo.abandoned) {
        return todo.endDate === dateKey;
      }
      
      // 未完成未放弃的待办正常显示
      if (todo.permanent) {
        return dateKey >= todo.startDate;
      }
      return dateKey >= todo.startDate && dateKey <= todo.endDate;
    });
    
    this.setData({ selectedDateTodos: todos, expandedTodoId: null });
  },

  /**
   * 选择日期（查看待办）
   */
  onSelectDate(e) {
    const dateKey = e.currentTarget.dataset.datekey;
    if (!dateKey) return;
    
    this.setData({ selectedDate: dateKey });
    this.loadTodosForDate(dateKey);
  },

  /**
   * 获取目标月份应该选中的日期
   * @param {number} targetYear 目标年份
   * @param {number} targetMonth 目标月份
   * @param {string} currentSelectedDate 当前选中的日期
   * @returns {string} 目标日期
   */
  getTargetDate(targetYear, targetMonth, currentSelectedDate) {
    // 从当前选中的日期提取日
    const currentDay = parseInt(currentSelectedDate.split('-')[2]);
    
    // 获取目标月份的最大天数
    const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
    
    // 如果当前日大于目标月份的最大天数，则选择最大天数
    const targetDay = Math.min(currentDay, lastDayOfMonth);
    
    const monthStr = String(targetMonth).padStart(2, '0');
    const dayStr = String(targetDay).padStart(2, '0');
    
    return `${targetYear}-${monthStr}-${dayStr}`;
  },

  /**
   * 上一月
   */
  onPrevMonth() {
    let { currentYear, currentMonth, selectedDate } = this.data;
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    
    // 计算目标日期
    const targetDate = this.getTargetDate(currentYear, currentMonth, selectedDate);
    
    this.setData({ 
      currentYear, 
      currentMonth, 
      selectedDate: targetDate 
    });
    this.loadMonthData(currentYear, currentMonth).then(() => {
      this.loadTodosForDate(targetDate);
    });
  },

  /**
   * 下一月
   */
  onNextMonth() {
    let { currentYear, currentMonth, selectedDate } = this.data;
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    
    // 计算目标日期
    const targetDate = this.getTargetDate(currentYear, currentMonth, selectedDate);
    
    this.setData({ 
      currentYear, 
      currentMonth, 
      selectedDate: targetDate 
    });
    this.loadMonthData(currentYear, currentMonth).then(() => {
      this.loadTodosForDate(targetDate);
    });
  },

  /**
   * 切换展开状态
   */
  onToggleExpand(e) {
    mixin.toggleExpand(this, e);
  },

  /**
   * 删除待办 - 显示确认对话框
   */
  onDeleteTodo(e) {
    const id = mixin.extractId(e, 'onDeleteTodo');
    if (!id) return;
    
    e.stopPropagation && e.stopPropagation();
    
    this.setData({
      showDeleteDialog: true,
      deleteTodoId: id
    });
  },

  /**
   * 确认删除
   */
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
        // 刷新当前月份数据
        this.loadMonthData(this.data.currentYear, this.data.currentMonth).then(() => {
          this.loadTodosForDate(selectedDate);
        });
      } else {
        mixin.showError('删除失败');
      }
    } finally {
      wx.hideLoading();
      this.setData({ deleteTodoId: '' });
    }
  },

  /**
   * 取消删除
   */
  onCancelDelete() {
    this.setData({
      showDeleteDialog: false,
      deleteTodoId: ''
    });
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
    
    if (todo) {
      this.setData({
        editingTodo: todo,
        showEditDialog: true,
        showAddDialog: false,
        editContent: todo.content || '',
        editTitle: todo.title || '',
        editImportance: todo.importance || 2,
        editStartDate: todo.startDate || selectedDate,
        editDate: selectedDate,  // 编辑时截至日期默认为当前选中的日期
        editPermanent: todo.permanent || false
      });
    } else {
      mixin.showError('未找到待办事项');
    }
  },

  /**
   * 显示新增对话框（用于当前选中日期）
   */
  onShowAddDialog() {
    const { selectedDate, todayDateKey, monthTodos } = this.data;
    
    // 检查是否过期
    if (selectedDate < todayDateKey) {
      wx.showToast({
        title: '该日期已过期，无法添加待办',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 检查当天待办数量是否超过10个
    const dayTodos = monthTodos[selectedDate] || [];
    if (dayTodos.length >= 10) {
      wx.showToast({
        title: '该日期待办已满（最多10个）',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    this.setData({
      showAddDialog: true,
      showEditDialog: false,
      editTitle: '',
      editContent: '',
      editImportance: 2,
      editStartDate: selectedDate,
      editDate: selectedDate,
      editPermanent: false
    });
  },

  /**
   * 显示新增对话框（用于今天）
   */
  onShowAddDialogForToday() {
    console.log('[History] onShowAddDialogForToday clicked');
    const today = dateUtil.getTodayKey();
    console.log('[History] today:', today);
    this.setData({
      selectedDate: today,
      showAddDialog: true,
      showEditDialog: false,
      editTitle: '',
      editContent: '',
      editImportance: 2,
      editStartDate: today,
      editDate: today,
      editPermanent: false
    }, () => {
      console.log('[History] showAddDialog set to:', this.data.showAddDialog);
    });
  },

  /**
   * 取消编辑
   */
  onCancelEdit() {
    this.setData({
      editingTodo: null,
      showEditDialog: false,
      showAddDialog: false,
      editContent: '',
      editTitle: '',
      editImportance: 2,
      editDate: '',
      editPermanent: false
    });
  },

  /**
   * 阻止事件冒泡
   */
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

  onStartDateChange(e) {
    const newStartDate = e.detail.value;
    const { editDate } = this.data;
    
    // 如果修改了开始日期，截至日期也要同步更新（保持与开始日期相同或更晚）
    // 如果当前截至日期早于新的开始日期，则更新截至日期为开始日期
    const newEndDate = editDate && editDate < newStartDate ? newStartDate : editDate;
    
    this.setData({ 
      editStartDate: newStartDate,
      editDate: newEndDate
    });
  },

  onPermanentChange(e) {
    this.setData({ editPermanent: e.detail.value });
  },

  /**
   * 保存编辑/新增 - 直接操作后台
   */
  async onSaveEdit() {
    const { editingTodo, editContent, selectedDate, showAddDialog, editTitle, editImportance, editDate, editStartDate, editPermanent } = this.data;
    const newContent = editContent ? editContent.trim() : '';
    const newTitle = editTitle ? editTitle.trim() : '';
    
    if (!newTitle) {
      mixin.showError('请输入标题');
      return;
    }

    wx.showLoading({ title: '保存中' });

    try {
      // 新增待办
      if (showAddDialog) {
        const startDate = editStartDate || selectedDate;
        const endDate = editPermanent ? startDate : (editDate || startDate);
        const todoData = {
          title: newTitle,
          content: newContent,
          importance: editImportance,
          permanent: editPermanent
        };
        const result = await storage.addTodo(todoData, startDate, endDate);
        
        if (result) {
          this.setData({
            showAddDialog: false,
            editTitle: '',
            editContent: '',
            editImportance: 2,
            editStartDate: '',
            editDate: '',
            editPermanent: false
          });
          // 刷新当前月份数据（会包含新添加的待办）
          this.loadMonthData(this.data.currentYear, this.data.currentMonth).then(() => {
            this.loadTodosForDate(selectedDate);
          });
          mixin.showSuccess('添加成功');
        } else {
          mixin.showError('添加失败');
        }
      }

      // 编辑待办
      if (editingTodo) {
        // 编辑时开始日期使用当前选中的日期
        const startDate = selectedDate;
        const endDate = editPermanent ? startDate : (editDate || startDate);
        
        // 如果原是不限日期，现在改为有日期，需要删除原记录并创建日期范围
        if (editingTodo.permanent && !editPermanent) {
          // 删除原不限日期记录
          await storage.deleteTodo(editingTodo._id);
          // 创建日期范围的新待办
          const todoData = {
            title: newTitle,
            content: newContent,
            importance: editImportance,
            permanent: false
          };
          const result = await storage.addTodo(todoData, startDate, endDate);
          
          if (result) {
            this.setData({
              editingTodo: null,
              showEditDialog: false,
              editContent: '',
              editTitle: '',
              editImportance: 2,
              editStartDate: '',
              editDate: '',
              editPermanent: false
            });
            this.loadMonthData(this.data.currentYear, this.data.currentMonth).then(() => {
              this.loadTodosForDate(selectedDate);
            });
            mixin.showSuccess('修改成功');
          } else {
            mixin.showError('修改失败');
          }
        } else {
          // 普通更新（使用 startDate 和 endDate）
          const updateData = {
            content: newContent,
            title: newTitle,
            importance: editImportance,
            permanent: editPermanent,
            startDate: startDate,
            endDate: endDate
          };
          const result = await storage.updateTodo(editingTodo._id, updateData);
          
          if (result) {
            this.setData({
              editingTodo: null,
              showEditDialog: false,
              editContent: '',
              editTitle: '',
              editImportance: 2,
              editStartDate: '',
              editDate: '',
              editPermanent: false
            });
            this.loadMonthData(this.data.currentYear, this.data.currentMonth).then(() => {
              this.loadTodosForDate(selectedDate);
            });
            mixin.showSuccess('修改成功');
          } else {
            mixin.showError('修改失败');
          }
        }
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
        // 刷新页面数据
        this.loadMonthData(this.data.currentYear, this.data.currentMonth).then(() => {
          this.loadTodosForDate(this.data.selectedDate);
        });
      } else {
        mixin.showError('清除失败');
      }
    }
  }
});
