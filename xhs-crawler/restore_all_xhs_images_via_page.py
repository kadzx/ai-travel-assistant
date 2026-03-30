# -*- coding: utf-8 -*-
"""
按 data/raw 全量恢复小红书图片到 backend/public/uploads/xhs/
策略：
- 使用 raw 中旧图片 URL 计算旧文件名（与数据库当前引用一致）
- 打开对应 note_id 的详情页
- 直接拦截页面真实加载的图片响应（200）
- 按顺序将响应二进制写回旧文件名

这样不依赖旧直链，也不依赖不稳定的详情接口结构。
"""
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import time
import random

ROOT = Path(__file__).parent
RAW_DIR = ROOT / 'data' / 'raw'
UPLOAD_DIR = ROOT.parent / 'backend' / 'public' / 'uploads' / 'xhs'
STATE_FILE = ROOT / 'playwright_state.json'
LOG_FILE = ROOT / 'restore_all_xhs_images_via_page.log'
PROGRESS_FILE = ROOT / 'restore_all_xhs_images_via_page.progress.json'


def log(msg):
    text = str(msg)
    print(text)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(text + '\n')


def old_url_to_filename(url: str) -> str:
    h = hashlib.sha256(url.encode('utf-8')).hexdigest()[:24]
    return f'{h}.webp'


def load_tasks():
    tasks = []
    for path in RAW_DIR.glob('*.json'):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            continue
        note_id = data.get('xhs_note_id') or path.stem
        images = data.get('images') or []
        if not note_id or not isinstance(images, list) or not images:
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
                'note_id': note_id,
                'title': data.get('title') or '',
                'filenames': filenames,
                'missing': missing,
            })
    return tasks


def capture_page_images(page, note_id: str):
    captured = []

    def on_response(resp):
        try:
            host = (urlparse(resp.url).hostname or '').lower()
            if 'xhscdn.com' not in host:
                return
            if resp.request.resource_type != 'image':
                return
            if resp.status != 200:
                return
            body = resp.body()
            if body and len(body) > 10000:
                captured.append((resp.url, body))
        except Exception:
            return

    page.on('response', on_response)
    page.goto(f'https://www.xiaohongshu.com/explore/{note_id}', wait_until='networkidle', timeout=45000)
    page.wait_for_timeout(5000)

    # 去重，排除头像等小图
    uniq = []
    seen = set()
    for url, body in captured:
        key = (url, len(body))
        if key in seen:
            continue
        seen.add(key)
        uniq.append((url, body))
    return uniq


def save_progress(index, ok_notes, fail_notes, written_files):
    PROGRESS_FILE.write_text(json.dumps({
        'index': index,
        'ok_notes': ok_notes,
        'fail_notes': fail_notes,
        'written_files': written_files,
    }, ensure_ascii=False, indent=2), encoding='utf-8')


def load_progress():
    if not PROGRESS_FILE.exists():
        return {'index': 0, 'ok_notes': 0, 'fail_notes': 0, 'written_files': 0}
    try:
        return json.loads(PROGRESS_FILE.read_text(encoding='utf-8'))
    except Exception:
        return {'index': 0, 'ok_notes': 0, 'fail_notes': 0, 'written_files': 0}


def run():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    tasks = load_tasks()
    if not LOG_FILE.exists():
        LOG_FILE.write_text('', encoding='utf-8')
    log(f'tasks={len(tasks)}')
    if not tasks:
        return

    prog = load_progress()
    start_index = int(prog.get('index', 0))
    ok_notes = int(prog.get('ok_notes', 0))
    fail_notes = int(prog.get('fail_notes', 0))
    written_files = int(prog.get('written_files', 0))
    log(f'resume_from={start_index} ok={ok_notes} fail={fail_notes} files={written_files}')

    with sync_playwright() as p:
        browser = None
        context = None
        page = None

        def reopen_browser():
            nonlocal browser, context, page
            try:
                if page:
                    page.close()
            except Exception:
                pass
            try:
                if context:
                    context.close()
            except Exception:
                pass
            try:
                if browser:
                    browser.close()
            except Exception:
                pass
            browser = p.chromium.launch(
                headless=True,
                args=["--no-proxy-server", "--proxy-bypass-list=*"],
            )
            context = browser.new_context(storage_state=str(STATE_FILE) if STATE_FILE.exists() else None)
            page = context.new_page()

        reopen_browser()

        for i, task in enumerate(tasks[start_index:], start=start_index + 1):
            note_id = task['note_id']
            try:
                imgs = capture_page_images(page, note_id)
                if not imgs:
                    log(f'[{i}/{len(tasks)}] {note_id} no_images')
                    fail_notes += 1
                else:
                    write_count = min(len(task['filenames']), len(imgs))
                    local_written = 0
                    for idx in range(write_count):
                        filename = task['filenames'][idx]
                        local_path = UPLOAD_DIR / filename
                        if local_path.exists():
                            continue
                        try:
                            with open(local_path, 'wb') as f:
                                f.write(imgs[idx][1])
                            local_written += 1
                            written_files += 1
                        except Exception:
                            pass

                    if local_written > 0:
                        ok_notes += 1
                        log(f'[{i}/{len(tasks)}] {note_id} restored={local_written}')
                    else:
                        fail_notes += 1
                        log(f'[{i}/{len(tasks)}] {note_id} restored=0')

                save_progress(i, ok_notes, fail_notes, written_files)

                # 慢速模式：每条后随机等待
                sleep_s = random.uniform(8, 15)
                time.sleep(sleep_s)

                # 每 5 条长休一次，并重开浏览器降低风控
                if i % 5 == 0:
                    rest = random.uniform(60, 120)
                    log(f'rest_after_{i} sleep={rest:.0f}s')
                    time.sleep(rest)
                    reopen_browser()

                if i % 20 == 0:
                    log(f'progress notes_ok={ok_notes} notes_fail={fail_notes} files={written_files}')

            except Exception as e:
                fail_notes += 1
                err = repr(e)
                log(f'[{i}/{len(tasks)}] {note_id} error={err}')
                save_progress(i, ok_notes, fail_notes, written_files)

                # 风控/超时/崩溃 -> 长休 + 重开浏览器
                if ('461' in err) or ('Timeout' in err) or ('crashed' in err) or ('IP' in err):
                    rest = random.uniform(180, 300)
                    log(f'risk_pause_after_{i} sleep={rest:.0f}s')
                    time.sleep(rest)
                    reopen_browser()
                else:
                    time.sleep(random.uniform(15, 30))

        try:
            if page:
                page.close()
        except Exception:
            pass
        try:
            if context:
                context.close()
        except Exception:
            pass
        try:
            if browser:
                browser.close()
        except Exception:
            pass

    log(f'done ok_notes={ok_notes} fail_notes={fail_notes} files={written_files}')


if __name__ == '__main__':
    run()
