# -*- coding: utf-8 -*-
import json
import os
from pathlib import Path
from urllib.parse import urlparse

import pymysql
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent
RAW_DIR = ROOT / "data" / "raw"
STATE_FILE = ROOT / "playwright_state.json"
UPLOAD_DIR = ROOT.parent / "backend" / "public" / "uploads" / "xhs"
LOG_FILE = ROOT / "restore_db_posts_images.log"
USER_ID = 1001

load_dotenv(ROOT / ".env", override=True)
load_dotenv(ROOT.parent / "backend" / ".env", override=False)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASS") or os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "travel_assistant_db")


def log(msg):
    text = str(msg)
    print(text)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(text + "\n")


def get_connection():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=10,
        read_timeout=120,
        write_timeout=120,
    )


def filename_from_local_url(url: str) -> str:
    try:
        path = urlparse(url).path or ""
        return path.rstrip("/").split("/")[-1]
    except Exception:
        return ""


def build_raw_title_index():
    index = {}
    for path in RAW_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        title = (data.get("title") or "").strip()
        nid = data.get("xhs_note_id") or path.stem
        if title and nid and title not in index:
            index[title] = {"note_id": nid, "raw_path": str(path)}
    return index


def read_missing_posts():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, title, images FROM posts WHERE user_id=%s AND images IS NOT NULL AND images != '' AND images != '[]' LIMIT 200",
                (USER_ID,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    results = []
    for row in rows:
        raw = row.get("images")
        try:
            images = json.loads(raw) if isinstance(raw, str) else (raw if isinstance(raw, list) else [])
        except Exception:
            continue
        if not images:
            continue
        filenames = [filename_from_local_url(u) for u in images if isinstance(u, str) and u.strip()]
        filenames = [x for x in filenames if x]
        if not filenames:
            continue
        missing = [name for name in filenames if not (UPLOAD_DIR / name).exists()]
        if missing:
            results.append({
                "post_id": row["id"],
                "title": (row.get("title") or "").strip(),
                "filenames": filenames,
                "missing": missing,
            })
    return results


def collect_image_bodies_from_page(page, note_id: str):
    captured = []
    def on_response(resp):
        try:
            host = (urlparse(resp.url).hostname or "").lower()
            if "xhscdn.com" not in host:
                return
            if resp.request.resource_type != "image":
                return
            if resp.status != 200:
                return
            body = resp.body()
            if body:
                captured.append((resp.url, body))
        except Exception:
            return

    page.on("response", on_response)
    try:
        page.goto(f"https://www.xiaohongshu.com/explore/{note_id}", wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(5000)
    finally:
        try:
            page.off("response", on_response)
        except Exception:
            pass

    uniq = []
    seen = set()
    for url, body in captured:
        key = (url, len(body))
        if key in seen:
            continue
        seen.add(key)
        uniq.append((url, body))
    return uniq


def run():
    LOG_FILE.unlink(missing_ok=True)
    log('start')
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    raw_index = build_raw_title_index()
    log(f'raw_index={len(raw_index)}')
    missing_posts = read_missing_posts()
    log(f'missing_posts={len(missing_posts)}')

    tasks = []
    for post in missing_posts:
        hit = raw_index.get(post['title'])
        if hit:
            tasks.append({**post, **hit})
    log(f'tasks={len(tasks)}')
    if not tasks:
        return

    ok_posts = 0
    fail_posts = 0
    written_files = 0

    with sync_playwright() as p:
        log('playwright_start')
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(storage_state=str(STATE_FILE) if STATE_FILE.exists() else None)
        page = context.new_page()
        log('browser_ready')

        for i, task in enumerate(tasks[:20], start=1):
            note_id = task['note_id']
            try:
                log(f'open_note {i} {note_id}')
                imgs = collect_image_bodies_from_page(page, note_id)
                log(f'captured {note_id} {len(imgs)}')
                if not imgs:
                    fail_posts += 1
                    continue
                write_count = min(len(task['filenames']), len(imgs))
                local_written = 0
                for idx in range(write_count):
                    filename = task['filenames'][idx]
                    local_path = UPLOAD_DIR / filename
                    if local_path.exists():
                        continue
                    with open(local_path, 'wb') as f:
                        f.write(imgs[idx][1])
                    local_written += 1
                    written_files += 1
                if local_written > 0:
                    ok_posts += 1
                else:
                    fail_posts += 1
            except Exception as e:
                log(f'error {note_id} {repr(e)}')
                fail_posts += 1

        context.close()
        browser.close()
    log(f'done ok={ok_posts} fail={fail_posts} files={written_files}')


if __name__ == '__main__':
    run()
