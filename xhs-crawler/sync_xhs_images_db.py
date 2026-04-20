# -*- coding: utf-8 -*-
"""
只做「数据库链接与本地文件对应」：不下载，只根据 backend/public/uploads/xhs/ 里已有文件，
把 posts.images 里的小红书 CDN 链接替换成本地 URL（同一 URL 用与 download_xhs_images 相同的 hash 规则）。
"""
import hashlib
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

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

UPLOAD_DIR = Path(__file__).parent.parent / "backend" / "public" / "uploads" / "xhs"

XHS_CDN_HOSTS = (
    "sns-webpic-qc.xhscdn.com",
    "sns-webpic.xhscdn.com",
    "ci.xiaohongshu.com",
    "xhscdn.com",
)


def get_connection():
    try:
        import pymysql
    except ImportError:
        raise ImportError("请先安装: pip install pymysql python-dotenv")
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
        host = urlparse(url).hostname or ""
        host = host.lower()
        return any(host == h or host.endswith("." + h) for h in XHS_CDN_HOSTS)
    except Exception:
        return False


def normalize_xhscdn_url(url: str) -> str:
    """同一张图可能存成 http/https、末尾有无 /，统一成一种再算 hash，才能和已有文件对上。"""
    url = (url or "").strip()
    try:
        p = urlparse(url)
        path = (p.path or "").rstrip("/") or "/"
        # 统一用 https，去掉 fragment 和多余空白
        return f"https://{p.netloc.lower()}{path}"
    except Exception:
        return url


def url_to_filename_hash(url: str) -> str:
    """与 download_xhs_images 一致：sha256(url)[:24].webp。先做 URL 规范化。"""
    canonical = normalize_xhscdn_url(url)
    h = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:24]
    return f"{h}.webp"


def url_to_filename_from_path(url: str) -> str:
    """从 CDN URL 路径最后一段得到文件名，如 .../1040g2sg31xxx!nd_dft_wlteh_webp_3 -> 1040g2sg31xxx!nd_dft_wlteh_webp_3.webp"""
    try:
        path = urlparse(url).path or ""
        segment = path.rstrip("/").split("/")[-1]
        if segment and "." not in segment:
            return f"{segment}.webp"
    except Exception:
        pass
    return ""


def find_local_filename(url: str, existing_files: set) -> str:
    """根据 xhscdn URL 在已有文件里找对应文件名。尝试：原始 URL 的 hash、规范化 URL 的 hash、路径最后一段+.webp。"""
    candidates = [
        url_to_filename_hash(url),  # 当前脚本用规范化 URL，兼容之前用原始 URL 存的
        hashlib.sha256(url.encode("utf-8")).hexdigest()[:24] + ".webp",  # 原始 URL 的 hash（与 download 脚本当时一致）
        url_to_filename_from_path(url),
    ]
    for name in candidates:
        if name and name in existing_files:
            return name
    return ""


def run():
    print(f"数据库: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    print(f"本地目录: {UPLOAD_DIR}")
    print(f"BASE URL: {UPLOAD_BASE_URL}")
    print("只根据已有文件替换 DB 中的 xhscdn 链接，不下载。\n")
    if not DB_PASSWORD:
        print("错误：未找到数据库密码")
        sys.exit(1)

    if not UPLOAD_DIR.exists():
        print(f"错误：目录不存在 {UPLOAD_DIR}")
        sys.exit(1)

    existing_files = {f.name for f in UPLOAD_DIR.iterdir() if f.is_file()}
    print(f"本地已有 {len(existing_files)} 个文件。\n")

    conn = get_connection()
    updated_posts = 0
    replaced_count = 0

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, images FROM posts WHERE images IS NOT NULL AND images != '' AND images != '[]'")
            rows = cur.fetchall()

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
                    filename = find_local_filename(u, existing_files)
                    if filename:
                        local_url = f"{UPLOAD_BASE_URL}/uploads/xhs/{filename}"
                        new_list.append(local_url)
                        changed = True
                        replaced_count += 1
                    else:
                        new_list.append(u)
                else:
                    new_list.append(u)

            if not changed:
                continue

            seen = set()
            deduped = []
            for x in new_list:
                if x not in seen:
                    seen.add(x)
                    deduped.append(x)
            new_json = json.dumps(deduped, ensure_ascii=False)
            with conn.cursor() as cur:
                cur.execute("UPDATE posts SET images = %s WHERE id = %s", (new_json, post_id))
            conn.commit()
            updated_posts += 1
            if updated_posts % 100 == 0:
                print(f"  已更新 {updated_posts} 条帖子…")

    finally:
        conn.close()

    print(f"\n完成！更新 {updated_posts} 条帖子，共替换 {replaced_count} 个 xhscdn 链接为本地方件对应 URL。")


if __name__ == "__main__":
    run()
