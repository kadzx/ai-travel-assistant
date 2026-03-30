# -*- coding: utf-8 -*-
"""
从 xhs-crawler/data/raw/*.json 里的 xhscdn 图片链接恢复本地图片文件。
不会改数据库；因为数据库里目前已经是本地 URL，只要把文件恢复到 backend/public/uploads/xhs/ 即可。

命名规则与旧脚本一致：sha256(url)[:24].webp
这样能和数据库中的 http://localhost:3000/uploads/xhs/<hash>.webp 一一对应。
"""
import hashlib
import json
from pathlib import Path

import requests

ROOT = Path(__file__).parent
RAW_DIR = ROOT / "data" / "raw"
UPLOAD_DIR = ROOT.parent / "backend" / "public" / "uploads" / "xhs"
REFERER = "https://www.xiaohongshu.com/"
TIMEOUT = 20
XHS_CDN_HOSTS = (
    "sns-webpic-qc.xhscdn.com",
    "sns-webpic.xhscdn.com",
    "ci.xiaohongshu.com",
    "xhscdn.com",
)


def is_xhscdn_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        return False
    try:
        from urllib.parse import urlparse
        host = (urlparse(url).hostname or "").lower()
        return any(host == h or host.endswith("." + h) for h in XHS_CDN_HOSTS)
    except Exception:
        return False


def url_to_filename(url: str) -> str:
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    return f"{h}.webp"


def iter_raw_image_urls():
    for path in RAW_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        images = data.get("images") or []
        if not isinstance(images, list):
            continue
        for url in images:
            if isinstance(url, str) and is_xhscdn_url(url):
                yield url.strip()


def download_one(session: requests.Session, url: str):
    filename = url_to_filename(url)
    local_path = UPLOAD_DIR / filename
    if local_path.exists():
        return False

    r = session.get(
        url,
        headers={
            "Referer": REFERER,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/webp,image/*,*/*;q=0.8",
        },
        timeout=TIMEOUT,
        stream=True,
    )
    r.raise_for_status()
    with open(local_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
    return True


def run():
    if not RAW_DIR.exists():
        print(f"raw 目录不存在: {RAW_DIR}")
        return
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    all_urls = list(iter_raw_image_urls())
    unique_urls = list(dict.fromkeys(all_urls))
    print(f"raw 图片链接总数: {len(all_urls)}")
    print(f"去重后图片链接数: {len(unique_urls)}")
    print(f"本地目录: {UPLOAD_DIR}")

    downloaded = 0
    skipped = 0
    failed = 0

    session = requests.Session()
    for i, url in enumerate(unique_urls, start=1):
        try:
            was_downloaded = download_one(session, url)
            if was_downloaded:
                downloaded += 1
            else:
                skipped += 1
            if i % 100 == 0:
                print(f"  已处理 {i}/{len(unique_urls)}，新下载 {downloaded}，已存在 {skipped}，失败 {failed}")
        except Exception as e:
            failed += 1
            if failed <= 20:
                print(f"  下载失败: {url[:80]}... -> {e}")

    print(f"\n完成！新下载 {downloaded}，已存在 {skipped}，失败 {failed}")


if __name__ == "__main__":
    run()
