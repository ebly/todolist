/**
 * 数据加载器
 * 统一封装数据加载逻辑，处理缓存和加载状态
 */

const storage = require('./storage.js');
const todoCache = require('./todoCache.js');
const dateUtil = require('./dateUtil.js');

/**
 * 计算两个日期之间的天数差
 * @param {string} date1 日期1 (YYYY-MM-DD)
 * @param {string} date2 日期2 (YYYY-MM-DD)
 * @returns {number} 天数差
 */
const getDaysDiff = (date1, date2) => {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

/**
 * 为待办列表添加进度和剩余天数信息
 * @param {Array} todos 待办列表
 * @param {string} currentDateKey 当前日期key
 * @returns {Array} 处理后的待办列表
 */
const processTodosWithProgress = (todos, currentDateKey) => {
  return todos.map(todo => {
    const { daysLeft, daysTotal, progressPercent, daysLeftText, ...restTodo } = todo;
    
    // 已完成或已放弃的待办不计算进度
    if (restTodo.completed || restTodo.abandoned) {
      return restTodo;
    }
    
    let newDaysLeft = 0;
    let newDaysTotal = 1;
    let newProgressPercent = 100;
    let newDaysLeftText = '';
    
    if (restTodo.permanent) {
      // 不限时的待办
      newDaysLeftText = '不限时';
      newProgressPercent = 100; // 不限时显示满进度
    } else {
      // 计算剩余天数
      newDaysLeft = getDaysDiff(currentDateKey, restTodo.endDate);
      newDaysTotal = getDaysDiff(restTodo.startDate, restTodo.endDate) + 1;
      
      if (newDaysLeft < 0) {
        // 已过期
        newDaysLeftText = '已过期';
        newProgressPercent = 0;
      } else if (newDaysLeft === 0) {
        // 今天截止
        newDaysLeftText = '今天截止';
        newProgressPercent = 5;
      } else {
        // 剩余XX天
        newDaysLeftText = `剩余${newDaysLeft}天`;
        // 计算进度百分比（剩余天数越多，进度条越短）
        const elapsedDays = getDaysDiff(restTodo.startDate, currentDateKey);
        newProgressPercent = Math.max(5, Math.min(100, Math.round((elapsedDays / newDaysTotal) * 100)));
      }
    }
    
    return {
      ...restTodo,
      daysLeft: newDaysLeft,
      daysTotal: newDaysTotal,
      progressPercent: newProgressPercent,
      daysLeftText: newDaysLeftText
    };
  });
};

/**
 * 加载今日待办
 * @param {boolean} forceRefresh 是否强制刷新
 * @param {Object} pageInstance 页面实例（用于设置数据）
 * @returns {Promise<Array>} 待办列表
 */
const loadTodayTodos = async (forceRefresh = false, pageInstance = null) => {
  try {
    const todayKey = dateUtil.getTodayKey();
    
    // 先显示缓存数据（如果有且非强制刷新）
    if (!forceRefresh && todoCache.hasCache()) {
      const cachedTodos = await storage.getTodayTodos();
      const processedTodos = processTodosWithProgress(cachedTodos, todayKey);
      if (pageInstance) {
        pageInstance.setData({ todos: processedTodos, expandedTodoId: null });
      }
    }
    
    // 显示加载提示
    if (forceRefresh || !todoCache.hasCache()) {
      wx.showLoading({ title: '加载中' });
    }
    
    // 获取数据
    const todos = await storage.getTodayTodos(forceRefresh);
    const processedTodos = processTodosWithProgress(todos, todayKey);
    
    if (pageInstance) {
      pageInstance.setData({ todos: processedTodos, expandedTodoId: null });
    }
    
    return processedTodos;
  } catch (e) {
    console.error('[DataLoader] loadTodayTodos error:', e);
    throw e;
  } finally {
    if (forceRefresh || !todoCache.hasCache()) {
      wx.hideLoading();
    }
  }
};

/**
 * 加载指定月份数据
 * @param {number} year 年份
 * @param {number} month 月份
 * @param {boolean} forceRefresh 是否强制刷新
 * @param {Object} pageInstance 页面实例
 * @returns {Promise<Array>} 待办列表
 */
const loadMonthTodos = async (year, month, forceRefresh = false, pageInstance = null) => {
  try {
    // 先显示缓存数据
    if (!forceRefresh && todoCache.hasCache()) {
      const cachedTodos = await storage.getTodosByMonth(year, month);
      if (pageInstance && pageInstance.processMonthData) {
        pageInstance.processMonthData(cachedTodos);
      }
    }
    
    // 显示加载提示
    if (forceRefresh || !todoCache.hasCache()) {
      wx.showLoading({ title: '加载中' });
    }
    
    // 获取数据
    const todos = await storage.getTodosByMonth(year, month, forceRefresh);
    
    if (pageInstance && pageInstance.processMonthData) {
      pageInstance.processMonthData(todos);
    }
    
    return todos;
  } catch (e) {
    console.error('[DataLoader] loadMonthTodos error:', e);
    throw e;
  } finally {
    if (forceRefresh || !todoCache.hasCache()) {
      wx.hideLoading();
    }
  }
};

/**
 * 加载指定日期待办
 * @param {string} dateKey 日期key
 * @param {Array} allTodos 所有待办（可选，不传则从缓存获取）
 * @returns {Array} 该日期的待办列表
 */
const loadTodosForDate = (dateKey, allTodos = null) => {
  const todos = allTodos || todoCache.getCache() || [];
  
  return todos.filter(todo => {
    // 不限日期的待办
    if (todo.permanent && todo.startDate <= dateKey) return true;
    // 日期范围内的待办
    if (!todo.permanent && todo.startDate <= dateKey && todo.endDate >= dateKey) return true;
    return false;
  }).filter(todo => {
    // 已完成或放弃的待办，只在 endDate 当天显示
    if (!todo.completed && !todo.abandoned) return true;
    return todo.endDate === dateKey;
  }).sort((a, b) => {
    // 按重要性降序，未完成的在前
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.abandoned !== b.abandoned) return a.abandoned ? 1 : -1;
    return b.importance - a.importance;
  });
};

/**
 * 清空页面数据
 * @param {Object} pageInstance 页面实例
 * @param {string} pageType 页面类型 ('index' | 'history')
 */
const clearPageData = (pageInstance, pageType = 'index') => {
  if (!pageInstance) return;
  
  if (pageType === 'index') {
    pageInstance.setData({
      todos: [],
      expandedTodoId: null
    });
  } else if (pageType === 'history') {
    pageInstance.setData({
      monthTodos: {},
      dateStats: {},
      allMonthTodos: [],
      selectedDateTodos: [],
      calendarWeeks: []
    });
    if (pageInstance.renderCalendar) {
      pageInstance.renderCalendar();
    }
  }
};

module.exports = {
  loadTodayTodos,
  loadMonthTodos,
  loadTodosForDate,
  clearPageData,
  processTodosWithProgress
};
