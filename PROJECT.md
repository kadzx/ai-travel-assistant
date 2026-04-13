# AI Travel Assistant — 项目说明

> 本文件供 AI 助手快速了解项目结构，避免每次全量读取代码。

## 1. 项目概述

毕业设计项目：AI 旅行助手，支持多语言（中/英）。用户可浏览旅行笔记、AI 对话规划行程、发布内容、社交互动。

## 2. 技术栈

| 层 | 技术 |
|---|---|
| 前端 | uni-app (DCloudio v3.0.0) + Vue 3.4 + TypeScript |
| 状态管理 | Pinia 2.1.7 + pinia-plugin-persistedstate |
| UI 库 | uview-plus 3.7 |
| CSS | UnoCSS + Sass |
| 构建 | Vite 5.2 |
| 后端 | Express 4.18 (Node.js) |
| 数据库 | MySQL (mysql2 + Sequelize 6) |
| 认证 | JWT + bcryptjs |
| AI | OpenAI SDK v6.25 |
| 爬虫 | Python + Playwright + PyMySQL |

## 3. 目录结构

```
e:\毕设重置\
├── frontend/                          # 前端 uni-app
│   └── src/
│       ├── pages/                     # 15 个页面（见下方路由表）
│       ├── components/                # 公共组件
│       │   ├── custom-tabbar/         # 自定义底部导航
│       │   ├── masonry-item/          # 瀑布流卡片
│       │   └── route-popup/           # 路线弹窗
│       ├── stores/                    # Pinia 状态
│       │   ├── index.ts              # pinia 实例 + persist 插件
│       │   ├── user.ts              # 用户状态
│       │   ├── chat.ts              # AI 对话状态
│       │   ├── itinerary.ts         # 行程状态
│       │   └── counter.ts           # 计数器（示例）
│       ├── api/                       # 接口封装
│       │   ├── user.ts / chat.ts / post.ts / itinerary.ts
│       │   ├── social.ts / follow.ts / notification.ts
│       │   └── map.ts
│       ├── utils/
│       │   ├── request.ts           # uni.request 封装
│       │   └── imageProxy.ts        # 图片代理
│       ├── main.ts                   # 入口（pinia + uview-plus）
│       ├── App.vue                   # 全局样式（奶油极简风）
│       └── pages.json                # 路由 + tabBar 配置
│
├── backend/                           # 后端 Express
│   └── src/
│       ├── config/                   # 数据库配置等
│       ├── controllers/              # 14 个控制器
│       ├── middlewares/              # 中间件
│       │   ├── authMiddleware.js    # JWT 鉴权
│       │   ├── adminMiddleware.js   # 管理员权限
│       │   ├── asyncHandler.js      # 异步错误捕获
│       │   └── i18n.js             # 国际化中间件（已有）
│       ├── models/                   # 12 个 Sequelize 模型
│       ├── routes/                   # 13 个路由模块
│       ├── services/                 # 8 个业务服务
│       ├── utils/                    # 工具函数
│       └── logs/                     # 日志目录
│
└── xhs-crawler/                       # 小红书爬虫 (Python)
    ├── crawl_spider.py               # 中文爬虫
    ├── crawl_spider_en.py            # 英文爬虫
    ├── db_import.py / db_import_en.py # 数据入库
    ├── download_xhs_images.py        # 图片下载
    └── config.py / requirements.txt
```

## 4. 前端路由 (pages.json)

| 路径 | 说明 | 导航栏 |
|------|------|--------|
| `pages/welcome/welcome` | 欢迎页 | 默认 |
| `pages/login/login` | 登录/注册 | 默认 |
| `pages/index/index` | 首页/瀑布流 (Tab) | custom |
| `pages/post/create` | 发布笔记 (Tab) | custom |
| `pages/chat/chat` | AI 对话 (Tab) | custom |
| `pages/user/profile` | 个人中心 (Tab) | custom |
| `pages/post/detail` | 笔记详情 | custom |
| `pages/user/edit` | 编辑资料 | custom |
| `pages/user/home` | 用户主页 | custom |
| `pages/search/search` | 搜索 | custom |
| `pages/notification/list` | 通知 | custom |
| `pages/itinerary/create` | 创建行程 | 默认 |
| `pages/itinerary/list` | 我的行程 | custom |
| `pages/itinerary/detail` | 行程详情 | custom |
| `pages/common/chooseLocation` | 选择位置 | custom |

TabBar: 行程(首页) → 发布 → AI 对话 → 我

## 5. 后端路由模块

| 文件 | 前缀 | 说明 |
|------|------|------|
| authRoutes.js | /api/auth | 注册/登录/token |
| userRoutes.js | /api/users | 用户信息 CRUD |
| postRoutes.js | /api/posts | 帖子 CRUD + 列表 |
| chatRoutes.js | /api/chat | AI 对话 |
| itineraryRoutes.js | /api/itineraries | 行程 CRUD |
| socialRoutes.js | /api/social | 点赞/评论/收藏 |
| followRoutes.js | /api/follow | 关注/粉丝 |
| notificationRoutes.js | /api/notifications | 通知 |
| spotRoutes.js | /api/spots | 景点 |
| mapRoutes.js | /api/map | 地图相关 |
| uploadRoutes.js | /api/upload | 文件上传 |
| adminRoutes.js | /api/admin | 管理后台 |

## 6. 数据模型

| 模型 | 表名 | 关键字段 |
|------|------|----------|
| User | users | id, username, email, password, role, status, nickname, avatar, bio |
| Post | posts | id, user_id, title, content, images(JSON), location, lat/lng, tags(JSON), type, privacy, **lang** |
| Comment | comments | id, user_id, target_id, target_type(多态), parent_id, content |
| Like | likes | id, user_id, target_id, target_type(多态) |
| Favorite | favorites | id, user_id, folder_id, target_id, target_type |
| FavoriteFolder | favorite_folders | id, user_id, name |
| Follow | follows | id, follower_id, following_id |
| Notification | notifications | id, user_id, actor_id, type, content |
| Itinerary | itineraries | id, user_id, title, ... |
| ChatMessage | chat_messages | id, user_id, role, content |
| ScenicSpot | scenic_spots | id, name, ... |

## 7. 国际化 (i18n) 现状

### 已完成
- `vue-i18n ^9.1.9` 已安装并配置（`src/locale/index.ts`）
- 翻译文件：`src/locale/zh.ts` + `src/locale/en.ts`
- 语言选择页 `pages/lang/choose`（首次进入时展示）
- 设置页 `pages/settings/index`（语言切换入口，从个人中心进入）
- App.vue onLaunch 判断是否已选语言，已选则跳过语言页
- 主要页面文案已替换为 `$t()` 调用（welcome、login、index、profile、tabbar）
- `request.ts` 中的错误提示已国际化
- Post 模型有 `lang` 字段（默认 'zh'，支持 'zh'/'en'）
- User 模型有 `preferred_lang` 字段（默认 'zh'）
- 后端 `middlewares/i18n.js` 已实现语言检测（query param / Accept-Language header）
- 后端帖子列表接口已支持按 `lang` query param 过滤
- 前端首页 loadData 自动带 `lang` 参数请求对应语言帖子
- 前端发帖时自动带当前语言标记
- 爬虫已有英文版本 `crawl_spider_en.py` + `db_import_en.py`
- `custom-tabbar` 组件已国际化

### 待优化（非必须）
- 其余次要页面（search、notification、itinerary/detail 等）文案可进一步替换
- 切换语言后可考虑整体 reLaunch 刷新以确保所有组件重新渲染
- 后端错误消息国际化（目前仅前端展示层国际化）

## 8. 设计风格

- 主题：奶油极简风
- 主色：`#E8A87C`（焦糖橙）
- 背景：`#FFF8F0`（奶油白）
- 辅色：`#D4A574`(焦糖)、`#95B8A3`(抹茶绿)、`#B8C5D6`(雾蓝)
- 圆角卡片 + 毛玻璃效果 + blob 装饰

## 9. 关键入口文件

| 用途 | 路径 |
|------|------|
| 前端入口 | `frontend/src/main.ts` |
| 前端全局样式 | `frontend/src/App.vue` |
| 前端路由配置 | `frontend/src/pages.json` |
| 后端入口 | `backend/app.js` |
| 后端数据库配置 | `backend/src/config/database.js` |
| 模型关联 | `backend/src/models/index.js` |
| 路由注册 | `backend/src/routes/index.js` |
