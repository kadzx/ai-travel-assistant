# 小红书「旅游规划」爬虫

专门爬取关键词 **旅游规划** 的小红书笔记，抽取 **正文 + 图片链接**，先落盘、本地去重，再导入毕设项目 MySQL 的 `posts` 表。

- 详细设计与配合事项见 **[PLAN.md](./PLAN.md)**。
- 依赖：Python 3.10+，xhshow，requests，PyMySQL；入库时复用 backend 的 DB 配置。

## 三阶段流程

| 阶段 | 脚本 | 说明 |
|------|------|------|
| 1. 爬取并落盘 | `crawler.py` | 爬取笔记，写入 `data/raw/` |
| 2. 本地去重 | `dedup_local.py` | 按 `xhs_note_id` 去重，输出到 `data/ready/` |
| 3. 导入数据库 | `db_import.py` | 从 `data/ready/` 写入 MySQL `posts` 表 |

不做数据库内去重，表结构不改动。

## 使用前必读

1. 在 [PLAN.md](./PLAN.md) 中确认 **数据格式** 与 **三阶段流程**。
2. 阶段 1 前：准备 **Cookie**（a1、web_session、webId）并填入 `.env`。
3. 阶段 3 前：准备 **爬虫用户 ID**，配置 `CRAWLER_USER_ID` 与 DB。
4. 将 `.env.example` 复制为 `.env` 并填写，勿将 `.env` 提交到 Git。

## 虚拟环境（推荐）

依赖安装在项目内的虚拟环境中，不污染全局 Python：

```bash
cd xhs-crawler
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate      # macOS/Linux
pip install -r requirements.txt
```

`.venv/` 和 `.env` 已加入 `.gitignore`，不会提交到仓库。

## 运行

```bash
cd xhs-crawler
copy .env.example .env          # Windows，并填写 .env
.venv\Scripts\activate          # 激活虚拟环境

# 阶段 1：爬取 → data/raw/
python crawler.py

# 阶段 2：本地去重 → data/ready/
python dedup_local.py

# 阶段 3：导入数据库（需配置 DB 与 CRAWLER_USER_ID）
python db_import.py
```

具体命令以 PLAN 和后续实现的脚本为准。
