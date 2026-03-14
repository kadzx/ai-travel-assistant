# -*- coding: utf-8 -*-
"""
阶段 1：爬取「旅游规划」关键词的小红书笔记，解析正文 + 图片链接，写入 data/raw/。
依赖：xhshow（签名）、requests。运行前请在 .env 中配置 Cookie。
"""
import json
import time
from pathlib import Path

import requests

import config
from config import (
    CRAWL_DELAY,
    CRAWL_MAX_NOTES,
    DATA_RAW_DIR,
    KEYWORD,
    PAGE_SIZE,
    XHS_API_BASE,
    get_cookies_dict,
)

# 小红书 Web 接口路径（若失效可从浏览器 F12 抓包更新）
SEARCH_NOTES_URI = f"{XHS_API_BASE}/api/sns/web/v1/search/notes"
# 笔记详情：常见为 feed 或 note 接口，需根据实际抓包确认
NOTE_FEED_URI = f"{XHS_API_BASE}/api/sns/web/v1/note"


def ensure_raw_dir():
    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)


def get_signed_headers_get(uri: str, params: dict):
    """使用 xhshow 生成带签名的 GET 请求头。"""
    try:
        from xhshow import Xhshow
    except ImportError:
        raise ImportError("请先安装: pip install xhshow")
    client = Xhshow()
    cookies = get_cookies_dict()
    headers = client.sign_headers_get(uri=uri, cookies=cookies, params=params)
    return headers


def fetch_search_page(keyword: str, page: int = 1, search_id: str = "", session_id: str = ""):
    """
    请求搜索接口一页，返回本页的 note_id 列表及翻页用 search_id/session_id。
    若接口路径或返回结构不同，需根据实际响应调整解析逻辑。
    """
    params = {
        "keyword": keyword,
        "page": page,
    }
    if search_id:
        params["search_id"] = search_id
    if session_id:
        params["session_id"] = session_id

    headers = get_signed_headers_get(SEARCH_NOTES_URI, params)
    base_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.xiaohongshu.com/",
    }
    base_headers.update(headers)
    cookies = get_cookies_dict()

    resp = requests.get(
        SEARCH_NOTES_URI,
        params=params,
        headers=base_headers,
        cookies=cookies,
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    note_ids = []
    next_search_id = search_id
    next_session_id = session_id

    # 根据实际接口返回结构调整；常见为 data.data.items 或 data.data.note_list 等
    items = (
        data.get("data", {})
        .get("items", data.get("data", {}).get("note_list", []))
    )
    if isinstance(items, list):
        for item in items:
            nid = item.get("id") or item.get("note_id") or item.get("id_str")
            if nid:
                note_ids.append(str(nid))
    # 翻页字段名可能为 search_id / session_id 或 cursor
    next_search_id = (
        data.get("data", {}).get("search_id") or next_search_id
    )
    next_session_id = (
        data.get("data", {}).get("session_id") or next_session_id
    )

    return note_ids, next_search_id, next_session_id


def fetch_note_detail(note_id: str) -> dict | None:
    """
    请求笔记详情，解析为统一格式：xhs_note_id, title, content, images, tags, source。
    若详情接口路径或参数名不同，需根据抓包结果修改。
    """
    # 详情接口常见参数：note_id 或 target_note_id
    params = {"note_id": note_id}
    headers = get_signed_headers_get(NOTE_FEED_URI, params)
    base_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.xiaohongshu.com/",
    }
    base_headers.update(headers)
    cookies = get_cookies_dict()

    resp = requests.get(
        NOTE_FEED_URI,
        params=params,
        headers=base_headers,
        cookies=cookies,
        timeout=15,
    )
    if resp.status_code != 200:
        return None
    data = resp.json()

    # 解析：实际字段路径需按接口返回调整，常见为 data.data.note 或 data.note 等
    note = (
        data.get("data", {}).get("note")
        or data.get("data", {}).get("note_card", {})
        or data.get("note", {})
    )
    if not note:
        return None

    title = (
        note.get("title")
        or note.get("display_title")
        or note.get("note_card", {}).get("title", "")
    )
    desc = (
        note.get("desc")
        or note.get("content")
        or note.get("note_card", {}).get("desc", "")
    )
    content = title + "\n" + desc if title and desc else (title or desc or "")

    images = []
    image_list = (
        note.get("image_list")
        or note.get("images")
        or note.get("note_card", {}).get("image_list", [])
    )
    for img in image_list or []:
        if isinstance(img, str):
            images.append(img)
        else:
            url = img.get("url_default") or img.get("url") or img.get("urlPre")
            if url:
                images.append(url)
    # 若无 image_list，尝试 info_list 等
    if not images:
        for info in note.get("image_list", []) or []:
            if isinstance(info, dict):
                u = info.get("url") or info.get("url_default")
                if u:
                    images.append(u)

    tags = [KEYWORD]
    tag_list = note.get("tag_list") or note.get("tags") or []
    for t in tag_list or []:
        name = t.get("name") if isinstance(t, dict) else t
        if name and name not in tags:
            tags.append(name)

    return {
        "xhs_note_id": note_id,
        "title": (title or "无标题")[:255],
        "content": content or "",
        "images": images,
        "tags": tags,
        "source": "xiaohongshu",
    }


def save_note_raw(record: dict):
    """单条笔记写入 data/raw/{xhs_note_id}.json。"""
    ensure_raw_dir()
    nid = record.get("xhs_note_id", "unknown")
    path = DATA_RAW_DIR / f"{nid}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)


def run():
    """主流程：分页搜索 → 每条拉详情 → 落盘；达到 CRAWL_MAX_NOTES 或无更多则停止。"""
    if not get_cookies_dict().get("a1"):
        print("请在 .env 中配置 XHS_A1、XHS_WEB_SESSION、XHS_WEB_ID 后再运行。")
        return

    ensure_raw_dir()
    total_saved = 0
    page = 1
    search_id = ""
    session_id = ""
    seen_ids = set()

    print(f"关键词: {KEYWORD}, 延迟: {CRAWL_DELAY}s, 最大条数: {CRAWL_MAX_NOTES or '不限制'}")
    while True:
        if CRAWL_MAX_NOTES and total_saved >= CRAWL_MAX_NOTES:
            print(f"已达上限 {CRAWL_MAX_NOTES} 条，停止。")
            break
        try:
            note_ids, search_id, session_id = fetch_search_page(
                KEYWORD, page=page, search_id=search_id, session_id=session_id
            )
        except Exception as e:
            print(f"搜索第 {page} 页失败: {e}")
            break
        if not note_ids:
            print(f"第 {page} 页无结果，结束。")
            break
        print(f"第 {page} 页拿到 {len(note_ids)} 个 note_id")
        for nid in note_ids:
            if nid in seen_ids:
                continue
            if CRAWL_MAX_NOTES and total_saved >= CRAWL_MAX_NOTES:
                break
            time.sleep(CRAWL_DELAY)
            record = fetch_note_detail(nid)
            if record:
                save_note_raw(record)
                seen_ids.add(nid)
                total_saved += 1
                print(f"  已保存 [{total_saved}] {nid}")
        page += 1
        time.sleep(CRAWL_DELAY)
    print(f"阶段 1 完成，共落盘 {total_saved} 条，目录: {DATA_RAW_DIR}")


if __name__ == "__main__":
    run()
