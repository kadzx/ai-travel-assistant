# SSE 边流式边解析 — 方案调研与落地

## 一、问题

Coze 工作流把整份 JSON（`itineraries` + `data` + `content`）以**流式**形式返回：SSE 未结束前，前端收到的是 JSON 的**片段**（如 `{"itineraries":true,"data":{"version":"v1"...`），直接拼到气泡里会变成“半截 JSON”，普通用户看不懂。希望做到：**边收 SSE 边解析**，一旦能解析出 `content` 或部分 `data` 就立刻展示可读内容，而不是等流结束再一次性展示。

---

## 二、常见做法与局限

| 做法 | 说明 | 局限 |
|------|------|------|
| 等流结束再 `JSON.parse` | 当前很多前端的做法 | 流式期间只能显示“加载中”或原始片段，无法边收边展示可读内容。 |
| 每收到一段就 `JSON.parse(accumulated)` | 对累积字符串反复解析 | 不完整 JSON 会抛错；若用 try/catch + 正则硬抽字段，易出错且难维护。 |
| 用正则从片段里抽 `"content":"...` | 不完整时字符串可能被截断 | 要处理转义、嵌套引号等，不可靠。 |

结论：需要**按流式设计的增量 JSON 解析**，而不是“整段再解析”或“正则抠字段”。

---

## 三、业界方案概览

### 1. jsonriver（推荐，JS/Node 通用）

- **是什么**：流式 JSON 解析库，边读流边解析，产出**越来越完整的 JS 对象**（与最终 `JSON.parse` 结果一致）。
- **特点**：
  - 体积小（~2.5KB gzip）、无依赖，适合浏览器和 Node。
  - 支持 **`completeCallback(value, path)`**：某个字段**完整解析完**时回调（如 `path = ['content']` 表示顶层 `content` 已完整）。
  - 也可用 **`for await (const value of parse(stream))`** 拿到“当前已解析出的对象”，其中字符串会随流**逐渐变长**（如先出现 `content` 的前几个字，再变长）。
- **典型用法**：
  - 把 **Coze 的响应体** 当作**字符流**（或先 `pipeThrough(new TextDecoderStream())`）喂给 `parse(stream)`。
  - 在 `completeCallback` 里：当 `path === ['content']` 时拿到完整 `content` 文案，立刻推给前端（如通过 SSE 的 `event: content`）。
  - 或：`for await (const value of parse(stream))`，每次若 `value.content` 存在且比上次长，就推送一次，实现“边流式边解析、边展示”。
- **链接**：<https://github.com/rictic/jsonriver>，<https://www.npmjs.com/package/jsonriver>。

### 2. jsonchunk（TypeScript，偏 LLM 场景）

- 针对**不完整 JSON** 做“尽力而为”解析，得到部分对象。
- 适合“流式 LLM 输出、想尽早拿到部分字段”的场景。
- 链接：<https://github.com/jbingen/jsonchunk>。

### 3. 服务端先解析再转发（当前推荐落地方式）

- **思路**：在后端用 **jsonriver** 消费 Coze 的响应流，做**唯一一次**流式解析；解析过程中一旦得到可展示内容就通过 SSE 推给前端。
- **好处**：
  - 前端只消费“已解析好”的 SSE 事件（如 `content` 文案、或 `partial` 对象），无需在前端再解析 JSON。
  - 后端可统一处理 Coze 的 SSE 与 JSON 边界（例如先按 SSE 拆 event，再把同一段 JSON 的多个 data 拼成流喂给 jsonriver）。

---

## 四、推荐落地方式（后端 jsonriver + SSE 转发）

### 4.1 数据流

1. 后端请求 Coze，拿到 **response.body**（SSE 流）。
2. 从 SSE 中按行/块取出 **data 行**，拼成**同一段 JSON 的字符流**（若 Coze 一次只发一整段 JSON，则可能只有一个 data；若分多块发，则按顺序拼接）。
3. 用 **jsonriver** 的 `parse(stream, { completeCallback })` 或 `for await (const value of parse(stream))` 消费该字符流。
4. 解析过程中：
   - 每当 **顶层 `content` 字段完整**（`completeCallback` 的 `path` 为 `['content']`），或 `value.content` 比上次更长时，通过 SSE 向客户端发 **`event: content`，data: 该段文案**，前端即可**边收边展示**。
   - 可选：对 **`data`**（行程数据）在完整或部分可用时发 **`event: partial`**，前端可提前渲染“行程安排详情”的骨架或已解析出的节点。
5. 根对象解析完成后，发 **`event: done`**（带完整 `content`、`itineraries`、`itineraryData` 等），前端做收尾（如关 loading、展示“保存为行程”等）。

### 4.2 后端实现要点（Node）

- 使用 **Web ReadableStream**：若 Coze 返回的是多块 SSE 的 data，可构造一个 **ReadableStream**，在读到每一块 data 时 **enqueue** 该块字符串（或先解码再 enqueue），读完后 **close**。
- 将该 stream 传给 **jsonriver** 的 `parse(stream)`（若需可先 `pipeThrough(new TextDecoderStream())`，视当前是字节流还是字符串流而定）。
- 在 **completeCallback** 中根据 `path` 判断：
  - `path.segments()` 为 `['content']` → 发送 `event: content`。
  - 根对象完成 → 发送 `event: done`。
- 若希望“字符串未完全结束也能先展示已解析部分”（如 `content` 逐字变长），可改用 **`for await (const value of parse(stream))`**，每次若 `value.content !== undefined` 且比上次长，就发一次 `content` 事件。

### 4.3 前端配合

- 监听 **`event: content`**：把 data 当作当前回复的**可读文案**，直接或追加显示在主气泡中（不再显示原始 JSON）。
- 监听 **`event: partial`**（若有）：用 `partial.data` 等更新“行程安排详情”的折叠区（可只渲染已解析出的节点）。
- 监听 **`event: done`**：与现有一致，设置 `itineraryData`、关闭 loading、展示“保存为行程”等。

这样即可实现：**SSE 还没结束的时候，用户就能看到解析好的、可读的 `content` 文案（以及可选的行程片段），而不是半截 JSON。**

---

## 五、小结

| 方案 | 适用场景 | 建议 |
|------|----------|------|
| **jsonriver（后端）** | 需要边收 Coze 流边解析、边把可读内容推给前端 | ✅ 推荐：后端流式解析 + SSE 转发 `content` / `partial` / `done`。 |
| **jsonchunk** | 前端必须自己解析不完整 JSON 时 | 备选，通常不如后端统一解析清晰。 |
| **仅前端占位** | 不改后端、只避免显示 JSON | 已做：流式时显示“正在生成行程...”，结束后再展示解析结果。 |

若要在**流式过程中就展示可读字**，建议采用 **jsonriver 在后端做“边流式边解析”，并通过 SSE 的 content/partial/done 事件推给前端**；前端只负责展示这些已解析好的内容，不再处理原始 JSON 片段。
