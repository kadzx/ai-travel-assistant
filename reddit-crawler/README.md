# Reddit 图片帖试跑器

目标：按单个省份关键词抓取 `r/travel` 里的 Reddit 图片帖，先保存外部图片链接，再做本地去重。

## 当前范围

- 只抓取图片帖，不要视频帖
- 每组关键词最多抓 `15` 帖
- 默认省份：`Yunnan`
- 当前不入库，只输出本地 JSON

## 默认关键词

未配置 `REDDIT_KEYWORDS` 时，自动使用：

- `yunnan days china`
- `yunnan itinerary china`
- `yunnan travel china`
- `yunnan trip report china`

## 安装

```bash
cd reddit-crawler
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

## 运行

抓取：

```bash
python reddit_crawler.py
```

浏览器抓取验证：

```bash
python reddit_browser_crawler.py
```

去重：

```bash
python reddit_dedup_local.py
```

如果搜索接口返回 `403 Blocked`，通常是当前代理节点或出口 IP 被 Reddit 风控；切换代理节点后重试即可。
如果想测试“浏览器能不能过、接口不能过”，就运行 `reddit_browser_crawler.py`。

## 输出

- 原始数据：`data/raw/<province>/`
- 去重结果：`data/ready/reddit_<province>_deduped.json`
- 浏览器调试：`data/debug/<province>/`

## 图片帖过滤规则

- 丢弃 `is_video=true`
- 丢弃 `reddit_video`
- 丢弃 `post_hint=hosted:video` 或 `rich:video`
- 保留相册帖 `gallery_data + media_metadata`
- 保留存在 `preview.images` 或直链图片 URL 的帖子
