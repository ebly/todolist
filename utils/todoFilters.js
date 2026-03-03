/**
 * 任务数据过滤工具
 * 提取 index 和 history 页面的公共过滤逻辑
 */

/**
 * 过滤今天的任务（用于任务列表页）
 * @param {Array} todos 任务列表
 * @param {string} dateKey 日期键值 (YYYY-MM-DD)
 * @returns {Array} 过滤后的任务列表
 */
const filterTodayTodos = (todos, dateKey) => {
  return todos.filter(todo => {
    const inDateRange = todo.permanent
      ? (dateKey >= todo.startDate)
      : (dateKey >= todo.startDate && dateKey <= todo.endDate);

    return inDateRange;
  });
};

/**
 * 过滤指定月份的任务（用于日历页）
 * @param {Array} todos 任务列表
 * @param {number} year 年份
 * @param {number} month 月份
 * @returns {Array} 过滤后的任务列表
 */
const filterMonthTodos = (todos, year, month) => {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthStart = `${monthStr}-01`;
  const monthEnd = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  return (todos || []).filter(todo => {
    const startInMonth = todo.startDate.startsWith(monthStr);
    const endInMonth = todo.endDate.startsWith(monthStr);
    const spansMonth = todo.startDate <= monthStart && todo.endDate >= monthEnd;
    const overlapsMonth = todo.startDate <= monthEnd && todo.endDate >= monthStart;

    return startInMonth || endInMonth || spansMonth || overlapsMonth;
  });
};

/**
 * 过滤指定日期的任务
 * @param {Array} todos 任务列表
 * @param {string} dateKey 日期键值 (YYYY-MM-DD)
 * @returns {Array} 过滤后的任务列表
 */
const filterTodosByDate = (todos, dateKey) => {
  return (todos || []).filter(todo => {
    const inDateRange = todo.permanent
      ? (dateKey >= todo.startDate)
      : (dateKey >= todo.startDate && dateKey <= todo.endDate);

    return inDateRange;
  });
};

/**
 * 计算日期统计信息
 * @param {Array} todos 任务列表
 * @returns {Object} 日期统计对象 { 'YYYY-MM-DD': { total, completed } }
 */
const calculateDateStats = (todos) => {
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
};

/**
 * 按日期分组任务
 * @param {Array} todos 任务列表
 * @returns {Object} 分组后的任务对象 { 'YYYY-MM-DD': [todo1, todo2] }
 */
const groupTodosByDate = (todos) => {
  return (todos || []).reduce((acc, todo) => {
    const key = todo.startDate;
    if (!acc[key]) acc[key] = [];
    acc[key].push(todo);
    return acc;
  }, {});
};

/**
 * 按优先级分组任务
 * @param {Array} todos 任务列表
 * @returns {Object} { highPriorityTodos, normalPriorityTodos }
 */
const groupTodosByPriority = (todos) => {
  return {
    highPriorityTodos: todos.filter(t => t.importance === 3),
    normalPriorityTodos: todos.filter(t => t.importance !== 3)
  };
};

/**
 * 按状态过滤任务
 * @param {Array} todos 任务列表
 * @param {string} filter 过滤条件: 'all' | 'active' | 'completed'
 * @returns {Array} 过滤后的任务列表
 */
const filterTodosByStatus = (todos, filter) => {
  if (filter === 'active') {
    return todos.filter(t => !t.completed);
  } else if (filter === 'completed') {
    return todos.filter(t => t.completed);
  }
  return todos;
};

module.exports = {
  filterTodayTodos,
  filterMonthTodos,
  filterTodosByDate,
  calculateDateStats,
  groupTodosByDate,
  groupTodosByPriority,
  filterTodosByStatus
};
