# 项目开发规范与稳定性指南 (Project Rules & Stability Guide)

## 1. 技术栈规范 (Technology Stack)

本项目后端采用以下核心技术栈，开发过程中需严格遵守：

*   **Runtime**: Node.js (LTS版本)
*   **Framework**: Express.js (^4.18.2)
*   **Database**: MySQL (8.0+)
*   **ORM**: Sequelize (^6.35.1)
*   **Authentication**: JSON Web Tokens (JWT) + bcryptjs
*   **Validation**: Joi (请求参数校验)
*   **Logging**: Winston (日志记录)
*   **Environment**: dotenv (环境变量管理)

## 2. 稳定性与代码质量原则 (Stability & Code Quality Rules)

为了确保后端服务的稳定性、可维护性和健壮性，所有代码提交必须遵循以下原则：

### 2.1 错误处理 (Error Handling)
*   **全局捕获**: 所有 Controller 方法必须使用 `asyncHandler` 包装，确保异步错误被 Express 全局错误处理中间件捕获，严禁出现未捕获的 Promise Rejection。
*   **标准响应**: 所有错误响应必须通过 `ResponseUtil.fail()` 返回，确保前端接收到的错误格式统一 (`code`, `msg`, `data`)。
*   **错误码**: 使用 `src/utils/errorCodes.js` 中定义的错误码，禁止在代码中硬编码错误消息字符串。

### 2.2 数据一致性与完整性 (Data Integrity)
*   **事务管理**: 涉及多表更新的操作（如：创建行程同时创建关联的景点），必须使用 Sequelize Transaction (`sequelize.transaction`) 确保原子性。
*   **外键约束**: 数据库层面必须设置外键约束（Foreign Keys），防止出现孤儿数据。
*   **软删除**: 对于重要数据（如用户、订单），建议使用 Sequelize 的 `paranoid: true` 开启软删除，而非物理删除。

### 2.3 安全性 (Security)
*   **参数校验**: 所有接口入口（Router/Controller）必须使用 Joi 或手动逻辑进行严格的参数校验，拒绝非法输入。
*   **敏感信息**: 密码必须加盐哈希存储（bcrypt），禁止明文存储。日志中严禁打印密码、Token 等敏感信息。
*   **SQL 注入防护**: 必须使用 Sequelize 的模型方法或参数化查询，严禁拼接 SQL 字符串。

### 2.4 代码结构与风格 (Code Structure)
*   **分层架构**: 严格遵循 `Controller` -> `Service` -> `Model` 的分层模式。业务逻辑尽量下沉到 Service 层，Controller 只负责参数解析和响应格式化。
*   **配置分离**: 数据库连接、密钥、第三方 API Key 等配置信息必须放入 `.env` 文件，并通过 `src/config` 模块读取。
*   **注释**: 复杂业务逻辑必须编写清晰的注释，说明“为什么这样做”而非“在做什么”。

### 2.5 日志与监控 (Logging)
*   **关键路径**: 在用户登录、支付、核心业务操作成功/失败时，必须记录 Info/Error 级别日志。
*   **排查信息**: Error 日志需包含 `req.id` (如有)、用户 ID、错误堆栈 (Stack Trace) 及关键参数，便于生产环境排查。

---

## 3. 开发流程 (Development Workflow)
1.  **新建功能**: 先设计 Model 和 Route，再实现 Service 和 Controller。
2.  **测试**: 完成接口后，必须使用 Postman 或单元测试验证正常路径和异常路径（参数错误、权限不足等）。
3.  **提交**: 代码提交前需运行 Linter 检查，确保无语法错误和风格问题。
