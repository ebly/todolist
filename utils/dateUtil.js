/**
 * 日期工具函数
 */

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEK_DAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 获取日期Key (YYYY-MM-DD)
 * @param {Date} date 日期对象，默认为今天
 * @returns {string} 日期Key
 */
const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 获取今天的日期Key
 * @returns {string} 今天的日期Key
 */
const getTodayKey = () => getDateKey();

/**
 * 格式化日期显示
 * @param {Date} date 日期对象
 * @returns {Object} 格式化后的日期信息
 */
const formatDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDay = WEEK_DAYS[date.getDay()];
  const dateKey = getDateKey(date);
  
  return {
    year,
    month,
    day,
    weekDay,
    dateKey,
    fullDate: `${year}年${month}月${day}日 ${weekDay}`,
    shortDate: `${month}月${day}日`
  };
};

/**
 * 获取月份天数
 * @param {number} year 年份
 * @param {number} month 月份 (1-12)
 * @returns {number} 该月天数
 */
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

/**
 * 获取月份第一天是星期几
 * @param {number} year 年份
 * @param {number} month 月份 (1-12)
 * @returns {number} 星期几 (0-6)
 */
const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month - 1, 1).getDay();
};

/**
 * 生成日历数据
 * @param {number} year 年份
 * @param {number} month 月份
 * @param {string} todayKey 今天的日期Key
 * @param {Object} dateStats 日期统计信息
 * @returns {Array} 日历周数据
 */
const generateCalendar = (year, month, todayKey, dateStats = {}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const days = [];
  let emptyIndex = 0;
  
  // 填充月初空白
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ empty: true, dateKey: `empty-start-${i}` });
  }
  
  // 填充日期
  for (let i = 1; i <= daysInMonth; i++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isToday = dateKey === todayKey;
    const isPast = dateKey < todayKey;
    const isFuture = dateKey > todayKey;
    
    days.push({
      day: i,
      dateKey,
      dayOfWeek: new Date(year, month - 1, i).getDay(),
      isToday,
      isPast,
      isFuture,
      empty: false,
      ...dateStats[dateKey]
    });
  }
  
  // 按周分组
  const weeks = [];
  let currentWeek = [];
  
  for (let i = 0; i < days.length; i++) {
    currentWeek.push(days[i]);
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek });
      currentWeek = [];
    }
  }
  
  // 填充月末空白
  if (currentWeek.length > 0) {
    let endEmptyIndex = 0;
    while (currentWeek.length < 7) {
      currentWeek.push({ empty: true, dateKey: `empty-end-${endEmptyIndex++}` });
    }
    weeks.push({ days: currentWeek });
  }
  
  return weeks;
};

/**
 * 比较两个日期Key
 * @param {string} key1 日期Key1
 * @param {string} key2 日期Key2
 * @returns {number} -1: key1<key2, 0: 相等, 1: key1>key2
 */
const compareDateKey = (key1, key2) => {
  if (key1 < key2) return -1;
  if (key1 > key2) return 1;
  return 0;
};

module.exports = {
  WEEK_DAYS,
  WEEK_DAYS_SHORT,
  getDateKey,
  getTodayKey,
  formatDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  generateCalendar,
  compareDateKey
};
