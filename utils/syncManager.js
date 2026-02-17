/**
 * 数据同步管理模块
 * 负责本地存储和云端数据库的同步
 */

const localStorage = require('./localStorage.js');
const dateUtil = require('./dateUtil.js');

// 同步状态
let isSyncing = false;

// 延迟获取数据库实例，确保云开发已初始化
const getDB = () => {
  if (!wx.cloud) {
    throw new Error('云开发未启用');
  }
  return wx.cloud.database();
};

/**
 * 初始化数据（每日首次打开时调用）
 * @returns {Promise<boolean>} 是否成功
 */
const initData = async () => {
  try {
    // 检查是否是新的一天
    if (localStorage.isNewDay()) {
      console.log('[SyncManager] New day detected, syncing from cloud...');
      
      // 清空旧数据
      localStorage.clearLocalData();
      
      // 从云端获取所有数据
      const dbTodos = await fetchAllFromCloud();
      
      // 同步到本地
      localStorage.syncFromDatabase(dbTodos);
      
      console.log('[SyncManager] Sync completed,', dbTodos.length, 'todos loaded');
    } else {
      console.log('[SyncManager] Same day, using local data');
    }
    
    return true;
  } catch (e) {
    console.error('[SyncManager] initData error:', e);
    return false;
  }
};

/**
 * 从云端获取所有待办
 * @returns {Promise<Array>} 待办列表
 */
const fetchAllFromCloud = async () => {
  try {
    const db = getDB();
    const res = await db.collection('todos').get();
    return res.data || [];
  } catch (e) {
    console.error('[SyncManager] fetchAllFromCloud error:', e);
    return [];
  }
};

/**
 * 同步待办到云端（后台异步执行）
 * @param {Object} todo 待办数据
 * @returns {Promise<Object|null>} 云端返回的待办
 */
const syncTodoToCloud = async (todo) => {
  try {
    const db = getDB();
    // 移除本地标记
    const { isLocal, _id, ...todoData } = todo;
    
    const result = await db.collection('todos').add({
      data: {
        ...todoData,
        createdAt: db.serverDate()
      }
    });
    
    // 返回新的云端ID
    return {
      ...todo,
      _id: result._id,
      isLocal: false
    };
  } catch (e) {
    console.error('[SyncManager] syncTodoToCloud error:', e);
    return null;
  }
};

/**
 * 执行待同步队列
 * @returns {Promise<boolean>} 是否成功
 */
const executePendingSync = async () => {
  if (isSyncing) return false;
  
  isSyncing = true;
  
  try {
    const pending = localStorage.getPendingSync();
    
    if (pending.length === 0) {
      isSyncing = false;
      return true;
    }
    
    console.log('[SyncManager] Executing pending sync,', pending.length, 'operations');
    
    const failed = [];
    
    for (const item of pending) {
      try {
        switch (item.operation) {
          case 'add':
            await syncAddToCloud(item.data);
            break;
          case 'update':
            await syncUpdateToCloud(item.data);
            break;
          case 'toggle':
            await syncToggleToCloud(item.data);
            break;
          case 'delete':
            await syncDeleteToCloud(item.data);
            break;
        }
      } catch (e) {
        console.error('[SyncManager] Sync operation failed:', item.operation, e);
        failed.push(item);
      }
    }
    
    // 保存失败的操作，下次继续同步
    if (failed.length > 0) {
      wx.setStorageSync('pending_sync', failed);
    } else {
      localStorage.clearPendingSync();
    }
    
    console.log('[SyncManager] Sync completed,', pending.length - failed.length, 'succeeded,', failed.length, 'failed');
    
    return failed.length === 0;
  } catch (e) {
    console.error('[SyncManager] executePendingSync error:', e);
    return false;
  } finally {
    isSyncing = false;
  }
};

/**
 * 同步新增操作到云端
 * @param {Object} todo 待办数据
 */
const syncAddToCloud = async (todo) => {
  // 如果是本地ID，需要新增到云端
  if (todo._id && todo._id.startsWith('local_')) {
    const cloudTodo = await syncTodoToCloud(todo);
    if (cloudTodo) {
      // 更新本地数据中的ID
      updateLocalId(todo._id, cloudTodo._id);
    }
  }
};

/**
 * 同步更新操作到云端
 * @param {Object} data 更新数据
 */
const syncUpdateToCloud = async (data) => {
  const { id, data: updateData } = data;
  
  // 跳过本地ID（等待新增同步完成）
  if (id && id.startsWith('local_')) return;
  
  try {
    const db = getDB();
    await db.collection('todos').doc(id).update({
      data: updateData
    });
  } catch (e) {
    console.error('[SyncManager] syncUpdateToCloud error:', e);
    throw e;
  }
};

/**
 * 同步切换完成状态到云端
 * @param {Object} data 切换数据
 */
const syncToggleToCloud = async (data) => {
  const { id, completed } = data;
  
  // 跳过本地ID
  if (id && id.startsWith('local_')) return;
  
  try {
    const db = getDB();
    await db.collection('todos').doc(id).update({
      data: { completed }
    });
  } catch (e) {
    console.error('[SyncManager] syncToggleToCloud error:', e);
    throw e;
  }
};

/**
 * 同步删除操作到云端
 * @param {Object} data 删除数据
 */
const syncDeleteToCloud = async (data) => {
  const { id } = data;
  
  // 跳过本地ID（云端不存在）
  if (id && id.startsWith('local_')) return;
  
  try {
    const db = getDB();
    await db.collection('todos').doc(id).remove();
  } catch (e) {
    // 如果记录不存在，忽略错误
    if (e.message && e.message.includes('document not found')) {
      return;
    }
    console.error('[SyncManager] syncDeleteToCloud error:', e);
    throw e;
  }
};

/**
 * 更新本地数据中的ID（新增同步后）
 * @param {string} oldId 旧ID
 * @param {string} newId 新ID
 */
const updateLocalId = (oldId, newId) => {
  const todos = localStorage.getLocalTodos();
  const todo = todos.find(t => t._id === oldId);
  
  if (todo) {
    todo._id = newId;
    todo.isLocal = false;
    localStorage.saveLocalTodos(todos);
  }
};

/**
 * 后台同步（应用进入后台时调用）
 */
const backgroundSync = async () => {
  console.log('[SyncManager] Background sync started');
  await executePendingSync();
  console.log('[SyncManager] Background sync completed');
};

/**
 * 强制同步所有数据（手动触发）
 * @returns {Promise<boolean>} 是否成功
 */
const forceSync = async () => {
  console.log('[SyncManager] Force sync started');
  
  // 先执行待同步队列
  await executePendingSync();
  
  // 重新从云端获取数据
  const dbTodos = await fetchAllFromCloud();
  localStorage.syncFromDatabase(dbTodos);
  
  console.log('[SyncManager] Force sync completed');
  return true;
};

module.exports = {
  initData,
  executePendingSync,
  backgroundSync,
  forceSync,
  syncTodoToCloud
};
