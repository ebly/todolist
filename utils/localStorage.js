/**
 * 本地存储管理模块
 * 实现本地优先的数据存储策略
 */

const dateUtil = require('./dateUtil.js');

// 存储键名
const STORAGE_KEYS = {
  TODOS: 'todos_local',           // 待办数据
  LAST_SYNC_DATE: 'last_sync_date', // 上次同步日期
  LAST_SYNC_TIME: 'last_sync_time', // 上次同步时间戳
  PENDING_SYNC: 'pending_sync'      // 待同步的操作队列
};

/**
 * 获取本地存储的日期
 * @returns {string} 日期Key
 */
const getLocalDate = () => {
  try {
    return wx.getStorageSync(STORAGE_KEYS.LAST_SYNC_DATE) || '';
  } catch (e) {
    return '';
  }
};

/**
 * 设置本地存储日期
 * @param {string} dateKey 日期Key
 */
const setLocalDate = (dateKey) => {
  try {
    wx.setStorageSync(STORAGE_KEYS.LAST_SYNC_DATE, dateKey);
  } catch (e) {
    console.error('setLocalDate error:', e);
  }
};

/**
 * 检查是否是新的一天
 * @returns {boolean} 是否是新的一天
 */
const isNewDay = () => {
  const localDate = getLocalDate();
  const today = dateUtil.getTodayKey();
  return localDate !== today;
};

/**
 * 获取本地待办数据
 * @returns {Array} 待办列表
 */
const getLocalTodos = () => {
  try {
    return wx.getStorageSync(STORAGE_KEYS.TODOS) || [];
  } catch (e) {
    console.error('getLocalTodos error:', e);
    return [];
  }
};

/**
 * 保存待办数据到本地
 * @param {Array} todos 待办列表
 */
const saveLocalTodos = (todos) => {
  try {
    wx.setStorageSync(STORAGE_KEYS.TODOS, todos);
    setLocalDate(dateUtil.getTodayKey());
  } catch (e) {
    console.error('saveLocalTodos error:', e);
  }
};

/**
 * 获取待同步的操作队列
 * @returns {Array} 操作队列
 */
const getPendingSync = () => {
  try {
    return wx.getStorageSync(STORAGE_KEYS.PENDING_SYNC) || [];
  } catch (e) {
    return [];
  }
};

/**
 * 添加待同步操作
 * @param {string} operation 操作类型: add/update/delete/toggle
 * @param {Object} data 操作数据
 */
const addPendingSync = (operation, data) => {
  try {
    const pending = getPendingSync();
    pending.push({
      operation,
      data,
      timestamp: Date.now()
    });
    wx.setStorageSync(STORAGE_KEYS.PENDING_SYNC, pending);
  } catch (e) {
    console.error('addPendingSync error:', e);
  }
};

/**
 * 清除待同步队列
 */
const clearPendingSync = () => {
  try {
    wx.setStorageSync(STORAGE_KEYS.PENDING_SYNC, []);
  } catch (e) {
    console.error('clearPendingSync error:', e);
  }
};

/**
 * 根据ID查找待办
 * @param {Array} todos 待办列表
 * @param {string} id 待办ID
 * @returns {Object|null} 待办对象
 */
const findTodoById = (todos, id) => {
  return todos.find(todo => todo._id === id) || null;
};

/**
 * 添加待办到本地
 * @param {Object} todoData 待办数据
 * @returns {Object} 新增的待办
 */
const addTodoLocal = (todoData) => {
  const todos = getLocalTodos();
  const newTodo = {
    ...todoData,
    _id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    isLocal: true,  // 标记为本地数据
    createdAt: new Date().toISOString()
  };
  
  todos.unshift(newTodo);
  saveLocalTodos(todos);
  addPendingSync('add', newTodo);
  
  return newTodo;
};

/**
 * 更新本地待办
 * @param {string} id 待办ID
 * @param {Object} updateData 更新数据
 * @returns {boolean} 是否成功
 */
const updateTodoLocal = (id, updateData) => {
  const todos = getLocalTodos();
  const index = todos.findIndex(todo => todo._id === id);
  
  if (index === -1) return false;
  
  todos[index] = { ...todos[index], ...updateData, updatedAt: new Date().toISOString() };
  saveLocalTodos(todos);
  addPendingSync('update', { id, data: updateData });
  
  return true;
};

/**
 * 切换待办完成状态
 * @param {string} id 待办ID
 * @returns {boolean|null} 新的完成状态
 */
const toggleTodoLocal = (id) => {
  const todos = getLocalTodos();
  const todo = findTodoById(todos, id);
  
  if (!todo) return null;
  
  const newCompleted = !todo.completed;
  updateTodoLocal(id, { completed: newCompleted });
  addPendingSync('toggle', { id, completed: newCompleted });
  
  return newCompleted;
};

/**
 * 删除本地待办
 * @param {string} id 待办ID
 * @returns {boolean} 是否成功
 */
const deleteTodoLocal = (id) => {
  const todos = getLocalTodos();
  const filtered = todos.filter(todo => todo._id !== id);
  
  if (filtered.length === todos.length) return false;
  
  saveLocalTodos(filtered);
  addPendingSync('delete', { id });
  
  return true;
};

/**
 * 获取今日待办（本地）
 * @returns {Array} 今日待办列表
 */
const getTodayTodosLocal = () => {
  const todos = getLocalTodos();
  const todayKey = dateUtil.getTodayKey();
  
  return todos.filter(todo => {
    // 永久待办
    if (todo.permanent) return true;
    // 截止日期小于等于今天的
    if (todo.dateKey && todo.dateKey <= todayKey) return true;
    // 没有日期Key的（兼容旧数据）
    if (!todo.dateKey) return true;
    return false;
  }).sort((a, b) => {
    // 按创建时间倒序
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
};

/**
 * 获取指定日期的待办（本地）
 * @param {string} dateKey 日期Key
 * @returns {Array} 待办列表
 */
const getTodosByDateLocal = (dateKey) => {
  const todos = getLocalTodos();
  return todos.filter(todo => todo.dateKey === dateKey)
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
};

/**
 * 获取日期统计（本地）
 * @returns {Object} 日期统计
 */
const getDateStatsLocal = () => {
  const todos = getLocalTodos();
  const stats = {};
  
  todos.forEach(todo => {
    const dateKey = todo.dateKey;
    if (!dateKey) return;
    
    if (!stats[dateKey]) {
      stats[dateKey] = {
        total: 0,
        completed: 0,
        incomplete: 0,
        hasCompleted: false,
        hasIncomplete: false
      };
    }
    stats[dateKey].total++;
    if (todo.completed) {
      stats[dateKey].completed++;
      stats[dateKey].hasCompleted = true;
    } else {
      stats[dateKey].incomplete++;
      stats[dateKey].hasIncomplete = true;
    }
  });
  
  return stats;
};

/**
 * 从数据库同步数据到本地（每日首次打开时调用）
 * @param {Array} dbTodos 数据库中的待办数据
 */
const syncFromDatabase = (dbTodos) => {
  // 合并数据库数据和本地数据
  const localTodos = getLocalTodos();
  const todoMap = new Map();
  
  // 先添加数据库数据
  dbTodos.forEach(todo => {
    todoMap.set(todo._id, { ...todo, isLocal: false });
  });
  
  // 再添加本地数据（本地数据优先，覆盖数据库的）
  localTodos.forEach(todo => {
    if (todo.isLocal || todoMap.has(todo._id)) {
      // 如果是本地新增的数据，保留
      // 如果是已同步的数据，使用本地版本
      todoMap.set(todo._id, todo);
    }
  });
  
  const mergedTodos = Array.from(todoMap.values());
  saveLocalTodos(mergedTodos);
  
  return mergedTodos;
};

/**
 * 清空本地数据（新的一天开始时调用）
 */
const clearLocalData = () => {
  try {
    wx.removeStorageSync(STORAGE_KEYS.TODOS);
    wx.removeStorageSync(STORAGE_KEYS.PENDING_SYNC);
    setLocalDate('');
  } catch (e) {
    console.error('clearLocalData error:', e);
  }
};

// 导出模块
module.exports = {
  // 日期检查
  isNewDay,
  getLocalDate,
  
  // 本地CRUD操作
  getLocalTodos,
  saveLocalTodos,
  addTodoLocal,
  updateTodoLocal,
  toggleTodoLocal,
  deleteTodoLocal,
  
  // 查询操作
  getTodayTodosLocal,
  getTodosByDateLocal,
  getDateStatsLocal,
  
  // 同步相关
  syncFromDatabase,
  getPendingSync,
  clearPendingSync,
  addPendingSync,
  clearLocalData
};
