# API Summary / 接口汇总

This document lists all available API endpoints for the Travel App backend.
本文档列出了旅游 App 后端所有可用的 API 接口。

**Base URL**: `/api` (Assumed / 假设)

## 1. Authentication (Auth) / 认证模块
| Method | Path | Description | 描述 |
| :--- | :--- | :--- | :--- |
| POST | `/auth/register` | Register a new user | 注册新用户 |
| POST | `/auth/login` | User login | 用户登录 |

## 2. Spot (Travel Destinations) / 景点模块
| Method | Path | Description | 描述 |
| :--- | :--- | :--- | :--- |
| POST | `/spots/` | Create a new spot | 创建新景点 |
| GET | `/spots/` | Get list of spots | 获取景点列表 |
| GET | `/spots/:id` | Get spot details by ID | 根据 ID 获取景点详情 |

## 3. Itinerary (Trip Planning) / 行程模块
**Note**: All routes require authentication. / 所有路由需要认证。
| Method | Path | Description | 描述 |
| :--- | :--- | :--- | :--- |
| POST | `/itineraries/generate` | AI Generate itinerary | AI 生成行程 |
| POST | `/itineraries/` | Create manual itinerary | 创建手动行程 |
| GET | `/itineraries/` | List user's itineraries | 获取用户行程列表 |
| GET | `/itineraries/:id` | Get itinerary details | 获取行程详情 |

## 4. Chat (AI Assistant) / 聊天模块
**Note**: All routes require authentication. / 所有路由需要认证。
| Method | Path | Description | 描述 |
| :--- | :--- | :--- | :--- |
| POST | `/chat/session` | Start a new chat session | 开始新聊天会话 |
| POST | `/chat/message` | Send a message to AI | 发送消息给 AI |
| GET | `/chat/history/:sessionId` | Get chat history | 获取聊天历史 |

## 5. Social (Interactions) / 社交模块
**Note**: All routes require authentication. / 所有路由需要认证。
| Method | Path | Description | 描述 |
| :--- | :--- | :--- | :--- |
| POST | `/social/like` | Toggle like on item | 点赞/取消点赞 |
| GET | `/social/like/status` | Check like status | 检查点赞状态 |
| POST | `/social/comment` | Add a comment | 添加评论 |
| DELETE | `/social/comment/:id` | Delete a comment | 删除评论 |
| GET | `/social/comments/:targetType/:targetId` | Get comments for item | 获取评论列表 |
| POST | `/social/favorite` | Toggle favorite | 收藏/取消收藏 |
| GET | `/social/favorites` | Get user favorites | 获取用户收藏列表 |
| POST | `/social/favorite/folder` | Create favorite folder | 创建收藏夹 |
| GET | `/social/favorite/folders` | Get favorite folders | 获取收藏夹列表 |

## 6. User (Profile) / 用户模块
**Note**: All routes require authentication. / 所有路由需要认证。
| Method | Path | Description | 描述 |
| :--- | :--- | :--- | :--- |
| GET | `/user/profile` | Get current user profile | 获取当前用户个人资料 |
| PUT | `/user/profile` | Update user profile | 更新用户个人资料 |
| GET | `/user/activities` | Get user activities | 获取用户动态 |

## 7. Admin (Management) / 管理后台
**Note**: Requires Admin role. / 需要管理员权限。
| Method | Path | Description | 描述 |
| :--- | :--- | :--- | :--- |
| GET | `/admin/dashboard` | Get dashboard statistics | 获取仪表盘统计数据 |
| GET | `/admin/users` | List all users | 获取所有用户列表 |
| PUT | `/admin/users/:id/status` | Update user status | 更新用户状态 |
| GET | `/admin/posts` | List all posts/content | 获取所有帖子/内容 |
| DELETE | `/admin/posts/:id` | Delete a post | 删除帖子 |
| GET | `/admin/comments` | List all comments | 获取所有评论 |
| DELETE | `/admin/comments/:id` | Delete a comment | 删除评论 |
