const dateUtil = require('./dateUtil.js');

// 延迟获取数据库实例，确保云开发已初始化
const getDB = () => {
  if (!wx.cloud) {
    throw new Error('云开发未启用');
  }
  return wx.cloud.database();
};

/**
 * 添加待办 - 直接操作后台（使用 startDate 和 endDate）
 * @param {Object} todoData 待办数据
 * @param {string} startDate 开始日期Key
 * @param {string} endDate 结束日期Key
 * @returns {Promise<Object|null>} 添加的待办
 */
const addTodo = async (todoData, startDate, endDate) => {
  const startKey = startDate || dateUtil.getTodayKey();
  const endKey = endDate || startKey;
  const content = typeof todoData === 'string' ? todoData : todoData.content;
  const title = typeof todoData === 'object' ? todoData.title : '';

  if (!title || !title.trim()) {
    return null;
  }

  const newTodo = {
    title: title.trim(),
    content: content ? content.trim() : '',
    importance: typeof todoData === 'object' ? (todoData.importance || 2) : 2,
    permanent: typeof todoData === 'object' ? (todoData.permanent || false) : false,
    completed: false,
    startDate: startKey,
    endDate: endKey,
    createdAt: new Date()
  };

  try {
    const db = getDB();
    const result = await db.collection('todos').add({
      data: newTodo
    });
    return { ...newTodo, _id: result._id };
  } catch (e) {
    console.error('[Storage] addTodo error:', e);
    return null;
  }
};

/**
 * 获取指定日期的待办（包含日期范围内的待办和不限日期的待办）
 * @param {string} dateKey 日期Key
 * @returns {Promise<Array>} 待办列表
 */
const getTodosByDate = async (dateKey) => {
  try {
    const db = getDB();
    
    // 查询不限日期的待办（从今天开始出现）
    // 条件：permanent=true 且 startDate <= dateKey
    // 已完成/放弃的待办只在 endDate 当天显示
    const permanentRes = await db.collection('todos').where({
      permanent: true,
      startDate: db.command.lte(dateKey)
    }).get();
    
    // 查询日期范围内的待办（普通待办）
    // 条件：startDate <= dateKey <= endDate
    const rangeRes = await db.collection('todos').where({
      permanent: false,
      startDate: db.command.lte(dateKey),
      endDate: db.command.gte(dateKey)
    }).get();
    
    // 合并结果并过滤：已完成或放弃的待办，只在 endDate 当天显示
    const allTodos = [...(permanentRes.data || []), ...(rangeRes.data || [])];
    return allTodos.filter(todo => {
      // 如果待办未完成且未放弃，正常显示
      if (!todo.completed && !todo.abandoned) {
        return true;
      }
      // 如果已完成或放弃，只在 endDate 当天显示
      return todo.endDate === dateKey;
    });
  } catch (e) {
    console.error('[Storage] getTodosByDate error:', e);
    return [];
  }
};

/**
 * 获取今日待办
 * @returns {Promise<Array>} 待办列表
 */
const getTodayTodos = async () => {
  const todayKey = dateUtil.getTodayKey();
  return getTodosByDate(todayKey);
};

/**
 * 获取指定月份的待办（包含日期范围与月份有交集的待办和不限日期的待办）
 * @param {number} year 年份
 * @param {number} month 月份
 * @returns {Promise<Array>} 待办列表
 */
const getTodosByMonth = async (year, month) => {
  try {
    const monthStr = String(month).padStart(2, '0');
    const monthStart = `${year}-${monthStr}-01`;
    const monthEnd = `${year}-${monthStr}-31`;

    const db = getDB();
    
    // 查询不限日期的待办（startDate <= monthEnd，即从该月开始或之前开始的）
    const permanentRes = await db.collection('todos').where({
      permanent: true,
      startDate: db.command.lte(monthEnd)
    }).get();
    
    // 查询日期范围与月份有交集的待办
    // 条件：startDate <= monthEnd 且 endDate >= monthStart
    const rangeRes = await db.collection('todos').where({
      permanent: false,
      startDate: db.command.lte(monthEnd),
      endDate: db.command.gte(monthStart)
    }).get();
    
    // 合并结果
    return [...(permanentRes.data || []), ...(rangeRes.data || [])];
  } catch (e) {
    console.error('[Storage] getTodosByMonth error:', e);
    return [];
  }
};

/**
 * 切换待办完成状态 - 直接操作后台
 * @param {string} id 待办ID
 * @returns {Promise<boolean|null>} 新的完成状态
 */
const toggleTodo = async (id) => {
  try {
    const db = getDB();
    const todo = await db.collection('todos').doc(id).get();
    if (!todo.data) return null;

    const newCompleted = !todo.data.completed;
    const updateData = {
      completed: newCompleted,
      abandoned: false
    };
    
    // 如果标记为完成，将截止日期改为今天，并将不限日期改为有限
    if (newCompleted) {
      updateData.endDate = dateUtil.getTodayKey();
      updateData.permanent = false;
    }
    
    await db.collection('todos').doc(id).update({
      data: updateData
    });
    return newCompleted;
  } catch (e) {
    console.error('[Storage] toggleTodo error:', e);
    return null;
  }
};

/**
 * 删除待办 - 直接操作后台（删除单条记录）
 * @param {string} id 待办ID
 * @returns {Promise<boolean>} 是否成功
 */
const deleteTodo = async (id) => {
  try {
    const db = getDB();
    await db.collection('todos').doc(id).remove();
    return true;
  } catch (e) {
    console.error('[Storage] deleteTodo error:', e);
    return false;
  }
};

/**
 * 放弃待办 - 将待办标记为放弃状态
 * @param {string} id 待办ID
 * @returns {Promise<boolean>} 是否成功
 */
const abandonTodo = async (id) => {
  try {
    const db = getDB();
    const todayKey = dateUtil.getTodayKey();
    
    await db.collection('todos').doc(id).update({
      data: {
        abandoned: true,
        completed: false,
        endDate: todayKey,
        permanent: false
      }
    });
    return true;
  } catch (e) {
    console.error('[Storage] abandonTodo error:', e);
    return false;
  }
};

/**
 * 清除所有待办数据 - 直接操作后台
 * @returns {Promise<boolean>} 是否成功
 */
const clearAllTodos = async () => {
  try {
    const db = getDB();
    const res = await db.collection('todos').get();
    const todos = res.data || [];
    
    // 批量删除所有待办
    for (const todo of todos) {
      await db.collection('todos').doc(todo._id).remove();
    }
    
    console.log('[Storage] clearAllTodos: deleted', todos.length, 'todos');
    return true;
  } catch (e) {
    console.error('[Storage] clearAllTodos error:', e);
    return false;
  }
};

/**
 * 更新待办 - 直接操作后台
 * @param {string} id 待办ID
 * @param {Object} updateData 更新数据
 * @returns {Promise<boolean>} 是否成功
 */
const updateTodo = async (id, updateData) => {
  try {
    const db = getDB();
    await db.collection('todos').doc(id).update({
      data: updateData
    });
    return true;
  } catch (e) {
    console.error('[Storage] updateTodo error:', e);
    return false;
  }
};

/**
 * 获取日期统计 - 直接操作后台
 * @returns {Promise<Object>} 日期统计
 */
const getDateStats = async () => {
  try {
    const db = getDB();
    const res = await db.collection('todos').get();
    const todos = res.data || [];

    const stats = {};
    todos.forEach(todo => {
      if (todo.permanent) {
        // 不限日期的待办，不统计到具体日期
        return;
      }
      
      // 对于日期范围的待办，统计到 startDate
      const key = todo.startDate;
      if (!stats[key]) {
        stats[key] = { hasIncomplete: false, hasCompleted: false };
      }
      if (todo.completed) {
        stats[key].hasCompleted = true;
      } else {
        stats[key].hasIncomplete = true;
      }
    });
    return stats;
  } catch (e) {
    console.error('[Storage] getDateStats error:', e);
    return {};
  }
};

/**
 * 获取指定月份的日期统计
 * @param {number} year 年份
 * @param {number} month 月份
 * @returns {Promise<Object>} 日期统计
 */
const getDateStatsByMonth = async (year, month) => {
  try {
    const monthStr = String(month).padStart(2, '0');
    const monthStart = `${year}-${monthStr}-01`;
    const monthEnd = `${year}-${monthStr}-31`;

    const db = getDB();
    
    // 获取该月份相关的所有待办
    const res = await db.collection('todos').where({
      permanent: false,
      startDate: db.command.lte(monthEnd),
      endDate: db.command.gte(monthStart)
    }).get();
    
    const todos = res.data || [];

    const stats = {};
    todos.forEach(todo => {
      const key = todo.startDate;
      if (!stats[key]) {
        stats[key] = { hasIncomplete: false, hasCompleted: false };
      }
      if (todo.completed) {
        stats[key].hasCompleted = true;
      } else {
        stats[key].hasIncomplete = true;
      }
    });
    return stats;
  } catch (e) {
    console.error('[Storage] getDateStatsByMonth error:', e);
    return {};
  }
};

module.exports = {
  addTodo,
  getTodosByDate,
  getTodayTodos,
  getTodosByMonth,
  toggleTodo,
  deleteTodo,
  abandonTodo,
  clearAllTodos,
  updateTodo,
  getDateStats,
  getDateStatsByMonth
};
