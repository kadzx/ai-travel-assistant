# -*- coding: utf-8 -*-
"""
阶段 1：用 Playwright 打开小红书搜索页，抓取网络响应中的笔记数据，写入 data/raw/。
首次运行会打开浏览器，请扫码登录；之后会复用登录状态。
"""
import json
import random
import time
from pathlib import Path
from typing import Optional

import config
from config import (
    CRAWL_DELAY,
    CRAWL_MAX_NOTES,
    CRAWL_REST_EVERY,
    CRAWL_REST_SECONDS,
    DATA_RAW_DIR,
    KEYWORD,
)

# 登录状态保存路径（复用 Cookie，避免每次扫码）
STATE_FILE = config.BASE_DIR / "playwright_state.json"


def ensure_raw_dir():
    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)


def _parse_notes_from_response(body: dict, keyword: str) -> list[dict]:
    """从接口 JSON 里解析出笔记列表，转为统一格式。"""
    records = []
    inner = body.get("data", body)
    if not isinstance(inner, dict):
        return records
    items = (
        inner.get("items")
        or inner.get("note_list")
        or inner.get("notes")
        or inner.get("note_card_list")
        or []
    )
    for item in items:
        card = item.get("note_card") or item.get("note") or item
        if not isinstance(card, dict):
            continue
        nid = (
            card.get("note_id")
            or card.get("id")
            or card.get("id_str")
            or item.get("note_id")
            or item.get("id")
        )
        if not nid:
            continue
        nid = str(nid)
        title = card.get("title") or card.get("display_title") or ""
        desc = card.get("desc") or card.get("content") or ""
        content = (title + "\n" + desc).strip() or "无标题"
        # feed 等接口的 desc 为富文本 HTML，落盘时一并保存
        content_html = card.get("desc") or card.get("html") or card.get("content_html") or None
        images = []
        for img in card.get("image_list") or card.get("images") or []:
            if isinstance(img, str):
                images.append(img)
            else:
                u = img.get("url_default") or img.get("url") or img.get("urlPre")
                if u:
                    images.append(u)
        cover = card.get("cover") or {}
        if isinstance(cover, dict):
            u = cover.get("url_default") or cover.get("url") or cover.get("urlPre")
            if u and u not in images:
                images.insert(0, u)
        tags = [keyword]
        for t in card.get("tag_list") or card.get("tags") or []:
            name = t.get("name") if isinstance(t, dict) else t
            if name and name not in tags:
                tags.append(name)
        rec = {
            "xhs_note_id": nid,
            "title": (title or "无标题")[:255],
            "content": content or "",
            "images": images,
            "tags": tags,
            "source": "xiaohongshu",
        }
        if content_html:
            rec["content_html"] = content_html
        records.append(rec)
    return records


def _save_note(record: dict):
    nid = record.get("xhs_note_id", "unknown")
    path = DATA_RAW_DIR / f"{nid}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)


def _extract_note_from_obj(obj: dict, note_id: str) -> dict | None:
    """从任意嵌套对象里找到 note_id 匹配的笔记对象。"""
    if not isinstance(obj, dict):
        return None
    nid = str(obj.get("note_id") or obj.get("id") or "")
    if nid == note_id:
        return obj
    for v in obj.values():
        if isinstance(v, dict):
            found = _extract_note_from_obj(v, note_id)
            if found:
                return found
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    found = _extract_note_from_obj(item, note_id)
                    if found:
                        return found
    return None


def _parse_note_detail_from_response(body: dict, note_id: str) -> dict | None:
    """从接口（如 feed /api/sns/web/v1/feed）响应里解析正文。feed 里的 desc 即富文本 HTML。"""
    note = _extract_note_from_obj(body, note_id)
    if not note:
        return None
    title = note.get("title") or note.get("display_title") or ""
    desc = note.get("desc") or note.get("content") or ""
    # feed 接口的 desc 为富文本 HTML，直接作为 content_html
    content_html = (
        note.get("desc")
        or note.get("html")
        or note.get("content_html")
        or note.get("desc_html")
        or None
    )
    content = (title + "\n" + (desc or "")).strip() or ""
    images = []
    for img in note.get("image_list") or note.get("images") or []:
        if isinstance(img, str):
            images.append(img)
        else:
            u = img.get("url_default") or img.get("url") or img.get("urlPre")
            if u:
                images.append(u)
    cover = note.get("cover") or {}
    if isinstance(cover, dict):
        u = cover.get("url_default") or cover.get("url") or cover.get("urlPre")
        if u and u not in images:
            images.insert(0, u)
    if not content and not content_html and not images:
        return None
    out = {"content": content or title or "无标题", "images": images}
    if content_html:
        out["content_html"] = content_html
    return out


def _parse_note_from_state_obj(note: dict, note_id: str) -> dict | None:
    """把从 __INITIAL_STATE__ 里取出的 note 对象转成统一格式。"""
    if not note or not isinstance(note, dict):
        return None
    desc = note.get("desc") or note.get("content") or note.get("note_content") or ""
    title = note.get("title") or note.get("display_title") or ""
    images = []
    for img in note.get("image_list") or note.get("images") or []:
        if isinstance(img, str):
            images.append(img)
        else:
            u = img.get("url_default") or img.get("url") or img.get("urlPre")
            if u:
                images.append(u)
    cover = note.get("cover") or {}
    if isinstance(cover, dict):
        u = cover.get("url_default") or cover.get("url") or cover.get("urlPre")
        if u and u not in images:
            images.insert(0, u)
    if not desc and not title:
        return None
    content = (title + "\n" + desc).strip() or desc or title
    out = {"content": content or "无标题", "images": images}
    if desc and (desc.strip().startswith("<") or "</" in desc):
        out["content_html"] = desc.strip()
    else:
        out["content_html"] = desc.strip() or None
    return out


def _extract_note_from_page_state(page, note_id: str) -> dict | None:
    """从详情页的 __INITIAL_STATE__ / __INITIAL_SSR_STATE__ 中解析笔记正文与图片。"""
    import re
    # 先等页面可能异步注入 state
    time.sleep(1.5)
    try:
        raw = page.evaluate(
            """(noteId) => {
  const state = window.__INITIAL_STATE__ || window.__INITIAL_SSR_STATE__ || {};
  function findNote(obj, id) {
    if (!obj || typeof obj !== 'object') return null;
    const nid = String(obj.note_id || obj.noteId || obj.id || '');
    if (nid === id) return obj;
    if (Array.isArray(obj)) {
      for (const x of obj) { const r = findNote(x, id); if (r) return r; }
      return null;
    }
    for (const k of Object.keys(obj)) {
      const r = findNote(obj[k], id);
      if (r) return r;
    }
    return null;
  }
  let note = null;
  if (state.note && state.note.noteDetailMap && state.note.noteDetailMap[noteId])
    note = state.note.noteDetailMap[noteId];
  if (!note && state.NoteView && state.NoteView.noteInfo)
    note = state.NoteView.noteInfo;
  if (!note) note = findNote(state, noteId);
  return note;
}""",
            note_id,
        )
    except Exception:
        raw = None
    if raw and isinstance(raw, dict):
        return _parse_note_from_state_obj(raw, note_id)
    # 兜底：从 HTML 里用正则抠出 __INITIAL_STATE__ 的 JSON（常见于 SSR）
    try:
        html = page.content()
        state = None
        idx = html.find("__INITIAL_STATE__")
        if idx >= 0:
            start = html.find("{", idx)
            if start >= 0:
                depth = 0
                for i in range(start, len(html)):
                    if html[i] == "{":
                        depth += 1
                    elif html[i] == "}":
                        depth -= 1
                        if depth == 0:
                            json_str = html[start : i + 1]
                            if "undefined" in json_str:
                                json_str = json_str.replace("undefined", "null")
                            try:
                                state = json.loads(json_str)
                            except json.JSONDecodeError:
                                state = None
                            break
                else:
                    state = None
            else:
                state = None
        else:
            state = None
        if state is not None:
            note = None
            if isinstance(state, dict):
                ndm = (state.get("note") or {}).get("noteDetailMap") or {}
                note = ndm.get(note_id)
            if not note and isinstance(state, dict):
                nv = state.get("NoteView") or {}
                note = nv.get("noteInfo")
            if not note and isinstance(state, dict):

                def find_in(obj, nid):
                    if obj is None:
                        return None
                    if isinstance(obj, dict):
                        if str(obj.get("note_id") or obj.get("noteId") or "") == nid:
                            return obj
                        for v in obj.values():
                            r = find_in(v, nid)
                            if r is not None:
                                return r
                        return None
                    if isinstance(obj, list):
                        for x in obj:
                            r = find_in(x, nid)
                            if r is not None:
                                return r
                    return None

                note = find_in(state, note_id)
            if note and isinstance(note, dict):
                return _parse_note_from_state_obj(note, note_id)
    except Exception:
        pass
    return None


def _fetch_note_detail(page, note_id: str, keyword: str, base_url: str, debug_save_path: Optional[Path] = None) -> dict | None:
    """打开笔记详情页，从页面状态 / 网络响应 / DOM 抓取正文和图片。"""
    detail_url = f"{base_url}/explore/{note_id}"
    detail_result = [None]

    def on_detail_response(response):
        if detail_result[0] is not None:
            return
        if "edith.xiaohongshu.com" not in response.url or response.status != 200:
            return
        try:
            body = response.json()
        except Exception:
            return
        if debug_save_path and not debug_save_path.exists():
            try:
                with open(debug_save_path, "w", encoding="utf-8") as f:
                    json.dump(body, f, ensure_ascii=False, indent=2)
            except Exception:
                pass
        parsed = _parse_note_detail_from_response(body, note_id)
        if parsed:
            detail_result[0] = parsed

    page.on("response", on_detail_response)
    try:
        page.goto(detail_url, wait_until="networkidle", timeout=15000)
        time.sleep(2.5)
    except Exception:
        pass
    try:
        page.off("response", on_detail_response)
    except Exception:
        pass

    if detail_result[0] is not None:
        print(f"    [debug] {note_id}: 从网络响应拦截获取到内容")
        return detail_result[0]

    # 优先：从页面内嵌的 __INITIAL_STATE__ / __INITIAL_SSR_STATE__ 取正文（单条笔记页会注入完整 note）
    from_state = _extract_note_from_page_state(page, note_id)
    if from_state and (from_state.get("content") or from_state.get("content_html")):
        print(f"    [debug] {note_id}: 从 __INITIAL_STATE__ 获取到内容")
        return from_state

    # 直接取 div.note-content 的文本（评论在兄弟节点 comments-el，不会被包含）
    try:
        nc = page.locator("div.note-content").first
        nc.wait_for(state="visible", timeout=5000)
        # 取 #detail-desc 里的 span 文本
        desc_el = nc.locator("#detail-desc").first
        text = desc_el.inner_text(timeout=3000)
        html = desc_el.inner_html(timeout=3000)
        if text and len(text.strip()) > 5:
            print(f"    [debug] {note_id}: 从 DOM #detail-desc 获取到内容 ({len(text.strip())} 字)")
            return {
                "content": text.strip(),
                "content_html": html.strip() if (html and len(html.strip()) > 10) else None,
                "images": [],
            }
    except Exception:
        pass
    # 兜底：直接取整个 note-content 的文本
    try:
        nc = page.locator("div.note-content").first
        text = nc.inner_text(timeout=3000)
        if text and len(text.strip()) > 5:
            html = nc.inner_html(timeout=3000)
            print(f"    [debug] {note_id}: 从 DOM div.note-content 获取到内容 ({len(text.strip())} 字)")
            return {
                "content": text.strip(),
                "content_html": html.strip() if (html and len(html.strip()) > 10) else None,
                "images": [],
            }
    except Exception:
        pass
    print(f"    [debug] {note_id}: 所有方法均未获取到正文")
    return None


def run():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("请先安装: pip install playwright && playwright install chromium")
        return

    ensure_raw_dir()
    seen = set()
    base_url = "https://www.xiaohongshu.com"
    search_url = f"{base_url}/search_result?keyword={KEYWORD}"
    print(f"关键词: {KEYWORD!r}, 延迟: {CRAWL_DELAY}s")
    print("=" * 60)
    print("策略：你手动滚动页面，程序自动收集笔记 ID。")
    print("滚完后在终端按回车，程序会逐个点击卡片抓正文。")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            locale="zh-CN",
            storage_state=str(STATE_FILE) if STATE_FILE.exists() else None,
        )
        page = context.new_page()

        # 若没有登录状态，先打开首页让用户登录
        if not STATE_FILE.exists():
            print("首次运行：请在打开的浏览器中完成小红书登录（扫码或密码）。")
            page.goto(base_url, wait_until="domcontentloaded", timeout=60000)
            input("登录完成后按回车继续…")
            context.storage_state(path=str(STATE_FILE))
            print("已保存登录状态。")

        collected = []

        def on_response(response):
            url = response.url
            if "edith.xiaohongshu.com" not in url:
                return
            if response.status != 200:
                return
            try:
                body = response.json()
            except Exception:
                return
            if not isinstance(body, dict):
                return
            records = _parse_notes_from_response(body, KEYWORD)
            for rec in records:
                nid = rec.get("xhs_note_id")
                if nid and nid not in seen:
                    seen.add(nid)
                    collected.append(rec)
                    _save_note(rec)
                    try:
                        print(f"  收集到 [{len(collected)}] {nid} {(rec.get('title') or '')[:40]}")
                    except UnicodeEncodeError:
                        t = (rec.get("title") or "")[:40].encode("gbk", errors="replace").decode("gbk")
                        print(f"  收集到 [{len(collected)}] {nid} {t}")

        page.on("response", on_response)
        print(f"\n正在打开搜索页…")
        page.goto(search_url, wait_until="networkidle", timeout=60000)
        time.sleep(2)

        # ===== 阶段 1：用户手动滚动，程序自动收集 ID =====
        print(f"\n>>> 请在浏览器中手动滚动页面，程序会自动收集笔记 ID。")
        print(f">>> 滚够了之后，回到这个终端按回车。\n")
        input("按回车开始抓取正文…")
        print(f"\n共收集到 {len(collected)} 条笔记 ID，开始逐个抓取正文…\n")

        # ===== 阶段 2：在当前页面用 JS fetch 调用 API 获取笔记详情 =====
        # 浏览器会自动带上 Cookie 和签名（x-s 等），不需要我们算
        success_count = 0
        fail_count = 0
        skip_count = 0
        total_valid = sum(1 for r in collected if r.get("xhs_note_id") and len(r["xhs_note_id"]) < 30 and "-" not in r["xhs_note_id"])
        print(f"有效笔记 {total_valid} 条（已过滤脏数据），开始用浏览器内 fetch 获取正文…\n")

        for i, rec in enumerate(collected):
            nid = rec.get("xhs_note_id")
            if not nid:
                continue
            # 跳过非小红书 ID 格式的（如 uuid 格式的脏数据）
            if len(nid) > 30 or "-" in nid:
                continue
            # 已有正文且不只是标题重复的，跳过
            existing_content = rec.get("content") or ""
            existing_title = rec.get("title") or ""
            if existing_content and existing_content.strip() != existing_title.strip() and len(existing_content) > len(existing_title) + 10:
                skip_count += 1
                continue

            try:
                # 在当前搜索页用 JS fetch 请求笔记详情
                result = page.evaluate(
                    """async (noteId) => {
  try {
    // 方法1：用 /api/sns/web/v1/feed 获取笔记详情
    const feedResp = await fetch('https://edith.xiaohongshu.com/api/sns/web/v1/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        source_note_id: noteId,
        image_formats: ['jpg', 'webp', 'avif'],
        extra: { need_body_topic: '1' },
        xsec_source: 'pc_feed',
        xsec_token: ''
      })
    });
    if (feedResp.ok) {
      const data = await feedResp.json();
      // 递归查找包含 note_id 的对象
      function findNote(obj, id) {
        if (!obj || typeof obj !== 'object') return null;
        if (String(obj.note_id || obj.id || '') === id) return obj;
        if (Array.isArray(obj)) {
          for (const x of obj) { const r = findNote(x, id); if (r) return r; }
          return null;
        }
        for (const k of Object.keys(obj)) {
          const r = findNote(obj[k], id);
          if (r) return r;
        }
        return null;
      }
      const note = findNote(data, noteId);
      if (note) {
        const desc = note.desc || note.content || note.note_content || '';
        const title = note.title || note.display_title || '';
        const imgList = note.image_list || note.images || [];
        const urls = imgList.map(i => typeof i === 'string' ? i : (i.url_default || i.url || i.urlPre || '')).filter(Boolean);
        if (desc || title) {
          return { ok: true, title, desc, images: urls, method: 'feed' };
        }
      }
    }
  } catch(e) {}

  try {
    // 方法2：用 /api/sns/web/v2/note/detail 获取
    const detailResp = await fetch('/api/sns/web/v2/note/detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ note_id: noteId })
    });
    if (detailResp.ok) {
      const data = await detailResp.json();
      const note = (data.data || {}).note_card || (data.data || {}).note || null;
      if (note) {
        const desc = note.desc || note.content || '';
        const title = note.title || '';
        const imgList = note.image_list || note.images || [];
        const urls = imgList.map(i => typeof i === 'string' ? i : (i.url_default || i.url || i.urlPre || '')).filter(Boolean);
        if (desc || title) {
          return { ok: true, title, desc, images: urls, method: 'detail' };
        }
      }
    }
  } catch(e) {}

  return { ok: false };
}""",
                    nid,
                )

                if result and result.get("ok"):
                    desc = result.get("desc") or ""
                    title = result.get("title") or rec.get("title") or ""
                    content = (title + "\n" + desc).strip() if desc else title
                    rec["content"] = content
                    rec["content_html"] = desc if desc else None
                    if result.get("images"):
                        rec["images"] = result["images"]
                    if result.get("title"):
                        rec["title"] = result["title"]
                    _save_note(rec)
                    success_count += 1
                    method = result.get("method", "?")
                    try:
                        print(f"  [{success_count + fail_count}/{total_valid}] {nid} ✓ {len(content)}字 ({method})")
                    except UnicodeEncodeError:
                        print(f"  [{success_count + fail_count}/{total_valid}] {nid} OK ({method})")
                else:
                    fail_count += 1
                    try:
                        print(f"  [{success_count + fail_count}/{total_valid}] {nid} ✗ API 无返回")
                    except Exception:
                        pass

                # 延迟：模拟人类节奏
                time.sleep(CRAWL_DELAY + random.uniform(1, 3))

                # 每 15 条休息一下
                processed = success_count + fail_count
                if processed > 0 and processed % 15 == 0:
                    rest = 30 + random.uniform(0, 20)
                    print(f"  --- 已处理 {processed}/{total_valid}，休息 {rest:.0f}s ---")
                    time.sleep(rest)

            except Exception as e:
                fail_count += 1
                try:
                    print(f"  [{success_count + fail_count}/{total_valid}] {nid} 异常: {e}")
                except Exception:
                    pass

        context.storage_state(path=str(STATE_FILE))
        context.close()
        browser.close()

    print(f"\n完成！共 {len(collected)} 条，成功 {success_count}，跳过 {skip_count}，失败 {fail_count}，目录: {DATA_RAW_DIR}")


if __name__ == "__main__":
    run()
