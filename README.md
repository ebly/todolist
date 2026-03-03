# Daily Todo - 待办事项小程序

一个简洁、高效的微信小程序待办事项管理应用，支持任务创建、日历视图、完成状态追踪等功能。

## 项目概述

- **项目名称**: Daily Todo (划掉)
- **版本**: 1.0.0
- **技术栈**: 微信小程序 + 微信云开发 + Vant Weapp UI 组件库
- **开发语言**: JavaScript

## 功能特性

### 核心功能
- ✅ 任务管理（增删改查）
- ✅ 日历视图查看任务分布
- ✅ 任务完成状态追踪（划掉效果）
- ✅ 任务优先级设置（高/普通）
- ✅ 永久任务和临时任务支持
- ✅ 任务放弃功能
- ✅ 本地缓存 + 云端同步

### 用户体验
- 🎨 简洁清新的界面设计
- ⚡ 快速响应的交互体验
- 📱 适配各种屏幕尺寸
- 🔄 智能缓存策略，减少网络请求
- 💾 离线可用，自动同步

## 项目结构

```
todolist/
├── app.js                 # 小程序入口
├── app.json               # 全局配置
├── app.wxss               # 全局样式
├── sitemap.json           # 站点地图
├── package.json           # 项目依赖
│
├── pages/                 # 页面目录
│   ├── index/             # 任务列表页
│   │   ├── index.js
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   └── index.json
│   ├── history/           # 日历视图页
│   │   ├── history.js
│   │   ├── history.wxml
│   │   ├── history.wxss
│   │   └── history.json
│   └── profile/           # 个人中心页
│       ├── profile.js
│       ├── profile.wxml
│       ├── profile.wxss
│       └── profile.json
│
├── utils/                 # 工具函数目录
│   ├── auth.js            # 用户认证
│   ├── storage.js         # 云存储操作
│   ├── todoCache.js       # 任务缓存管理
│   ├── dateUtil.js        # 日期工具
│   ├── dataLoader.js      # 数据加载处理
│   ├── pageManager.js     # 页面管理
│   ├── pageMixin.js       # 页面公共逻辑
│   ├── todoFilters.js     # 任务过滤工具
│   ├── loadingManager.js  # Loading 状态管理
│   ├── errorHandler.js    # 错误处理
│   ├── dateChecker.js     # 日期检查
│   ├── localStorage.js    # 本地存储
│   ├── syncManager.js     # 同步管理
│   └── todoMixin.js       # 任务相关 Mixin
│
├── components/            # 自定义组件
│   ├── toast-feedback/    # 反馈提示组件
│   └── empty-state/       # 空状态组件
│
├── cloudfunctions/        # 云函数
│   └── getOpenId/         # 获取用户 OpenID
│       └── index.js
│
├── miniprogram_npm/       # npm 构建产物
│   └── @vant/weapp/       # Vant 组件库
│
└── assets/                # 静态资源
    └── tab/               # Tab 图标
        ├── todo.png
        ├── todo-active.png
        ├── calendar.png
        ├── calendar-active.png
        ├── profile.png
        └── profile-active.png
```

## 技术架构

### 1. 数据流架构

```
用户操作 → 更新云端 → 更新缓存 → 刷新页面
```

### 2. 缓存策略

- **首次加载**: 从云端获取数据，存入缓存
- **后续访问**: 优先使用缓存，减少网络请求
- **数据更新**: 先更新云端，成功后更新缓存
- **缓存结构**: 纯任务数组 `[]`，空数组也是有效缓存

### 3. 核心工具类

#### todoCache.js - 缓存管理
```javascript
// 主要方法
- getCache()          // 获取缓存（undefined=无缓存, []=空缓存）
- setCache(todos)     // 设置缓存
- addToCache(todo)    // 添加任务到缓存
- updateInCache(id, data)   // 更新缓存中的任务
- removeFromCache(id)       // 从缓存删除任务
- toggleCacheTodo(id, status)  // 切换完成状态
- abandonCacheTodo(id)      // 放弃任务
- clearCache()        // 清空缓存
- needRefresh()       // 判断是否需要从云端刷新
```

#### loadingManager.js - Loading 管理
```javascript
// 使用方式
const result = await loadingManager.withLoading(
  () => storage.xxx(),  // 异步操作
  '加载中'              // Loading 文字
);
```

#### pageMixin.js - 页面公共逻辑
```javascript
// 提供方法
- checkAuth()              // 检查登录状态
- handleOnShow()           // 通用 onShow 处理
- handleInitialLoad()      // 通用首次加载
- refreshPageFromCache()   // 从缓存刷新页面
- syncToIndexPage(todos)   // 同步到首页
- afterOperation()         // 操作后统一处理
```

#### todoFilters.js - 任务过滤
```javascript
// 过滤方法
- filterTodayTodos(todos, dateKey)      // 筛选今日任务
- filterMonthTodos(todos, year, month)  // 筛选月度任务
- filterTodosByDate(todos, dateKey)     // 按日期筛选
- filterTodosByStatus(todos, filter)    // 按状态筛选
- calculateDateStats(todos)             // 计算日期统计
- groupTodosByDate(todos)               // 按日期分组
- groupTodosByPriority(todos)           // 按优先级分组
```

## 页面说明

### 1. 任务列表页 (pages/index/index)

**功能**: 展示今日任务列表，支持筛选和操作

**主要功能**:
- 显示今日待办任务
- 筛选标签：全部/进行中/已完成
- 任务完成/取消完成
- 任务放弃
- 任务编辑
- 查看任务详情

**数据结构**:
```javascript
{
  todos: [],              // 所有任务
  filteredTodos: [],      // 筛选后的任务
  highPriorityTodos: [],  // 高优先级任务
  normalPriorityTodos: [], // 普通优先级任务
  activeFilter: 'all',    // 当前筛选：all/active/completed
  currentDateKey: '',     // 当前日期
  // ... 其他 UI 状态
}
```

### 2. 日历视图页 (pages/history/history)

**功能**: 日历形式展示任务分布

**主要功能**:
- 月度日历展示
- 日期任务统计
- 按日期查看任务
- 添加/编辑任务
- 删除任务
- 清除所有数据

**数据结构**:
```javascript
{
  currentYear: 2026,
  currentMonth: 3,
  selectedDate: '2026-03-03',
  monthTodos: {},         // 按日期分组的任务
  dateStats: {},          // 日期统计 {date: {total, completed}}
  allMonthTodos: [],      // 当月所有任务
  // ... 其他 UI 状态
}
```

### 3. 个人中心页 (pages/profile/profile)

**功能**: 用户信息和个人设置

**主要功能**:
- 用户登录/登出
- 个人信息展示
- 设置选项

## 数据模型

### 任务数据结构 (Todo)

```javascript
{
  _id: 'xxx',              // 云端唯一ID
  _openid: 'xxx',          // 用户OpenID
  title: '任务标题',        // 任务标题
  content: '任务内容',      // 任务内容（可选）
  startDate: '2026-03-03', // 开始日期
  endDate: '2026-03-03',   // 结束日期
  permanent: false,        // 是否永久任务
  importance: 2,           // 优先级：2=普通, 3=高
  completed: '',           // 完成状态：''=未完成, 'done'=已完成, 'abandoned'=已放弃
  progress: 0,             // 完成进度（百分比）
  createTime: Date,        // 创建时间
  updateTime: Date         // 更新时间
}
```

### 优先级说明

- `importance: 3` - 高优先级（红色标记）
- `importance: 2` - 普通优先级（默认）

### 完成状态

- `completed: ''` - 未完成
- `completed: 'done'` - 已完成（显示划线）
- `completed: 'abandoned'` - 已放弃

## 开发规范

### 1. 代码风格

- 使用 ES6+ 语法
- 异步操作使用 async/await
- 统一使用单引号
- 缩进使用 2 个空格

### 2. 文件命名

- 页面目录：小写字母，多个单词用连字符
- JS 文件：驼峰命名
- 组件：小写字母，用连字符分隔

### 3. 注释规范

```javascript
/**
 * 函数说明
 * @param {string} param1 参数1说明
 * @param {number} param2 参数2说明
 * @returns {boolean} 返回值说明
 */
```

### 4. 错误处理

```javascript
try {
  const result = await someAsyncOperation();
  // 处理结果
} catch (error) {
  console.error('[Error] 操作失败:', error);
  wx.showToast({ title: '操作失败', icon: 'none' });
}
```

## 安装和运行

### 环境要求

- 微信开发者工具
- 微信云开发环境
- Node.js (用于构建 npm)

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd todolist
```

2. **安装依赖**
```bash
npm install
```

3. **构建 npm**
在微信开发者工具中：
- 点击菜单栏 `工具` → `构建 npm`

4. **配置云开发**
- 开通微信云开发
- 创建云数据库集合 `todos`
- 部署云函数 `getOpenId`

5. **运行项目**
- 使用微信开发者工具打开项目
- 点击 `编译` 按钮

## 云开发配置

### 数据库集合

**集合名称**: `todos`

**权限设置**:
```json
{
  "read": true,
  "write": "doc._openid == auth.openid"
}
```

**索引**:
- `_openid` (单字段索引)
- `startDate` (单字段索引)
- `endDate` (单字段索引)

### 云函数

**getOpenId**: 获取用户 OpenID

部署方式:
```bash
# 在微信开发者工具中
# 1. 右键 cloudfunctions/getOpenId 文件夹
# 2. 选择 "创建并部署：云端安装依赖"
```

## 性能优化

### 已实现的优化

1. **缓存策略优化**
   - 智能缓存刷新判断
   - 减少不必要的网络请求

2. **代码复用**
   - 提取公共逻辑到 Mixin
   - 统一工具函数

3. **Loading 管理**
   - 统一封装 Loading 状态
   - 支持并发请求计数

4. **数据过滤优化**
   - 提取公共过滤函数
   - 减少重复计算

5. **页面生命周期优化**
   - onLoad 和 onShow 职责分离
   - 避免重复数据加载

## 注意事项

1. **缓存机制**
   - 空数组 `[]` 是有效缓存
   - `undefined` 表示无缓存
   - 操作后自动更新缓存

2. **数据同步**
   - 所有操作先更新云端
   - 成功后更新本地缓存
   - 最后刷新页面显示

3. **登录状态**
   - 未登录时清空页面数据
   - 登录后自动加载数据

## 更新日志

### v1.0.1 (2026-03-04)
- **Bug 修复**
  - 修复 `pageMixin.syncToIndexPage` 调用时上下文错误导致的 TypeError
  - 修复 `history.js` 中 `filterMonthTodos` 等函数调用方式错误（应使用 `todoFilters.xxx` 而非 `this.xxx`）
  - 修复 `filterMonthTodos` 月份天数计算错误（原来硬编码为31天，现在动态计算）
  - 修复 `generateCalendar` 生成的空白格子 `dateKey` 重复问题（添加年月前缀确保唯一性）
  - 修复 `filterTodayTodos` 过滤掉已完成任务的问题（现在已完成/已放弃任务也会显示）
  - 优化 `van-swipe-cell` 组件的列表渲染结构，避免 wx:key 冲突

### v1.0.0
- 基础功能实现
- 任务增删改查
- 日历视图
- 缓存优化
- 代码重构

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交代码
4. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提交 Issue 或 Pull Request。
