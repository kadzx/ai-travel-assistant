# 后台管理面板 — 计划书

## 一、概述

为 AI 旅行助手搭建一个独立的 Web 后台管理面板，供管理员进行用户管理、内容审核、数据监控等操作。

## 二、技术选型

| 层级 | 方案 | 理由 |
|------|------|------|
| 框架 | Vue 3 + Vite | 与前端项目技术栈一致，降低维护成本 |
| UI 库 | Element Plus | 后台管理最成熟的 Vue3 组件库，表格/表单/图表开箱即用 |
| 路由 | Vue Router 4 | SPA 路由 |
| 状态 | Pinia | 管理员登录态 |
| 图表 | ECharts | 仪表盘数据可视化 |
| HTTP | Axios | 请求封装 |
| 部署 | 与后端同域 `/admin` 或独立端口 | 共用后端 API |

## 三、后端现状（已有）

已有 admin API（`/api/admin/*`），需 `admin` 角色 JWT 认证：

- `GET /dashboard` — 仪表盘统计（用户数、帖子数、评论数）
- `GET /users` — 用户列表（分页）
- `PUT /users/:id/status` — 修改用户状态/角色
- `GET /posts` — 帖子列表（分页）
- `DELETE /posts/:id` — 删除帖子
- `GET /comments` — 评论列表（分页）
- `DELETE /comments/:id` — 删除评论

## 四、需要新增的后端接口

| 接口 | 用途 |
|------|------|
| `GET /admin/reports` | 举报列表（分页，含举报者/被举报内容） |
| `PUT /admin/reports/:id` | 处理举报（resolved / dismissed） |
| `GET /admin/dashboard` 增强 | 新增：今日新增用户、今日新增帖子、举报待处理数、7日趋势数据 |
| `GET /admin/users` 增强 | 支持关键词搜索、状态筛选 |
| `GET /admin/posts` 增强 | 支持关键词搜索、用户筛选 |

## 五、前端页面规划

```
admin/
├── login.vue              # 管理员登录（复用 /api/auth/login）
├── layout.vue             # 侧边栏 + 顶栏布局
├── dashboard.vue          # 仪表盘（数据卡片 + 趋势图表）
├── users.vue              # 用户管理（表格 + 搜索 + 封禁/解封）
├── posts.vue              # 帖子管理（表格 + 搜索 + 删除 + 预览）
├── comments.vue           # 评论管理（表格 + 删除）
└── reports.vue            # 举报管理（表格 + 处理/驳回）
```

### 5.1 仪表盘 `dashboard.vue`
- 4 个数据卡片：总用户数、总帖子数、总评论数、待处理举报
- 折线图：近 7 天新增用户 / 新增帖子趋势
- 饼图：帖子类型分布

### 5.2 用户管理 `users.vue`
- 表格列：ID、头像、用户名、昵称、邮箱、角色、状态、注册时间
- 操作：封禁/解封、设为管理员/取消管理员
- 搜索：按用户名/邮箱模糊搜索

### 5.3 帖子管理 `posts.vue`
- 表格列：ID、标题、作者、类型、图片数、点赞数、评论数、发布时间
- 操作：查看详情（弹窗预览）、删除
- 搜索：按标题/作者搜索

### 5.4 评论管理 `comments.vue`
- 表格列：ID、内容（截断）、评论者、所属帖子、是否子评论、时间
- 操作：删除

### 5.5 举报管理 `reports.vue`
- 表格列：ID、举报者、被举报内容类型、原因、描述、状态、时间
- 操作：标记已处理 / 驳回、跳转查看被举报内容

## 六、项目结构

```
admin/                     # 独立项目，放在仓库根目录
├── index.html
├── package.json
├── vite.config.ts
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/index.ts
│   ├── stores/auth.ts
│   ├── utils/request.ts   # Axios 封装，带 JWT
│   ├── api/               # 接口层
│   │   ├── dashboard.ts
│   │   ├── users.ts
│   │   ├── posts.ts
│   │   ├── comments.ts
│   │   └── reports.ts
│   ├── layout/
│   │   └── AdminLayout.vue
│   └── views/
│       ├── Login.vue
│       ├── Dashboard.vue
│       ├── Users.vue
│       ├── Posts.vue
│       ├── Comments.vue
│       └── Reports.vue
```

## 七、实现步骤

| 步骤 | 内容 | 预计 |
|------|------|------|
| 1 | 后端：增强 dashboard 接口 + 新增 reports 接口 + users/posts 搜索 | 先做 |
| 2 | 前端：项目脚手架 + 路由 + Axios 封装 + 登录页 | 然后 |
| 3 | 前端：AdminLayout 侧边栏布局 | 然后 |
| 4 | 前端：Dashboard 仪表盘（卡片 + ECharts 图表） | 然后 |
| 5 | 前端：Users 用户管理页 | 然后 |
| 6 | 前端：Posts 帖子管理页 | 然后 |
| 7 | 前端：Comments 评论管理页 | 然后 |
| 8 | 前端：Reports 举报管理页 | 最后 |

## 八、设计风格

延续奶油风主色调：
- 主色：`#E8A87C`（暖橙）
- 背景：`#FFF8F0`（奶油白）
- 侧边栏：`#3D3028`（深棕）
- 卡片：白色圆角 + 柔和阴影
