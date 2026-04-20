# -*- coding: utf-8 -*-
"""
阶段 1：抓取 Reddit 图片帖并保存外部图片链接到 data/raw/。
当前只做离线采样，不入库。
"""
import html
import json
import sys
import time
from pathlib import Path
from typing import Iterable
from urllib.parse import quote

import requests

from reddit_config import (
    DATA_RAW_DIR,
    REDDIT_KEYWORDS,
    REDDIT_MAX_PAGES_PER_KEYWORD,
    REDDIT_POSTS_PER_KEYWORD,
    REDDIT_PROVINCE,
    REDDIT_REQUEST_DELAY,
    REDDIT_SUBREDDIT,
    REDDIT_TIMEOUT,
    REDDIT_USER_AGENT,
)

IMAGE_HOST_HINTS = (
    "i.redd.it",
    "preview.redd.it",
    "external-preview.redd.it",
    "i.imgur.com",
    "imgur.com",
)
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".gif")


def configure_console():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def ensure_dirs():
    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)


def _clean_url(url: str) -> str:
    return html.unescape((url or "").strip())


def _is_image_url(url: str) -> bool:
    lowered = (url or "").lower()
    return lowered.startswith("http") and (
        any(host in lowered for host in IMAGE_HOST_HINTS)
        or any(lowered.split("?")[0].endswith(ext) for ext in IMAGE_EXTENSIONS)
    )


def _iter_gallery_urls(post: dict) -> Iterable[str]:
    gallery = post.get("gallery_data") or {}
    media_metadata = post.get("media_metadata") or {}
    items = gallery.get("items") or []
    for item in items:
        media_id = item.get("media_id")
        if not media_id:
            continue
        meta = media_metadata.get(media_id) or {}
        if not isinstance(meta, dict):
            continue
        if str(meta.get("status", "")).lower() == "failed":
            continue
        source = meta.get("s") or {}
        url = source.get("u") or source.get("gif") or ""
        url = _clean_url(url)
        if _is_image_url(url):
            yield url


def _iter_preview_urls(post: dict) -> Iterable[str]:
    preview = post.get("preview") or {}
    images = preview.get("images") or []
    for image in images:
        if not isinstance(image, dict):
            continue
        source = image.get("source") or {}
        url = _clean_url(source.get("url") or "")
        if _is_image_url(url):
            yield url


def extract_image_urls(post: dict) -> list[str]:
    urls: list[str] = []

    for url in _iter_gallery_urls(post):
        if url not in urls:
            urls.append(url)

    direct_candidates = [
        _clean_url(post.get("url_overridden_by_dest") or ""),
        _clean_url(post.get("url") or ""),
    ]
    for url in direct_candidates:
        if _is_image_url(url) and url not in urls:
            urls.append(url)

    for url in _iter_preview_urls(post):
        if url not in urls:
            urls.append(url)

    return urls


def is_video_post(post: dict) -> bool:
    if post.get("is_video"):
        return True
    if (post.get("post_hint") or "") in {"hosted:video", "rich:video"}:
        return True
    media = post.get("media") or {}
    secure_media = post.get("secure_media") or {}
    return bool(
        (isinstance(media, dict) and media.get("reddit_video"))
        or (isinstance(secure_media, dict) and secure_media.get("reddit_video"))
    )


def to_record(post: dict, keyword: str) -> dict | None:
    if is_video_post(post):
        return None

    images = extract_image_urls(post)
    if not images:
        return None

    post_id = str(post.get("id") or "").strip()
    if not post_id:
        return None

    title = (post.get("title") or "").strip()
    content = (post.get("selftext") or "").strip()
    if not title:
        return None

    permalink = post.get("permalink") or ""
    record = {
        "reddit_post_id": post_id,
        "title": title[:255],
        "content": content,
        "images": images,
        "tags": ["reddit", "china travel", REDDIT_PROVINCE],
        "source": "reddit",
        "subreddit": post.get("subreddit") or REDDIT_SUBREDDIT,
        "keyword": keyword,
        "location": REDDIT_PROVINCE,
        "author": post.get("author") or "",
        "score": post.get("score") or 0,
        "num_comments": post.get("num_comments") or 0,
        "created_utc": post.get("created_utc"),
        "post_url": f"https://www.reddit.com{permalink}" if permalink else "",
        "raw_url": post.get("url") or "",
        "is_gallery": bool(post.get("gallery_data")),
        "post_hint": post.get("post_hint") or "",
    }
    return record


def save_record(record: dict):
    post_id = record["reddit_post_id"]
    path = DATA_RAW_DIR / f"{post_id}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)


def fetch_search_page(session: requests.Session, keyword: str, after: str | None = None) -> dict:
    encoded_keyword = quote(keyword, safe="")
    after_part = f"&after={quote(after, safe='')}" if after else ""
    url = (
        f"https://www.reddit.com/r/{REDDIT_SUBREDDIT}/search.json"
        f"?q={encoded_keyword}&restrict_sr=on&sort=relevance&t=all&limit=25&raw_json=1{after_part}"
    )
    response = session.get(url, timeout=REDDIT_TIMEOUT)
    if response.status_code >= 400:
        snippet = " ".join(response.text.strip().split())[:180]
        raise RuntimeError(f"HTTP {response.status_code}: {snippet or 'request blocked'}")
    content_type = response.headers.get("content-type", "").lower()
    if "json" not in content_type:
        raise RuntimeError(f"返回内容不是 JSON，可能被风控拦截：{content_type or 'unknown'}")
    payload = response.json()
    if not isinstance(payload, dict):
        raise RuntimeError("Reddit 返回结构异常")
    return payload


def crawl_keyword(session: requests.Session, keyword: str) -> list[dict]:
    print(f"\n抓取关键词: {keyword}")
    seen_ids = set()
    records: list[dict] = []
    after = None

    for page_no in range(1, REDDIT_MAX_PAGES_PER_KEYWORD + 1):
        try:
            payload = fetch_search_page(session, keyword, after=after)
        except Exception as exc:
            print(f"  第 {page_no} 页请求失败: {exc}")
            break

        data = payload.get("data") or {}
        children = data.get("children") or []
        if not children:
            print("  没有返回帖子，提前结束")
            break

        for child in children:
            post = child.get("data") or {}
            record = to_record(post, keyword)
            if not record:
                continue
            post_id = record["reddit_post_id"]
            if post_id in seen_ids:
                continue
            seen_ids.add(post_id)
            save_record(record)
            records.append(record)
            print(f"  收集到 [{len(records)}] {post_id} {(record['title'] or '')[:50]}")
            if len(records) >= REDDIT_POSTS_PER_KEYWORD:
                return records

        after = data.get("after")
        if not after:
            break
        time.sleep(REDDIT_REQUEST_DELAY)

    return records


def write_keyword_manifest(manifest: dict):
    path = DATA_RAW_DIR / "_keyword_summary.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


def run():
    configure_console()
    ensure_dirs()

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": REDDIT_USER_AGENT,
            "Accept": "application/json",
        }
    )

    manifest = {
        "province": REDDIT_PROVINCE,
        "subreddit": REDDIT_SUBREDDIT,
        "keywords": [],
    }

    total_saved = 0
    for index, keyword in enumerate(REDDIT_KEYWORDS, start=1):
        records = crawl_keyword(session, keyword)
        manifest["keywords"].append(
            {
                "keyword": keyword,
                "saved_count": len(records),
                "post_ids": [r["reddit_post_id"] for r in records],
            }
        )
        total_saved += len(records)
        if index < len(REDDIT_KEYWORDS):
            time.sleep(REDDIT_REQUEST_DELAY)

    write_keyword_manifest(manifest)
    print(f"\n完成：共保存 {total_saved} 条图片帖到 {DATA_RAW_DIR}")


if __name__ == "__main__":
    run()
