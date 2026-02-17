/**
 * 待办事项页面公共行为混入
 */

const storage = require('./storage.js');

/**
 * 获取ID的通用方法
 * @param {Object} e 事件对象
 * @param {string} methodName 方法名（用于错误日志）
 * @returns {string|null} ID或null
 */
const extractId = (e, methodName) => {
  const id = e.detail?.id || e.target?.dataset?.id || e.currentTarget?.dataset?.id;
  if (!id) {
    console.error(`${methodName}: id is empty`, e);
    wx.showToast({
      title: '操作失败：ID为空',
      icon: 'none'
    });
  }
  return id;
};

/**
 * 切换待办展开状态
 * @param {Object} pageInstance 页面实例
 * @param {Object} e 事件对象
 */
const toggleExpand = (pageInstance, e) => {
  const id = e.currentTarget.dataset.id;
  const { expandedTodoId } = pageInstance.data;
  pageInstance.setData({
    expandedTodoId: expandedTodoId === id ? null : id
  });
};

/**
 * 切换待办完成状态
 * @param {Object} pageInstance 页面实例
 * @param {string} id 待办ID
 * @param {Function} callback 回调函数（重新加载数据）
 */
const toggleTodoComplete = async (pageInstance, id, callback) => {
  if (!id) return;
  
  try {
    await storage.toggleTodo(id);
    if (callback) callback();
    wx.showToast({
      title: '已完成',
      icon: 'success',
      duration: 1500
    });
  } catch (err) {
    console.error('toggleTodo error:', err);
    wx.showToast({
      title: '操作失败',
      icon: 'none'
    });
  }
};

/**
 * 删除待办（带确认）
 * @param {Object} pageInstance 页面实例
 * @param {string} id 待办ID
 * @param {string} title 确认标题
 * @param {string} content 确认内容
 * @param {string} successText 成功提示
 * @param {Function} callback 回调函数（重新加载数据）
 */
const deleteTodoWithConfirm = (pageInstance, id, title, content, successText, callback) => {
  if (!id) return;
  
  wx.showModal({
    title: title || '确认删除',
    content: content || '确定要删除这条待办吗？',
    confirmColor: '#1989fa',
    cancelColor: '#323233',
    success: (res) => {
      if (res.confirm) {
        storage.deleteTodo(id)
          .then(() => {
            if (callback) callback();
            wx.showToast({
              title: successText || '已删除',
              icon: 'success',
              duration: 1500
            });
          })
          .catch((err) => {
            console.error('deleteTodo error:', err);
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            });
          });
      }
    }
  });
};

/**
 * 显示加载中
 * @param {string} title 提示文字
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({ title, mask: true });
};

/**
 * 隐藏加载中
 */
const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示成功提示
 * @param {string} title 提示文字
 * @param {number} duration 持续时间
 */
const showSuccess = (title, duration = 1500) => {
  wx.showToast({ title, icon: 'success', duration });
};

/**
 * 显示失败提示
 * @param {string} title 提示文字
 */
const showError = (title) => {
  wx.showToast({ title, icon: 'none' });
};

module.exports = {
  extractId,
  toggleExpand,
  toggleTodoComplete,
  deleteTodoWithConfirm,
  showLoading,
  hideLoading,
  showSuccess,
  showError
};
