# Coze 工作流 — 请求格式与响应格式

本文档约定：**后端调用 Coze 工作流时的请求体**、**Coze 工作流必须返回的响应体**。工作流搭建与后端接口实现均以此为准。

---

## 一、请求格式（后端 → Coze）

后端请求 Coze 时，**除 Coze 平台要求的鉴权等公共参数外**，传入工作流的**用户消息 / 入参**采用以下结构。

### 1.1 统一请求体结构

请求体为 **JSON 对象**，且必须包含字段 `type`，用于在工作流内区分分支。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | `string` | 是 | 取值仅允许 `"posts"` 或 `"chat"`，见下文。 |
| `content` | `string` | 条件 | `type === "posts"` 时必填，为帖子正文。 |
| `messages` | `array` | 条件 | `type === "chat"` 时必填，为对话历史，见 1.3。 |

- 当 `type === "posts"` 时：必须传 `content`，无需传 `messages`。
- 当 `type === "chat"` 时：必须传 `messages`，无需传 `content`。

### 1.2 type = `"posts"`（帖子正文 → 行程）

表示当前输入是一段**帖子正文**，工作流应**始终**从正文中抽取/生成一份行程计划并返回。

**示例：**

```json
{
  "type": "posts",
  "content": "第一天上午去西湖断桥，中午楼外楼吃饭，下午灵隐寺；第二天去西溪湿地..."
}
```

### 1.3 type = `"chat"`（聊天 → 对话或行程）

表示当前输入是**多轮对话**。工作流需先判断用户意图：  
- 若为「生成行程/计划」→ 返回行程 JSON（见 2.2）；  
- 否则 → 返回普通对话回复（见 2.3）。

`messages` 为消息数组，每项为 `{ "role": "user" | "assistant", "content": "..." }`，按时间顺序排列。

**示例：**

```json
{
  "type": "chat",
  "messages": [
    { "role": "user", "content": "杭州有什么好吃的？" },
    { "role": "assistant", "content": "杭州有很多特色美食，比如西湖醋鱼、龙井虾仁..." },
    { "role": "user", "content": "帮我做一份杭州 3 天的行程" }
  ]
}
```

### 1.4 请求体示例汇总

**帖子场景：**

```json
{
  "type": "posts",
  "content": "（帖子正文全文）"
}
```

**聊天场景：**

```json
{
  "type": "chat",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

---

## 二、响应格式（Coze → 后端）

Coze 工作流的**最终输出**必须为 **JSON 字符串**（或平台支持的等价结构化输出），且能被后端解析为下列两种形态之一。

### 2.1 统一响应体结构

响应体为 **JSON 对象**，且必须包含字段 `itineraries`，用于区分「行程」与「普通对话」。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `itineraries` | `boolean` | 是 | `true` 表示本次返回为行程计划；`false` 表示普通对话回复。 |
| `data` | `object` | 条件 | `itineraries === true` 时必填，为行程数据，结构见 2.2。 |
| `content` | `string` | 条件 | `itineraries === false` 时必填，为助手回复的纯文本内容。 |

- 当 `itineraries === true` 时：必须提供 `data`，可选择性提供 `content`（如对行程的简短说明）。  
- 当 `itineraries === false` 时：必须提供 `content`，无需 `data`。

### 2.2 行程响应（itineraries = true）

当工作流判定本次应返回「行程计划」时，响应格式如下。

```json
{
  "itineraries": true,
  "data": {
    "version": "v1",
    "timezone": "Asia/Shanghai",
    "destination": "杭州",
    "startDate": "2026-04-01",
    "endDate": "2026-04-03",
    "travelers": 2,
    "budgetLevel": "medium",
    "styleTags": ["citywalk", "food", "culture"],
    "nodes": [
      {
        "id": "n_001",
        "dayIndex": 1,
        "sequence": 1,
        "timeSlot": "09:00-10:30",
        "title": "西湖断桥晨游",
        "location": "断桥残雪",
        "transport": "步行",
        "cost": 0,
        "durationMin": 90,
        "notes": "早到人少，适合拍照",
        "status": "planned"
      }
    ],
    "summary": {
      "totalDays": 3,
      "totalNodes": 10,
      "estimatedCost": 2200
    }
  },
  "content": "已根据您的需求生成杭州 3 日行程，可保存后继续编辑。"
}
```

**`data` 字段约束（与《线性行程格式与一期功能计划》一致）：**

- **行程级必填**：`version`、`destination`、`nodes`。  
- **节点级必填**：`id`、`dayIndex`、`sequence`、`title`、`status`。  
- **`status` 枚举**：`planned` | `done` | `skipped`。  
- **排序**：先按 `dayIndex` 升序，再按 `sequence` 升序。  
- **可选**：`timezone`、`startDate`、`endDate`、`travelers`、`budgetLevel`、`styleTags`、`summary`；节点可选 `timeSlot`、`location`、`transport`、`cost`、`durationMin`、`notes`。  

后端会对 `data` 做规范化（如补全 `id`、重算 `sequence`、生成 `summary`），但工作流尽量按上述结构输出，以减少兼容逻辑。

### 2.3 普通对话响应（itineraries = false）

当工作流判定本次为普通对话（非行程请求）时，响应格式如下。

```json
{
  "itineraries": false,
  "content": "杭州有很多特色美食，比如西湖醋鱼、龙井虾仁、东坡肉。您更偏向哪种口味？"
}
```

仅需保证 `itineraries === false` 且 `content` 为字符串即可。

### 2.4 响应体示例汇总

**行程：**

```json
{
  "itineraries": true,
  "data": { /* 线性行程对象，见 2.2 */ },
  "content": "可选：简短说明"
}
```

**普通对话：**

```json
{
  "itineraries": false,
  "content": "助手的回复文本"
}
```

---

## 三、行为约定（与 type 对应）

| 请求 `type` | 工作流行为 | 响应要求 |
|-------------|------------|----------|
| `posts` | 始终从正文生成行程 | 必须返回 `itineraries: true` + `data`（行程 JSON） |
| `chat` | 先识别意图：要行程 / 普通对话 | 要行程 → `itineraries: true` + `data`；否则 → `itineraries: false` + `content` |

---

## 四、后端解析与使用

- 后端收到 Coze 返回后，先按 **JSON** 解析整段响应。  
- 若解析失败，可降级为普通对话（将整段当作 `content`，`itineraries: false`）。  
- 若解析成功：  
  - `itineraries === true`：取 `data`，经现有 `normalizeLinearContent` 等逻辑写入 `itineraries` 表，并可选将 `content` 展示给用户。  
  - `itineraries === false`：仅将 `content` 作为聊天回复返回前端。  

接口实现时，请求体与响应体以本文档为准；工作流内如何实现「意图识别」「正文抽取」等由 Coze 侧自行设计。
