# -*- coding: utf-8 -*-
"""
为 data/raw/ 里已有笔记补全正文与图片（打开详情页抓取）。
若 content 为空或与 title 相同，说明只有列表数据，可运行本脚本补全。
"""
import json
import time
from pathlib import Path

import config
from config import CRAWL_DELAY, DATA_RAW_DIR, KEYWORD

from crawler import (
    _fetch_note_detail,
    _save_note,
    STATE_FILE,
)


def run():
    raw_files = list(DATA_RAW_DIR.glob("*.json"))
    raw_files = [f for f in raw_files if f.name != ".gitkeep"]
    if not raw_files:
        print("data/raw/ 下没有笔记 JSON，请先运行 crawler.py。")
        return

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("请先安装: pip install playwright && playwright install chromium")
        return

    base_url = "https://www.xiaohongshu.com"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            locale="zh-CN",
            storage_state=str(STATE_FILE) if STATE_FILE.exists() else None,
        )
        page = context.new_page()

        if not STATE_FILE.exists():
            print("未找到登录状态 playwright_state.json，请先运行 crawler.py 并完成登录。")
            context.close()
            browser.close()
            return

        print(f"共 {len(raw_files)} 条，开始补全正文与图片…")
        for i, path in enumerate(raw_files):
            with open(path, "r", encoding="utf-8") as f:
                rec = json.load(f)
            nid = rec.get("xhs_note_id", path.stem)
            title = (rec.get("title") or "").strip()
            content = (rec.get("content") or "").strip()
            if content and content != title and len(content) > len(title) + 5:
                print(f"  跳过（已有正文）[{i+1}/{len(raw_files)}] {nid}")
                continue
            try:
                debug_path = DATA_RAW_DIR / "_detail_sample.json" if i == 0 else None
                detail = _fetch_note_detail(page, nid, KEYWORD, base_url, debug_save_path=debug_path)
                if detail:
                    rec["content"] = detail.get("content") or rec.get("content") or ""
                    if detail.get("content_html") is not None:
                        rec["content_html"] = detail["content_html"]
                    if detail.get("images"):
                        rec["images"] = detail["images"]
                    _save_note(rec)
                    print(f"  已补全 [{i+1}/{len(raw_files)}] {nid}")
                else:
                    print(f"  未拿到详情 [{i+1}/{len(raw_files)}] {nid}")
                time.sleep(CRAWL_DELAY)
            except Exception as e:
                print(f"  失败 {nid}: {e}")
            time.sleep(CRAWL_DELAY)

        context.storage_state(path=str(STATE_FILE))
        context.close()
        browser.close()
    print("补全结束。")


if __name__ == "__main__":
    run()
