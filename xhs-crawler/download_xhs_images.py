# -*- coding: utf-8 -*-
"""
将 posts 表中 xhscdn 图片 URL 下载到本地，并更新为本地 URL，避免 403。
- 同一 URL 只下载一次（按 URL hash 存盘），多处引用共用同一文件。
- 幂等：可重复执行，已存在的文件不重复下载，已是本地 URL 的项不重复改。
"""
import hashlib
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# 与 db_import 相同的 env 加载顺序
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

# 本地存储目录：backend/public/uploads/xhs/
UPLOAD_DIR = Path(__file__).parent.parent / "backend" / "public" / "uploads" / "xhs"

XHS_CDN_HOSTS = (
    "sns-webpic-qc.xhscdn.com",
    "sns-webpic.xhscdn.com",
    "ci.xiaohongshu.com",
    "xhscdn.com",
)
REFERER = "https://www.xiaohongshu.com/"
REQUEST_TIMEOUT = 15


def get_connection():
    try:
        import pymysql
    except ImportError:
        raise ImportError("请先安装: pip install pymysql requests")
    return pymysql.connect(
        host=DB_HOST,
        port=int(DB_PORT),
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def is_xhscdn_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        return False
    try:
        from urllib.parse import urlparse
        host = urlparse(url).hostname or ""
        host = host.lower()
        return any(host == h or host.endswith("." + h) for h in XHS_CDN_HOSTS)
    except Exception:
        return False


def url_to_filename(url: str) -> str:
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    return f"{h}.webp"


def ensure_download(url: str, session=None):
    """
    若本地已有该 URL 对应文件则直接返回 (本地URL, False)；
    否则下载并保存，返回 (本地URL, True)；失败则返回 (原URL, False)。
    """
    filename = url_to_filename(url)
    local_path = UPLOAD_DIR / filename
    local_url = f"{UPLOAD_BASE_URL}/uploads/xhs/{filename}"

    if local_path.exists():
        return local_url, False

    try:
        import requests
    except ImportError:
        print("  警告: 未安装 requests，跳过下载。pip install requests")
        return url, False

    req = session or requests.Session()
    try:
        r = req.get(
            url,
            headers={
                "Referer": REFERER,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "image/webp,image/*,*/*;q=0.8",
            },
            timeout=REQUEST_TIMEOUT,
            stream=True,
        )
        r.raise_for_status()
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        with open(local_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        return local_url, True
    except Exception as e:
        print(f"    下载失败 {url[:60]}... : {e}")
        return url, False


def run():
    print(f"数据库: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    print(f"本地目录: {UPLOAD_DIR}")
    print(f"BASE URL: {UPLOAD_BASE_URL}")
    if not DB_PASSWORD:
        print("错误：未找到数据库密码，请检查 backend/.env 或 xhs-crawler/.env")
        sys.exit(1)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    try:
        import requests
        session = requests.Session()
    except ImportError:
        session = None

    conn = get_connection()
    updated_posts = 0
    total_downloaded = 0

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, images FROM posts WHERE images IS NOT NULL AND images != '' AND images != '[]'")
            rows = cur.fetchall()

        for row in rows:
            post_id = row["id"]
            raw = row["images"]
            try:
                if isinstance(raw, str):
                    images = json.loads(raw)
                else:
                    images = raw if isinstance(raw, list) else []
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

            # 去重：保持顺序，首次出现的 URL 保留
            seen = set()
            deduped = []
            for x in new_list:
                if x not in seen:
                    seen.add(x)
                    deduped.append(x)

            if not changed:
                continue

            new_json = json.dumps(deduped, ensure_ascii=False)
            with conn.cursor() as cur:
                cur.execute("UPDATE posts SET images = %s WHERE id = %s", (new_json, post_id))
            conn.commit()
            updated_posts += 1
            if updated_posts % 50 == 0:
                print(f"  已更新 {updated_posts} 条帖子…")

    finally:
        conn.close()

    print(f"\n完成！更新 {updated_posts} 条帖子，新下载 {total_downloaded} 张图片。")


if __name__ == "__main__":
    run()
