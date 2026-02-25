const dateUtil = require('./dateUtil.js');

const getDB = () => {
  if (!wx.cloud) {
    throw new Error('云开发未启用');
  }
  return wx.cloud.database();
};

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
    abandoned: false,
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

const getTodosByDate = async (dateKey) => {
  try {
    const db = getDB();
    
    const res = await db.collection('todos').where(
      db.command.or([
        {
          permanent: true,
          startDate: db.command.lte(dateKey)
        },
        {
          permanent: false,
          startDate: db.command.lte(dateKey),
          endDate: db.command.gte(dateKey)
        }
      ])
    ).get();
    
    return (res.data || []).filter(todo => {
      if (!todo.completed && !todo.abandoned) return true;
      return todo.endDate === dateKey;
    });
  } catch (e) {
    console.error('[Storage] getTodosByDate error:', e);
    return [];
  }
};

const getTodayTodos = async () => {
  return getTodosByDate(dateUtil.getTodayKey());
};

const getTodosByMonth = async (year, month) => {
  try {
    const monthStr = String(month).padStart(2, '0');
    const monthStart = `${year}-${monthStr}-01`;
    const monthEnd = `${year}-${monthStr}-31`;
    const db = getDB();
    
    const res = await db.collection('todos').where(
      db.command.or([
        {
          permanent: true,
          startDate: db.command.lte(monthEnd)
        },
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

const toggleTodo = async (id) => {
  try {
    const db = getDB();
    const todo = await db.collection('todos').doc(id).get();
    if (!todo.data) return null;

    const newCompleted = !todo.data.completed;
    const updateData = { completed: newCompleted, abandoned: false };
    
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

const deleteTodo = async (id) => {
  try {
    await getDB().collection('todos').doc(id).remove();
    return true;
  } catch (e) {
    console.error('[Storage] deleteTodo error:', e);
    return false;
  }
};

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

const clearAllTodos = async () => {
  try {
    const db = getDB();
    const { data } = await db.collection('todos').limit(100).get();
    
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

const updateTodo = async (id, updateData) => {
  try {
    await getDB().collection('todos').doc(id).update({ data: updateData });
    return true;
  } catch (e) {
    console.error('[Storage] updateTodo error:', e);
    return false;
  }
};

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
    
    Object.values(stats).forEach(stat => {
      stat.hasIncomplete = stat.completed < stat.total;
    });
    
    return stats;
  } catch (e) {
    console.error('[Storage] getDateStats error:', e);
    return {};
  }
};

const getAllTodos = async () => {
  try {
    const db = getDB();
    const { data: todos } = await db.collection('todos').get();
    return todos || [];
  } catch (e) {
    console.error('[Storage] getAllTodos error:', e);
    return [];
  }
};

const getTodoStats = async () => {
  try {
    const db = wx.cloud.database();
    
    const { data: todos } = await db.collection('todos').where({
      abandoned: false
    }).get();
    
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const pending = total - completed;
    
    return { total, completed, pending };
  } catch (e) {
    console.error('[Storage] getTodoStats error:', e);
    return { total: 0, completed: 0, pending: 0 };
  }
};

module.exports = {
  addTodo,
  getTodosByDate,
  getTodayTodos,
  getTodosByMonth,
  getAllTodos,
  toggleTodo,
  deleteTodo,
  abandonTodo,
  clearAllTodos,
  updateTodo,
  getDateStats,
  getTodoStats
};
