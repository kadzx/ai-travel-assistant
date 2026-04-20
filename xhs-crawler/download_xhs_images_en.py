# -*- coding: utf-8 -*-
"""
将 posts 表中 lang='en' 的帖子的 xhscdn 图片 URL 下载到本地，并更新为本地 URL。
图片存放在 backend/public/uploads/xhs_en/，与中文帖子图片隔离。
幂等：可重复执行，已存在的文件不重复下载。
"""
import hashlib
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env", override=True)
_backend_env = Path(__file__).parent.parent / "backend" / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env, override=False)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASS") or os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "travel_assistant_db")
UPLOAD_BASE_URL = os.getenv("UPLOAD_BASE_URL", "http://localhost:3000").rstrip("/")

# 英文帖子图片单独存放
UPLOAD_DIR = Path(__file__).parent.parent / "backend" / "public" / "uploads" / "xhs_en"

XHS_CDN_HOSTS = (
    "sns-webpic-qc.xhscdn.com",
    "sns-webpic.xhscdn.com",
    "ci.xiaohongshu.com",
    "xhscdn.com",
)
REFERER = "https://www.xiaohongshu.com/"
REQUEST_TIMEOUT = 15


def get_connection():
    import pymysql
    return pymysql.connect(
        host=DB_HOST, port=int(DB_PORT), user=DB_USER, password=DB_PASSWORD,
        database=DB_NAME, charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor,
    )


def is_xhscdn_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        return False
    from urllib.parse import urlparse
    host = (urlparse(url).hostname or "").lower()
    return any(host == h or host.endswith("." + h) for h in XHS_CDN_HOSTS)


def url_to_filename(url: str) -> str:
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    return f"{h}.webp"


def ensure_download(url: str, session=None):
    filename = url_to_filename(url)
    local_path = UPLOAD_DIR / filename
    local_url = f"{UPLOAD_BASE_URL}/uploads/xhs_en/{filename}"

    if local_path.exists():
        return local_url, False

    import requests
    req = session or requests.Session()
    try:
        r = req.get(url, headers={
            "Referer": REFERER,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "image/webp,image/*,*/*;q=0.8",
        }, timeout=REQUEST_TIMEOUT, stream=True)
        r.raise_for_status()
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        with open(local_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        return local_url, True
    except Exception as e:
        print(f"    Download failed {url[:60]}... : {e}")
        return url, False


def run():
    print(f"DB: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    print(f"Upload dir: {UPLOAD_DIR}")
    if not DB_PASSWORD:
        print("Error: DB password not found")
        sys.exit(1)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    import requests
    session = requests.Session()

    conn = get_connection()
    updated_posts = 0
    total_downloaded = 0

    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, images FROM posts "
                "WHERE lang = 'en' AND images IS NOT NULL AND images != '' AND images != '[]'"
            )
            rows = cur.fetchall()
        print(f"Found {len(rows)} English posts with images")

        for row in rows:
            post_id = row["id"]
            raw = row["images"]
            try:
                images = json.loads(raw) if isinstance(raw, str) else (raw if isinstance(raw, list) else [])
            except Exception:
                continue
            if not images:
                continue

            new_list = []
            changed = False
            for u in images:
                if not isinstance(u, str) or not u.strip():
                    continue
                u = u.strip()
                if is_xhscdn_url(u):
                    local_url, was_downloaded = ensure_download(u, session)
                    if local_url != u:
                        changed = True
                    if was_downloaded:
                        total_downloaded += 1
                    new_list.append(local_url)
                else:
                    new_list.append(u)

            seen = set()
            deduped = [x for x in new_list if not (x in seen or seen.add(x))]

            if not changed:
                continue

            new_json = json.dumps(deduped, ensure_ascii=False)
            with conn.cursor() as cur:
                cur.execute("UPDATE posts SET images = %s WHERE id = %s", (new_json, post_id))
            conn.commit()
            updated_posts += 1
            if updated_posts % 20 == 0:
                print(f"  Updated {updated_posts} posts...")

    finally:
        conn.close()

    print(f"\nDone! Updated {updated_posts} posts, downloaded {total_downloaded} images.")


if __name__ == "__main__":
    run()
