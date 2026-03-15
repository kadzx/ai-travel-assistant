# Coze 工作流接入计划

本文档说明如何将已部署的 Coze 站点工作流（`stream_run`）接入项目，实现聊天对话与行程生成（含流式返回）。请求/响应格式以 [Coze工作流请求与响应格式.md](./Coze工作流请求与响应格式.md) 为准。

---

## 一、Coze 站点 API 与我们的约定之间的映射

### 1.1 Coze 站点 stream_run 请求体（参考你提供的示例）

```json
{
  "content": {
    "query": {
      "prompt": [
        { "type": "text", "content": { "text": "<这里放我们约定格式的 JSON 字符串>" } }
      ]
    }
  },
  "type": "query",
  "session_id": "<会话 ID，用我们自己的 chat sessionId>",
  "project_id": "<工作流所在项目 ID>"
}
```

- **鉴权**：Header `Authorization: Bearer <COZE_SITE_TOKEN>`
- **流式**：Header `Accept: text/event-stream`，响应为 SSE
- **我们传入工作流的内容**：把《请求格式》文档中的 JSON（`type` + `content` 或 `messages`）**序列化成字符串**，放入 `content.query.prompt[0].content.text`，这样工作流入口拿到的就是我们的约定格式，可直接解析后走 posts/chat 分支。

### 1.2 请求映射关系

| 我们的请求（文档约定） | 放入 Coze 站点 body 的方式 |
|------------------------|----------------------------|
| `{ "type": "posts", "content": "帖子正文..." }` | `prompt[0].content.text = JSON.stringify(上述对象)` |
| `{ "type": "chat", "messages": [ ... ] }` | 同上，`prompt[0].content.text = JSON.stringify(上述对象)` |
| 会话标识 | `session_id` 使用我们后端的 chat `sessionId`（或新生成） |
| 项目/工作流 | `project_id` 固定为当前工作流所在项目 ID（写入 env） |

### 1.3 响应处理（流式 → 最终输出）

- Coze 返回 **SSE**（`data:` 行），可能有多条事件，内容为工作流输出的**文本流**（或逐 chunk 的 JSON 片段）。
- **策略**：后端按 SSE 协议读取流，**累积所有 `data` 内容**，得到「完整一段输出」后，按《响应格式》文档解析为 JSON：`{ itineraries: boolean, data?: object, content?: string }`。
- 若工作流是「先流式输出文本，最后一段才是完整 JSON」，则需要在后端**缓冲到流结束**再解析；若工作流每条 `data` 是独立 JSON，则需按实际格式约定（例如取最后一条完整 JSON）。当前建议：**流结束前持续拼接，流结束后对整段做一次 JSON.parse**，并兼容外层被 markdown 代码块包裹等情况（可复用现有 `_tryParseJSON` 逻辑）。

---

## 二、环境与配置

### 2.1 新增环境变量（后端 .env）

| 变量名 | 说明 | 示例（勿提交真实 token） |
|--------|------|---------------------------|
| `COZE_SITE_STREAM_URL` | 工作流 stream_run 地址 | `https://zpt8w6v5b3.coze.site/stream_run` |
| `COZE_SITE_TOKEN` | 站点 API 鉴权 Token（Bearer） | `eyJhbGci...` |
| `COZE_PROJECT_ID` | 工作流所在项目 ID | `7617331155171295266` |

- 保留现有 `COZE_API_TOKEN`、`COZE_BOT_ID` 等（若其它功能仍用 open_api 可保留）；**聊天与「帖子→行程」统一走 Coze 站点工作流**时，以以上三个为主。

### 2.2 .env.example 补充

在 `backend/.env.example` 中增加上述三项的占位说明，便于团队与部署时配置。

---

## 三、后端改造计划

### 3.1 新增：Coze 工作流调用服务

**文件**：`backend/src/services/cozeWorkflowService.js`（新建）

**职责**：

1. **构建 Coze 站点请求体**  
   - 入参：`{ type: 'posts' | 'chat', content?: string, messages?: array }`（与《请求格式》一致）。  
   - 输出：Coze 站点 API 所需的 body（`content.query.prompt[0].content.text` = `JSON.stringify(入参)`，以及 `type: 'query'`、`session_id`、`project_id`）。

2. **发送流式请求并聚合响应**  
   - 使用 `fetch` 请求 `COZE_SITE_STREAM_URL`，Header：`Authorization: Bearer ${COZE_SITE_TOKEN}`、`Content-Type: application/json`、`Accept: text/event-stream`。  
   - 读取 `res.body` 流，按 SSE 解析（按行处理，以 `data:` 开头取 payload），将同一轮回复的**全文拼接**为一个字符串。

3. **解析工作流输出**  
   - 对拼接后的字符串做「提取 JSON」处理（兼容 markdown 代码块、前后杂文等），得到对象。  
   - 校验并返回：`{ itineraries: boolean, data?: object, content?: string }`；若解析失败，可返回 `{ itineraries: false, content: 原始文本 }` 作为降级，避免整段报错。

**接口设计建议**：

- `callWorkflow(payload, sessionId)`  
  - `payload`：`{ type, content }` 或 `{ type, messages }`。  
  - `sessionId`：用于 Coze 的 `session_id`。  
  - 返回：`Promise<{ itineraries, data?, content? }>`。

### 3.2 修改：聊天服务与控制器

**文件**：`backend/src/services/chatService.js`

- **sendMessage**：  
  - 仍先写入用户消息到 `ChatMessage`，并拉取当前会话历史，组成 `messages`。  
  - 不再调用 `aiService.chat(messages)`，改为调用 `cozeWorkflowService.callWorkflow({ type: 'chat', messages }, sessionId)`。  
  - 根据返回的 `itineraries`：  
    - `true`：将 `content`（或对行程的简短说明）写入一条 assistant 的 `ChatMessage`；同时把 `data` 一并返回给上层（见下）。  
    - `false`：照常把 `content` 写入 assistant 消息并返回。

**文件**：`backend/src/controllers/chatController.js`

- **sendMessage 响应**：  
  - 在现有返回的「消息对象」基础上，增加可选字段：`itineraryData`（当 `itineraries === true` 时把 `data` 放入）。  
  - 前端据此判断：若有 `itineraryData`，则展示「保存为行程」并调用行程创建接口。

**文件**：`backend/src/services/aiService.js`

- 若后续「仅」用 Coze 站点工作流做聊天与行程，可保留 `generateItinerary` 等供旧接口兼容，或逐步迁移；**新逻辑以 cozeWorkflowService 为准**。

### 3.3 帖子正文 → 行程（可选与本计划一并做）

**文件**：`backend/src/controllers/itineraryController.js`、`backend/src/routes/itineraryRoutes.js`

- 新增接口：例如 `POST /itineraries/generate-from-content`，body：`{ content: string }`（帖子正文）。  
- 后端：调用 `cozeWorkflowService.callWorkflow({ type: 'posts', content }, sessionId)`（此处 sessionId 可为一次性或固定占位）。  
- 若返回 `itineraries === true` 且存在 `data`：用现有 `normalizeLinearContent` 等逻辑规范化后写入 `itineraries` 表，返回新建行程；否则返回 4xx 或明确错误提示（如「未能从内容中生成行程」）。

---

## 四、前端改造计划

### 4.1 聊天页 `chat.vue`

- **请求**：保持现有 `POST /chat/message`，请求体不变（sessionId + content）。  
- **响应**：  
  - 若存在 `itineraryData`：在当条助手气泡下方增加「保存为行程」按钮；点击后调用 `POST /itineraries`（或你们现有的「创建行程」接口），将 `itineraryData` 作为 content 传入，保存成功后可跳转行程详情或列表。  
  - 若不存在：仅展示助手 `content`，与当前行为一致。  
- **流式（可选）**：当前计划书按「后端聚合流式结果再一次性返回」实现；若后续要做「打字机效果」，再考虑前端直接消费 SSE 或后端增加 `GET/POST .../chat/stream` 并转发 SSE。

### 4.2 帖子详情 / 生成入口（路径 A）

- 在帖子详情页（或内容展示处）增加「用这篇内容生成行程」按钮。  
- 请求：`POST /itineraries/generate-from-content`，body：`{ content: postBody }`。  
- 成功：跳转新建行程详情或列表；失败：toast 提示。

### 4.3 API 与类型

- **frontend/src/api/chat.ts**：  
  - 若后端返回类型增加 `itineraryData?: object`，在类型/接口中声明，便于 chat.vue 使用。  
- **frontend/src/api/itinerary.ts**（或等价）：  
  - 新增 `generateFromContent(content: string)`，对应 `POST /itineraries/generate-from-content`。

---

## 五、实现顺序建议（按依赖关系）

| 步骤 | 内容 | 说明 |
|------|------|------|
| 1 | 配置 env + 新建 `cozeWorkflowService.js` | 实现 Coze 站点 body 构建、流式请求、响应拼接与 JSON 解析；可先打日志确认工作流能收到我们的 payload 并返回约定格式 |
| 2 | 修改 `chatService.sendMessage` 使用 `cozeWorkflowService`，并返回 `itineraryData` | 聊天链路切到工作流，且能区分普通回复与行程回复 |
| 3 | 修改 `chatController.sendMessage` 在响应中带上 `itineraryData` | 前端可据此展示「保存为行程」 |
| 4 | 前端 `chat.vue`：解析 `itineraryData`，展示按钮并调用行程创建接口 | 完成聊天 → 行程保存的闭环 |
| 5 | 后端新增 `POST /itineraries/generate-from-content` + 前端「用这篇生成行程」入口 | 完成路径 A（帖子→行程） |

---

## 六、流式与降级说明

- **当前阶段**：后端对 Coze 的流式响应做**全量缓冲后再解析**，接口仍返回「一次性」JSON；前端无需改 SSE，只需处理 `itineraryData`。  
- **后续可选**：若需聊天内容「逐字打出」，可新增流式接口（例如 `POST /chat/message-stream`），后端将 Coze 的 SSE 转发给前端，或前端直接请求 Coze（需解决跨域与鉴权，通常由后端代理更稳妥）。  
- **降级**：若 Coze 返回非 JSON 或缺少 `itineraries`，后端统一视为 `itineraries: false`，将原始文本放入 `content` 返回，避免接口报错。

---

## 七、调试 Coze SSE 事件

若聊天最后出现的是 Coze 的原始事件 JSON（例如 `{"type":"message_end","session_id":"...", ...}`），说明后端之前把整条 `data` 当作文本转给了前端。现已改为**只解析并转发「回答内容」**，并忽略 `message_end` 等元数据。

### 7.1 开启调试日志

在 `backend/.env` 中增加：

```env
COZE_DEBUG_STREAM=1
```

重启后端后，每次收到 Coze 的 SSE 事件时，控制台会打印该事件的 `type` 和字段名，例如：

```
[Coze SSE] message_end session_id, reply_id, msg_id, ...
```

便于确认：哪些事件带有正文（`content.answer` / `content.content` / `content.delta` 等）、是否在 `message_end` 之前就收齐了回答。

### 7.2 后端如何提取「要展示的内容」

- **跳过**：`type === 'message_end'` 的整条 data 不会当作回复内容，也不会转发给前端。
- **当作正文**：从事件里取 `content.answer`、`content.content`、`content.delta`、`content.message.content`、`content.parts[].text`、或顶层的 `answer` / `content` / `delta`，拼成 `answerText` 并逐块以 `chunk` 发给前端。
- **当作工作流输出**：若事件里存在 `itineraries` 字段，整条 data 会当作《响应格式》里的 JSON 用于解析，并据此发 `done`（含 `itineraryData`）。

若你的工作流用的是别的字段名（例如 `content.result`），可在 `backend/src/services/cozeWorkflowService.js` 的 `extractDisplayContent` 里按上面逻辑增加分支。

### 7.3 若仍然看不到正常回复

1. 用 `COZE_DEBUG_STREAM=1` 看控制台，确认是否有非 `message_end` 的事件、且其中是否带有文本字段。
2. 若回答只在某种自定义事件里（例如 `type: "workflow_output"` 且内容在 `content.body`），在 `extractDisplayContent` 中为该类型和字段增加解析。
3. 若工作流是「先流式输出多段，最后再发一次完整 JSON」：当前会累积所有非 `message_end` 的文本到 `answerText`，流结束后对 `answerText` 做一次《响应格式》解析；若完整 JSON 在最后一个非 `message_end` 事件里，且该事件带 `itineraries`，会走 `isWorkflowOutput` 分支，用整条 data 解析。

---

## 八、小结

- **请求**：我们按《请求格式》组好 `{ type, content }` 或 `{ type, messages }`，序列化后放入 Coze 站点 `content.query.prompt[0].content.text`，并带上 `session_id`、`project_id`。  
- **响应**：后端从 SSE 中聚合完整输出，解析为《响应格式》中的 JSON，根据 `itineraries` 分支：聊天保存消息并可选返回 `itineraryData`；帖子场景直接生成并保存行程。  
- **实现顺序**：先 cozeWorkflowService → 再 chat 链路 → 再前端行程按钮 → 最后帖子生成接口与入口。  

按此计划即可在现有项目内接入 Coze 工作流，并保持与《Coze工作流请求与响应格式》文档一致；后续写接口时以该文档和本文为准。
