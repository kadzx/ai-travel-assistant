# 小红书「旅游规划」爬虫 — 计划书

## 一、目标

- **关键词**：旅游规划  
- **爬取内容**：正文 + 图片链接（与毕设 AI Travel 的帖子展示需求一致）  
- **落库**：写入你现有毕设项目的 **MySQL `posts` 表**，前端可直接当普通帖子展示或做推荐/搜索。

---

## 二、当前方案：浏览器自动化（Playwright）

阶段 1 采用 **方案 A**：用 Playwright 启动 Chromium，打开小红书搜索页（关键词=旅游规划），通过监听 `edith.xiaohongshu.com` 的网络响应解析笔记列表，写入 `data/raw/`。首次运行需在浏览器内登录一次，登录状态保存为 `playwright_state.json` 供后续复用。不依赖 x-s 等签名，由真实浏览器携带 Cookie 发起请求。

### 已弃用方案（直接调 Web API）

- **搜索接口** `GET /api/sns/web/v1/search/notes`：返回 404。
- **feed 接口** `POST /api/sns/web/v1/feed`：xhshow 签名后返回 406。已不再使用。

---

## 三、分阶段流程（先落盘，本地去重，再导入）

不做数据库内去重，分三步：

| 阶段 | 做什么 | 产出 |
|------|--------|------|
| **1. 爬取并落盘** | 用选定方案获取笔记，解析正文+图片链接，按条写入本地 | `data/raw/` 下 JSON（含 `xhs_note_id`） |
| **2. 本地去重** | 按 `xhs_note_id` 去重 | `data/ready/notes_deduped.json` |
| **3. 导入数据库** | 读取 `data/ready/`，写入 MySQL `posts` 表 | 库里的帖子 |

去重只在本地完成，导入时直接插入，不改表结构。

---

## 四、项目根目录下的爬虫目录结构

```
毕设重置/
├── backend/
├── frontend/
├── docs/
└── xhs-crawler/
    ├── PLAN.md
    ├── README.md
    ├── .env.example       # Cookie、DB、爬虫用户 ID（导入阶段用）
    ├── config.py
    ├── crawler.py         # 阶段1：爬取 → 写入 data/raw/
    ├── dedup_local.py     # 阶段2：本地去重 → 输出 data/ready/
    ├── db_import.py       # 阶段3：读取 data/ready/ → 写入 MySQL
    ├── requirements.txt
    └── data/
        ├── raw/           # 阶段1 产出：原始爬取结果（含 xhs_note_id）
        │   └── .gitkeep
        └── ready/         # 阶段2 产出：去重后的数据，供导入
            └── .gitkeep
```

- 所有爬取与导入相关代码集中在 **`xhs-crawler/`**。  
- 导入时通过 **与 backend 相同的 DB 配置** 连接 MySQL。

---

## 五、数据格式（与你的数据库对齐）

### 5.1 爬虫解析出的单条笔记（落盘 + 导入通用）

从小红书接口拿到的原始数据，在爬虫内统一解析为：

```json
{
  "xhs_note_id": "小红书笔记唯一ID，用于去重",
  "title": "笔记标题",
  "content": "正文纯文本（列表/接口或兜底时的 inner_text）",
  "content_html": "正文富文本 HTML（详情页 DOM 的 inner_html 或接口返回的 html 字段，可选）",
  "images": ["https://...", "https://..."],
  "tags": ["旅游规划", "可选：从笔记里解析的其它标签"],
  "source": "xiaohongshu"
}
```

- **正文**：`content` 为纯文本；`content_html` 来自 **edith.xiaohongshu.com 的 feed 等接口返回的 `desc` 字段**（即富文本 HTML），导入 DB 时优先写入 `posts.content`，前端用 `v-html` 渲染时需做 XSS 过滤。  
- **图片**：只存**图片链接数组**，不下载图片文件。

### 5.2 写入你现有 `posts` 表（阶段 3 导入时用）

你的表结构（节选）：

| 字段       | 类型     | 说明           |
|------------|----------|----------------|
| user_id    | INT      | 必填，发帖用户 |
| title      | VARCHAR  | 标题           |
| content    | TEXT     | 正文           |
| images     | JSON     | 图片 URL 数组  |
| tags       | JSON     | 标签数组       |
| type       | VARCHAR  | 帖子类型       |
| privacy    | VARCHAR  | 默认 public    |

**映射关系：** 从本地 `data/ready/` 的每条记录映射到表字段：

| 本地 JSON 字段 | → | 数据库字段 |
|----------------|---|------------|
| title          | → | title      |
| content        | → | content    |
| images         | → | images     |
| tags           | → | tags（至少含 "旅游规划"） |
| （配置项）     | → | user_id = 爬虫专用用户 ID |
| （固定）       | → | type = `xhs_crawl` 或 `recommend` |
| （固定）       | → | privacy = `public` |

**不做数据库内去重**：去重已在阶段 2 本地完成，导入时直接按条插入即可，无需改表、无需在库里查重。

---

## 六、各阶段流程概要

### 阶段 1：爬取并落盘

1. **配置**：关键词 `旅游规划`、请求间隔 1～2 秒、Cookie（`a1` / `web_session` / `webId`）写在 `.env`。  
2. **爬取**：xhshow 调搜索接口 → 拿 `note_id` 列表 → 对每条调详情接口 → 解析标题、正文、图片链接。  
3. **落盘**：每条笔记存成 `data/raw/` 下的 JSON 文件（如按 `xhs_note_id` 命名），或按批存成一个 JSON 数组；每条都带 `xhs_note_id` 供阶段 2 去重。  
4. **节奏**：约 30～60 条/分钟，可先跑 1～2 页验证再加大。

### 阶段 2：本地去重

1. **输入**：读取 `data/raw/` 下全部 JSON（单文件或合并后的列表）。  
2. **去重**：按 `xhs_note_id` 去重，只保留第一次出现的记录。  
3. **输出**：将去重后的列表写入 `data/ready/`（如 `notes_deduped.json` 或按批多个文件），供阶段 3 使用。

### 阶段 3：导入数据库

1. **配置**：在 `.env` 中配置 DB 与 `CRAWLER_USER_ID`（爬虫专用用户 ID）。  
2. **读取**：从 `data/ready/` 读取去重后的 JSON。  
3. **写入**：按 5.2 的映射关系插入 `posts` 表，不做库内去重。

---

## 七、你需要配合的事（怎么配合我）

### 7.1 阶段 1 前（视选定方案而定）

根据采用的爬取方案准备（如浏览器登录、Cookie、或一批用户主页 URL 等），具体见 README 备选方案说明。

### 7.2 阶段 3 前：确定「爬虫用户」ID（导入时必做）

- 在系统里**新建一个专门用来发爬取内容的用户**（如昵称「旅游规划精选」）。  
- 查到该用户的 **`users.id`**，在 `.env` 里配置 `CRAWLER_USER_ID=该ID`。  
- 阶段 1、2 只和本地文件打交道，可以暂不配；到要导入数据库时再配即可。

### 7.3 环境与运行方式

- 本机 **Python 3.10+**。  
- 在 `xhs-crawler/` 下：`pip install -r requirements.txt`。  
- 阶段 1：运行 `crawler.py`，结果落在 `data/raw/`。  
- 阶段 2：运行 `dedup_local.py`，结果落在 `data/ready/`。  
- 阶段 3：运行 `db_import.py`，从 `data/ready/` 读入并写入 MySQL（需配置 DB 与 `CRAWLER_USER_ID`）。

---

## 八、备选方案讨论

与 README 一致，可选方向：

- **浏览器自动化**：Playwright 等，不依赖签名，用真实 Cookie。
- **按用户主页爬**：用现成开源工具，需一批博主主页 URL。
- **代采/付费 API**：有预算时可考虑。
- **手动+半自动**：浏览器导出当前页，再放入 `data/raw/` 走 2、3 阶段。

选定后可在 `crawler.py` 实现阶段 1，数据格式保持 5.1 即可。

---

## 九、交付与后续

- **当前交付**：本计划书 + `xhs-crawler/` 目录及文件骨架（README、`.env.example`、`requirements.txt`、`data/raw/` 与 `data/ready/`）。  
- **你确认**：按「先落盘 → 本地去重 → 再导入」执行；Cookie 在阶段 1 前准备好，爬虫用户 ID 在阶段 3 前准备好。  
- **下一步**：先实现 **阶段 1**（`crawler.py` 爬取并写入 `data/raw/`），再实现 **阶段 2**（`dedup_local.py`），最后实现 **阶段 3**（`db_import.py`）。无需改数据库表结构。
