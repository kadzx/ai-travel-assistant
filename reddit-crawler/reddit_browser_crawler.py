# -*- coding: utf-8 -*-
"""
浏览器抓取验证版：
- 用 Playwright 打开 Reddit 搜索页
- 优先从页面的 JSON 网络响应中提取图片帖
- 拿不到时再从 DOM 兜底解析
- 主要用于判断“真实浏览器能不能绕过 403 Blocked”
"""
import json
import sys
import time
from pathlib import Path
from urllib.parse import quote

from reddit_config import (
    DATA_DEBUG_DIR,
    DATA_RAW_DIR,
    REDDIT_BROWSER_HEADLESS,
    REDDIT_BROWSER_SCROLLS,
    REDDIT_BROWSER_UA,
    REDDIT_BROWSER_WAIT_SECONDS,
    REDDIT_KEYWORDS,
    REDDIT_POSTS_PER_KEYWORD,
    REDDIT_PROVINCE,
    REDDIT_REQUEST_DELAY,
    REDDIT_SUBREDDIT,
)
from reddit_crawler import _is_image_url, configure_console, to_record


def ensure_dirs():
    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DEBUG_DIR.mkdir(parents=True, exist_ok=True)


def save_record(record: dict):
    post_id = record["reddit_post_id"]
    path = DATA_RAW_DIR / f"{post_id}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)


def save_debug_text(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def iter_listing_payloads(obj):
    if isinstance(obj, dict):
        data = obj.get("data")
        if isinstance(data, dict) and isinstance(data.get("children"), list):
            yield obj
        for value in obj.values():
            yield from iter_listing_payloads(value)
    elif isinstance(obj, list):
        for item in obj:
            yield from iter_listing_payloads(item)


def collect_from_payload(payload: dict, keyword: str, seen_ids: set[str], collected: list[dict]) -> int:
    added = 0
    for listing in iter_listing_payloads(payload):
        children = ((listing.get("data") or {}).get("children") or [])
        for child in children:
            post = child.get("data") or {}
            record = to_record(post, keyword)
            if not record:
                continue
            post_id = record["reddit_post_id"]
            if post_id in seen_ids:
                continue
            seen_ids.add(post_id)
            collected.append(record)
            save_record(record)
            added += 1
            print(f"  网络响应收集到 [{len(collected)}] {post_id} {(record['title'] or '')[:60]}")
            if len(collected) >= REDDIT_POSTS_PER_KEYWORD:
                return added
    return added


def collect_from_dom(page, keyword: str, seen_ids: set[str], collected: list[dict]) -> int:
    js = """
() => {
  const results = [];
  const seen = new Set();
  const anchors = Array.from(document.querySelectorAll('a[href*="/comments/"]'));
  for (const a of anchors) {
    const href = a.href || '';
    const match = href.match(/\\/comments\\/([a-z0-9]+)\\//i);
    if (!match) continue;
    const postId = match[1];
    if (seen.has(postId)) continue;
    seen.add(postId);
    const container =
      a.closest('shreddit-post, article, faceplate-tracker, div[data-testid="post-container"]') ||
      a.parentElement;
    const titleCandidates = [
      (a.textContent || '').trim(),
      (container?.querySelector('h3')?.textContent || '').trim(),
      (container?.querySelector('h2')?.textContent || '').trim(),
    ].filter(Boolean);
    titleCandidates.sort((x, y) => y.length - x.length);
    const title = titleCandidates[0] || '';
    const images = Array.from(container?.querySelectorAll('img') || [])
      .map(img => img.currentSrc || img.src || '')
      .filter(Boolean);
    const text = ((container?.innerText || '').trim()).slice(0, 1000);
    results.push({
      reddit_post_id: postId,
      title,
      images,
      post_url: href,
      content: text,
    });
  }
  return results;
}
"""
    try:
        candidates = page.evaluate(js)
    except Exception:
        return 0

    added = 0
    for item in candidates or []:
        post_id = str(item.get("reddit_post_id") or "").strip()
        title = str(item.get("title") or "").strip()
        post_url = str(item.get("post_url") or "").strip()
        if not post_id or not title or post_id in seen_ids:
            continue
        images = []
        for url in item.get("images") or []:
            if _is_image_url(url) and url not in images:
                images.append(url)
        if not images:
            continue

        record = {
            "reddit_post_id": post_id,
            "title": title[:255],
            "content": str(item.get("content") or "").strip(),
            "images": images,
            "tags": ["reddit", "china travel", REDDIT_PROVINCE],
            "source": "reddit",
            "subreddit": REDDIT_SUBREDDIT,
            "keyword": keyword,
            "location": REDDIT_PROVINCE,
            "author": "",
            "score": 0,
            "num_comments": 0,
            "created_utc": None,
            "post_url": post_url,
            "raw_url": images[0],
            "is_gallery": len(images) > 1,
            "post_hint": "image",
        }
        seen_ids.add(post_id)
        collected.append(record)
        save_record(record)
        added += 1
        print(f"  DOM 兜底收集到 [{len(collected)}] {post_id} {(title or '')[:60]}")
        if len(collected) >= REDDIT_POSTS_PER_KEYWORD:
            return added
    return added


def is_blocked_page(page) -> bool:
    try:
        content = page.content()
    except Exception:
        return False
    lowered = content.lower()
    return "blocked by network security" in lowered or "request has been blocked" in lowered


def crawl_keyword(keyword: str) -> dict:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("请先安装: pip install playwright && playwright install chromium")
        return {"keyword": keyword, "saved_count": 0, "blocked": False}

    search_url = (
        f"https://www.reddit.com/r/{REDDIT_SUBREDDIT}/search/"
        f"?q={quote(keyword, safe='')}&restrict_sr=1&sort=relevance&t=all&type=link"
    )
    collected: list[dict] = []
    seen_ids: set[str] = set()
    blocked = False

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=REDDIT_BROWSER_HEADLESS)
        context = browser.new_context(
            viewport={"width": 1440, "height": 960},
            locale="en-US",
            user_agent=REDDIT_BROWSER_UA,
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": f"https://www.reddit.com/r/{REDDIT_SUBREDDIT}/",
            },
        )
        page = context.new_page()

        def on_response(response):
            if len(collected) >= REDDIT_POSTS_PER_KEYWORD:
                return
            if response.status != 200:
                return
            try:
                headers = response.headers
            except Exception:
                headers = {}
            content_type = (headers.get("content-type") or "").lower()
            if "json" not in content_type:
                return
            try:
                payload = response.json()
            except Exception:
                return
            if isinstance(payload, dict):
                collect_from_payload(payload, keyword, seen_ids, collected)

        page.on("response", on_response)

        print(f"\n打开搜索页: {keyword}")
        page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(REDDIT_BROWSER_WAIT_SECONDS)

        debug_slug = keyword.replace(" ", "_")
        html_path = DATA_DEBUG_DIR / f"{debug_slug}.html"
        screenshot_path = DATA_DEBUG_DIR / f"{debug_slug}.png"

        try:
            save_debug_text(html_path, page.content())
            page.screenshot(path=str(screenshot_path), full_page=True)
        except Exception:
            pass

        if is_blocked_page(page):
            blocked = True
            print("  页面直接显示 Blocked by network security")
        else:
            for _ in range(REDDIT_BROWSER_SCROLLS):
                if len(collected) >= REDDIT_POSTS_PER_KEYWORD:
                    break
                page.mouse.wheel(0, 2400)
                time.sleep(REDDIT_BROWSER_WAIT_SECONDS)
            if len(collected) < REDDIT_POSTS_PER_KEYWORD:
                collect_from_dom(page, keyword, seen_ids, collected)

        context.close()
        browser.close()

    return {
        "keyword": keyword,
        "saved_count": len(collected),
        "blocked": blocked,
        "post_ids": [r["reddit_post_id"] for r in collected],
    }


def run():
    configure_console()
    ensure_dirs()

    summary = {
        "province": REDDIT_PROVINCE,
        "subreddit": REDDIT_SUBREDDIT,
        "mode": "browser",
        "keywords": [],
    }
    total_saved = 0

    for index, keyword in enumerate(REDDIT_KEYWORDS, start=1):
        result = crawl_keyword(keyword)
        summary["keywords"].append(result)
        total_saved += result["saved_count"]
        if index < len(REDDIT_KEYWORDS):
            time.sleep(REDDIT_REQUEST_DELAY)

    out_path = DATA_DEBUG_DIR / "_browser_summary.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"\n浏览器模式完成：共保存 {total_saved} 条，摘要文件: {out_path}")


if __name__ == "__main__":
    run()
