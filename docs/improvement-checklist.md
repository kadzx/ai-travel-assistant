# 项目改进清单 — AI 旅行助手（社交 + 行程规划）

> 基于项目全面审查生成，按优先级和模块分类。
> 状态标记：⬜ 待处理 | 🔧 进行中 | ✅ 已完成 | ⏭️ 暂缓

---

## 一、代码质量与工程规范

### 1.1 清理脚手架残留
- ✅ 删除未使用的 `stores/counter.ts`

### 1.2 环境变量管理
- ✅ `request.ts` 的 `BASE_URL` 改为 Vite 环境变量
- ✅ 新增 `.env.development` / `.env.production` + `env.d.ts` 类型声明
- ✅ `create.vue` 中 `uploadFilePromise` 硬编码 URL 也已修复

### 1.3 SSE 流式解析代码复用
- ✅ 抽取 `utils/sse.ts` 公共工具函数，`api/chat.ts` 和 `api/post.ts` 统一调用

### 1.4 Store 与 API 层职责清理
- ✅ 清理 `stores/chat.ts` 中废弃的非流式方法

### 1.5 后端数据迁移规范化
- ⬜ `app.js` 中 raw SQL migration 迁移到 Sequelize Migration

### 1.6 输入验证
- ⬜ 后端 `joi` 系统性使用

### 1.7 后端服务拆分
- ⬜ `cozeWorkflowService.js` 拆分

---

## 二、性能优化

### 2.1 头像存储优化
- ✅ 前端改为 `uni.uploadFile` 上传到 `/api/upload`，拿到 URL 后保存
- ✅ 后端 User 模型 avatar 字段从 LONGTEXT 改为 STRING(500)

### 2.2 地图服务并发优化
- ✅ `enrichNodesWithCoords` 改为 `Promise.allSettled` 并发（每批 5 个限流）

### 2.3 首页信息流优化
- ✅ masonry-item 图片添加 `lazy-load` 属性
- ✅ 首页首次加载添加瀑布流骨架屏（奶油风脉冲动画）

### 2.4 请求缓存
- ✅ 新增 `utils/cache.ts` 内存缓存工具（TTL + withCache 包装器）
- ✅ `getPublicProfile` 添加 2 分钟缓存

---

## 三、用户体验（UX）改进

### 3.1 全局状态反馈
- ✅ 新增 `components/page-state/page-state.vue` 统一组件（loading/error/empty 三合一，奶油风）

### 3.2 发布页 TabBar 问题
- ✅ 发布页从 tabBar list 中移除，改为 `navigateTo` 跳转
- ✅ 自定义 tabbar 的发布按钮改为 `navigateTo`（发布完可返回）

### 3.3 下拉刷新与上拉加载
- ✅ 通知列表添加 `refresher-enabled` 下拉刷新
- ✅ 行程列表添加 `onPullDownRefresh` + pages.json 启用下拉刷新

### 3.4 行程体验增强
- ✅ 行程详情页添加"📤 分享"按钮（复制行程摘要到剪贴板）
- ✅ 行程节点备注/预算/时间段功能已存在（原有）
- ✅ 多日视图已存在（原有 Day tabs）

### 3.5 评论楼中楼（社交增强）
- ✅ 后端 `addComment` 支持 `replyToUserId`，回复通知
- ✅ 后端 `getComments` 返回子评论 + `replyCount` + `replyToUser`
- ✅ 新增 `getReplies` 接口
- ✅ 前端楼中楼 UI + 回复弹窗 + 展开更多回复

### 3.6 搜索体验
- ✅ 搜索历史、热门搜索、推荐目的地功能已存在（原有）

---

## 四、功能完善

### 4.1 用户系统
- ✅ 忘记密码/重置密码功能（前后端完整实现）
- ✅ 后端 `verifyEmail` + `resetPassword` 接口
- ✅ 前端 `reset-password.vue` 两步式重置页面（奶油风）
- ✅ 登录页"忘记密码?"链接已接通

### 4.2 内容安全
- ✅ 后端 Report 模型 + `submitReport` 接口
- ✅ 前端帖子详情页"···"更多菜单 → 举报（5 种原因可选）
- ✅ 防重复举报



### 4.5 草稿箱
- ✅ 发布页自动保存草稿到本地存储（2 秒防抖）
- ✅ 进入发布页时检测草稿并提示恢复
- ✅ 发布成功后自动清除草稿
- ✅ 超过 7 天的草稿自动过期

---

## 五、安全与稳定性

### 5.3 错误处理
- ✅ 后端 500 错误友好提示："服务器开小差了，请稍后再试"
- ✅ 请求超时 15s + 超时专属提示
- ✅ 网络错误与超时区分处理

### 5.1 认证安全
- ⬜ Token 刷新机制

### 5.2 接口安全
- ⬜ API 请求频率限制

---

## 六、部署与运维（暂缓）

- ⬜ 前端 Dockerfile + Nginx
- ⬜ 日志监控
- ⬜ CI/CD

---

## 完成统计

| 模块 | 完成 | 总计 |
|------|------|------|
| 一、代码质量 | 4/7 | 57% |
| 二、性能优化 | 4/4 | 100% |
| 三、UX 改进 | 6/6 | 100% |
| 四、功能完善 | 3/5 | 60% |
| 五、安全稳定 | 1/3 | 33% |
| **总计** | **18/25** | **72%** |
