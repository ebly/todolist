const dateUtil = require('./dateUtil.js');

// 延迟获取数据库实例，确保云开发已初始化
const getDB = () => {
  if (!wx.cloud) {
    throw new Error('云开发未启用');
  }
  return wx.cloud.database();
};

/**
 * 添加待办
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
    const result = await db.collection('todos').add({ data: newTodo });
    return { ...newTodo, _id: result._id };
  } catch (e) {
    console.error('[Storage] addTodo error:', e);
    return null;
  }
};

/**
 * 获取指定日期的待办（合并为单次查询）
 * @param {string} dateKey 日期Key
 * @returns {Promise<Array>} 待办列表
 */
const getTodosByDate = async (dateKey) => {
  try {
    const db = getDB();
    
    // 使用 or 条件合并查询，减少请求次数
    const res = await db.collection('todos').where(
      db.command.or([
        // 不限日期的待办
        {
          permanent: true,
          startDate: db.command.lte(dateKey)
        },
        // 日期范围内的待办
        {
          permanent: false,
          startDate: db.command.lte(dateKey),
          endDate: db.command.gte(dateKey)
        }
      ])
    ).get();
    
    // 过滤：已完成或放弃的待办，只在 endDate 当天显示
    return (res.data || []).filter(todo => {
      if (!todo.completed && !todo.abandoned) return true;
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
  return getTodosByDate(dateUtil.getTodayKey());
};

/**
 * 获取指定月份的待办（合并为单次查询）
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
    
    // 使用 or 条件合并查询
    const res = await db.collection('todos').where(
      db.command.or([
        // 不限日期的待办
        {
          permanent: true,
          startDate: db.command.lte(monthEnd)
        },
        // 日期范围与月份有交集的待办
        {
          permanent: false,
          startDate: db.command.lte(monthEnd),
          endDate: db.command.gte(monthStart)
        }
      ])
    ).get();
    
    return res.data || [];
  } catch (e) {
    console.error('[Storage] getTodosByMonth error:', e);
    return [];
  }
};

/**
 * 切换待办完成状态
 * @param {string} id 待办ID
 * @returns {Promise<boolean|null>} 新的完成状态
 */
const toggleTodo = async (id) => {
  try {
    const db = getDB();
    const todo = await db.collection('todos').doc(id).get();
    if (!todo.data) return null;

    const newCompleted = !todo.data.completed;
    const updateData = { completed: newCompleted, abandoned: false };
    
    // 如果标记为完成，更新截止日期
    if (newCompleted) {
      updateData.endDate = dateUtil.getTodayKey();
      updateData.permanent = false;
    }
    
    await db.collection('todos').doc(id).update({ data: updateData });
    return newCompleted;
  } catch (e) {
    console.error('[Storage] toggleTodo error:', e);
    return null;
  }
};

/**
 * 删除待办
 * @param {string} id 待办ID
 * @returns {Promise<boolean>} 是否成功
 */
const deleteTodo = async (id) => {
  try {
    await getDB().collection('todos').doc(id).remove();
    return true;
  } catch (e) {
    console.error('[Storage] deleteTodo error:', e);
    return false;
  }
};

/**
 * 放弃待办
 * @param {string} id 待办ID
 * @returns {Promise<boolean>} 是否成功
 */
const abandonTodo = async (id) => {
  try {
    await getDB().collection('todos').doc(id).update({
      data: {
        abandoned: true,
        completed: false,
        endDate: dateUtil.getTodayKey(),
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
 * 清除所有待办数据
 * @returns {Promise<boolean>} 是否成功
 */
const clearAllTodos = async () => {
  try {
    const db = getDB();
    const { data } = await db.collection('todos').limit(100).get();
    
    // 批量删除
    await Promise.all(data.map(todo => 
      db.collection('todos').doc(todo._id).remove()
    ));
    
    console.log('[Storage] clearAllTodos: deleted', data.length, 'todos');
    return true;
  } catch (e) {
    console.error('[Storage] clearAllTodos error:', e);
    return false;
  }
};

/**
 * 更新待办
 * @param {string} id 待办ID
 * @param {Object} updateData 更新数据
 * @returns {Promise<boolean>} 是否成功
 */
const updateTodo = async (id, updateData) => {
  try {
    await getDB().collection('todos').doc(id).update({ data: updateData });
    return true;
  } catch (e) {
    console.error('[Storage] updateTodo error:', e);
    return false;
  }
};

/**
 * 获取日期统计（优化：复用 getTodosByMonth）
 * @param {number} year 年份
 * @param {number} month 月份
 * @returns {Promise<Object>} 日期统计
 */
const getDateStats = async (year, month) => {
  try {
    const todos = await getTodosByMonth(year, month);
    const stats = {};
    
    todos.forEach(todo => {
      if (todo.permanent) return;
      
      const key = todo.startDate;
      if (!stats[key]) {
        stats[key] = { total: 0, completed: 0, hasIncomplete: false, hasCompleted: false };
      }
      stats[key].total++;
      if (todo.completed) {
        stats[key].completed++;
        stats[key].hasCompleted = true;
      } else if (!todo.abandoned) {
        stats[key].hasIncomplete = true;
      }
    });
    
    // 计算 hasIncomplete（有未完成）
    Object.values(stats).forEach(stat => {
      stat.hasIncomplete = stat.completed < stat.total;
    });
    
    return stats;
  } catch (e) {
    console.error('[Storage] getDateStats error:', e);
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
  getDateStats
};
