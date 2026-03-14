# 小红书「旅游规划」爬虫

目标：爬取关键词 **旅游规划** 的笔记，抽取 **正文 + 图片链接**，先落盘、本地去重，再导入毕设 MySQL `posts` 表。

👉 **详细执行步骤（从安装到导入）**：见 **[执行步骤.md](./执行步骤.md)**。

**当前方案：浏览器自动化（Playwright）** — 打开真实浏览器访问小红书搜索页，抓取网络响应中的笔记数据，不依赖接口签名。

---

## 三阶段流程

| 阶段 | 脚本 | 说明 |
|------|------|------|
| 1. 爬取并落盘 | `crawler.py` | Playwright 打开搜索页、滚动加载，从接口响应中解析笔记并写入 `data/raw/` |
| 2. 本地去重 | `dedup_local.py` | 按 `xhs_note_id` 去重 → `data/ready/notes_deduped.json` |
| 3. 导入数据库 | `db_import.py` | 从 `data/ready/` 写入 MySQL `posts` 表 |

---

## 环境与依赖

- Python 3.10+
- Playwright（会下载 Chromium 浏览器）

```bash
cd xhs-crawler
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
playwright install chromium     # 首次必须：安装 Chromium
```

---

## 运行

### 阶段 1：爬取（首次需登录）

```bash
cd xhs-crawler
.venv\Scripts\activate
python crawler.py
```

- **首次运行**：会打开浏览器并打开小红书首页，请在 **90 秒内** 完成扫码或密码登录；脚本会保存登录状态到 `playwright_state.json`（已加入 .gitignore）。
- **之后运行**：自动复用登录状态，直接打开「旅游规划」搜索页并开始抓取；脚本会滚动页面触发加载，从网络响应中解析笔记并保存到 `data/raw/`。
- 可在 `.env` 中设置 `CRAWL_MAX_NOTES=200`、`CRAWL_DELAY=1.5` 等控制条数和间隔。

### 阶段 2、3：去重与导入

```bash
python dedup_local.py    # 去重 → data/ready/notes_deduped.json
python db_import.py      # 需配置 .env 中 DB_* 与 CRAWLER_USER_ID
```

---

## 配置说明

将 `.env.example` 复制为 `.env` 并按需填写：

- **KEYWORD**：搜索关键词，默认 `旅游规划`
- **CRAWL_MAX_NOTES**：最多爬取条数，默认 200，0 表示不限制
- **CRAWL_DELAY**：滚动间隔（秒），默认 1.5
- **DB_***、**CRAWLER_USER_ID**：阶段 3 导入时使用

详细数据格式与表结构见 **[PLAN.md](./PLAN.md)**。  
**一步步操作说明**见 **[执行步骤.md](./执行步骤.md)**。
