# -*- coding: utf-8 -*-
"""
使用 Spider_XHS 的稳定接口链路恢复本地图片：
1. 从 data/raw 读取笔记标题、note_id、旧图片 URL
2. 对每条笔记用标题搜索，拿到最新 xsec_token
3. 调 get_note_info() 获取最新 image_list
4. 下载最新图片，并按旧 URL 的 hash 文件名写回 backend/public/uploads/xhs/

特点：
- 不改数据库
- 已存在文件自动跳过
- 支持断点续跑
- 比直接 Playwright 打开详情页更稳定
"""
import hashlib
import json
import os
import random
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).parent
SPIDER_LIB = ROOT / "spider_xhs_lib"
sys.path.insert(0, str(SPIDER_LIB))
os.chdir(str(SPIDER_LIB))

load_dotenv(ROOT / ".env", override=True)
COOKIE = os.getenv("COOKIES", "")

from apis.xhs_pc_apis import XHS_Apis

RAW_DIR = ROOT / "data" / "raw"
UPLOAD_DIR = ROOT.parent / "backend" / "public" / "uploads" / "xhs"
LOG_FILE = ROOT / "restore_all_xhs_images_via_spider.log"
PROGRESS_FILE = ROOT / "restore_all_xhs_images_via_spider.progress.json"


def log(msg):
    text = str(msg)
    print(text)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(text + "\n")


def old_url_to_filename(url: str) -> str:
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    return f"{h}.webp"


def load_tasks():
    tasks = []
    for path in RAW_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        note_id = str(data.get("xhs_note_id") or path.stem)
        title = (data.get("title") or "").strip()
        images = data.get("images") or []
        if not note_id or not title or not isinstance(images, list) or not images:
            continue

        filenames = []
        missing = []
        for u in images:
            if not isinstance(u, str) or not u.strip():
                continue
            fn = old_url_to_filename(u.strip())
            filenames.append(fn)
            if not (UPLOAD_DIR / fn).exists():
                missing.append(fn)

        if missing:
            tasks.append({
                "note_id": note_id,
                "title": title,
                "filenames": filenames,
                "missing": missing,
            })
    return tasks


def save_progress(index, ok_notes, fail_notes, written_files):
    PROGRESS_FILE.write_text(
        json.dumps(
            {
                "index": index,
                "ok_notes": ok_notes,
                "fail_notes": fail_notes,
                "written_files": written_files,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def load_progress():
    if not PROGRESS_FILE.exists():
        return {"index": 0, "ok_notes": 0, "fail_notes": 0, "written_files": 0}
    try:
        return json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"index": 0, "ok_notes": 0, "fail_notes": 0, "written_files": 0}


def search_note_url(xhs: XHS_Apis, title: str, note_id: str) -> str:
    """用标题搜索，找到目标 note_id 对应的最新 note_url。"""
    queries = [title]
    if len(title) > 12:
        queries.append(title[:12])
    if len(title) > 8:
        queries.append(title[:8])

    for query in queries:
        success, msg, notes = xhs.search_some_note(query, 10, COOKIE, 0, 2, 0, 0, 0, None)
        if not success or not notes:
            continue
        for n in notes:
            if str(n.get("id", "")) == note_id:
                xsec_token = n.get("xsec_token", "")
                return f"https://www.xiaohongshu.com/explore/{note_id}?xsec_token={xsec_token}&xsec_source=pc_search"
    return ""


def latest_image_urls_from_detail(xhs: XHS_Apis, note_url: str):
    success, msg, detail = xhs.get_note_info(note_url, COOKIE)
    if not success:
        raise RuntimeError(str(msg))
    items = ((detail or {}).get("data") or {}).get("items") or []
    if not items:
        return []
    note = items[0].get("note_card") or {}
    urls = []
    for img in note.get("image_list") or []:
        if isinstance(img, dict):
            info_list = img.get("info_list") or []
            if info_list:
                u = info_list[0].get("url") or info_list[-1].get("url")
                if u:
                    urls.append(u)
            else:
                u = img.get("url_default") or img.get("url") or img.get("urlPre")
                if u:
                    urls.append(u)
        elif isinstance(img, str):
            urls.append(img)
    # 去重保序
    out = []
    seen = set()
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def download_one(session: requests.Session, url: str, local_path: Path):
    r = session.get(
        url,
        headers={
            "Referer": "https://www.xiaohongshu.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "image/webp,image/*,*/*;q=0.8",
        },
        timeout=30,
        stream=True,
    )
    r.raise_for_status()
    with open(local_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)


def run():
    if not COOKIE:
        log("错误：.env 里没有 COOKIES")
        return

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    xhs = XHS_Apis()
    session = requests.Session()

    tasks = load_tasks()
    if not LOG_FILE.exists():
        LOG_FILE.write_text("", encoding="utf-8")
    log(f"tasks={len(tasks)}")
    if not tasks:
        return

    prog = load_progress()
    start_index = int(prog.get("index", 0))
    ok_notes = int(prog.get("ok_notes", 0))
    fail_notes = int(prog.get("fail_notes", 0))
    written_files = int(prog.get("written_files", 0))
    log(f"resume_from={start_index} ok={ok_notes} fail={fail_notes} files={written_files}")

    for i, task in enumerate(tasks[start_index:], start=start_index + 1):
        note_id = task["note_id"]
        title = task["title"]
        try:
            note_url = search_note_url(xhs, title, note_id)
            if not note_url:
                fail_notes += 1
                log(f"[{i}/{len(tasks)}] {note_id} note_url_not_found")
                save_progress(i, ok_notes, fail_notes, written_files)
                time.sleep(random.uniform(6, 10))
                continue

            img_urls = latest_image_urls_from_detail(xhs, note_url)
            if not img_urls:
                fail_notes += 1
                log(f"[{i}/{len(tasks)}] {note_id} no_images")
                save_progress(i, ok_notes, fail_notes, written_files)
                time.sleep(random.uniform(6, 10))
                continue

            write_count = min(len(task["filenames"]), len(img_urls))
            local_written = 0
            for idx in range(write_count):
                filename = task["filenames"][idx]
                local_path = UPLOAD_DIR / filename
                if local_path.exists():
                    continue
                try:
                    download_one(session, img_urls[idx], local_path)
                    local_written += 1
                    written_files += 1
                except Exception:
                    pass

            if local_written > 0:
                ok_notes += 1
                log(f"[{i}/{len(tasks)}] {note_id} restored={local_written}")
            else:
                fail_notes += 1
                log(f"[{i}/{len(tasks)}] {note_id} restored=0")

            save_progress(i, ok_notes, fail_notes, written_files)

            # 慢速稳定模式
            time.sleep(random.uniform(8, 15))
            if i % 5 == 0:
                rest = random.uniform(60, 120)
                log(f"rest_after_{i} sleep={rest:.0f}s")
                time.sleep(rest)
            if i % 20 == 0:
                log(f"progress notes_ok={ok_notes} notes_fail={fail_notes} files={written_files}")

        except Exception as e:
            fail_notes += 1
            err = repr(e)
            log(f"[{i}/{len(tasks)}] {note_id} error={err}")
            save_progress(i, ok_notes, fail_notes, written_files)

            # 风控 / 权限 / 超时：长休后继续
            if ("461" in err) or ("权限" in err) or ("timeout" in err.lower()) or ("risk" in err.lower()):
                rest = random.uniform(180, 300)
                log(f"risk_pause_after_{i} sleep={rest:.0f}s")
                time.sleep(rest)
            else:
                time.sleep(random.uniform(15, 30))

    log(f"done ok_notes={ok_notes} fail_notes={fail_notes} files={written_files}")


if __name__ == "__main__":
    run()
