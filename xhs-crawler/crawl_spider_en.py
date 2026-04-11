# -*- coding: utf-8 -*-
"""
用 Spider_XHS 搜索小红书上的英文旅游笔记并获取详情，输出到 data/raw_en/ 目录。
搜索关键词为英文省份名 + travel guide，筛选纯英文帖子。

用法：
  1. 在 .env 里填好 COOKIES（从浏览器 F12 复制完整 Cookie）
  2. python crawl_spider_en.py
"""
import json
import os
import re
import sys
import time
import random
from pathlib import Path

from dotenv import load_dotenv

# 修复 Windows 上 PyExecJS + Node.js 的编码问题
os.environ["PYTHONUTF8"] = "1"
os.environ["PYTHONIOENCODING"] = "utf-8"

# 把 spider_xhs_lib 加入 sys.path，并切换工作目录（Spider_XHS 用相对路径加载 JS）
SPIDER_LIB = Path(__file__).parent / "spider_xhs_lib"
sys.path.insert(0, str(SPIDER_LIB))
os.chdir(str(SPIDER_LIB))

from apis.xhs_pc_apis import XHS_Apis
from xhs_utils.xhs_util import generate_request_params
import requests

# ===== 配置 =====
load_dotenv(Path(__file__).parent / ".env", override=True)
COOKIES = os.getenv("COOKIES", "")
CRAWL_DELAY = int(os.getenv("CRAWL_DELAY", "5"))
DATA_RAW_DIR = Path(__file__).parent / "data" / "raw_en"
DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)

# ---------- 网络：处理代理 / SSL 问题 ----------
# 如果开了系统代理导致 SSL 卡住，可以取消代理或禁用 SSL 验证
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
# 让 requests 不走系统代理（小红书是国内站，直连即可）
os.environ.pop("HTTP_PROXY", None)
os.environ.pop("HTTPS_PROXY", None)
os.environ.pop("http_proxy", None)
os.environ.pop("https_proxy", None)

# ---------- 中文字符检测 ----------
_CJK_RE = re.compile(
    r"[\u4e00-\u9fff\u3400-\u4dbf\u2e80-\u2eff\u3000-\u303f\uff00-\uffef]"
)


def is_mostly_english(text: str, max_cjk_ratio: float = 0.05) -> bool:
    """判断文本是否为"纯英文"（允许极少量中文字符，如 emoji 旁的标点）。
    max_cjk_ratio: 中文字符占比上限，默认 5%。
    """
    if not text or not text.strip():
        return False
    cjk_count = len(_CJK_RE.findall(text))
    total = len(text.strip())
    if total == 0:
        return False
    return (cjk_count / total) <= max_cjk_ratio


# ---------- 34 个省级行政区（英文） ----------
PROVINCES_EN = [
    "Beijing", "Tianjin", "Shanghai", "Chongqing",
    "Hebei", "Shanxi", "Liaoning", "Jilin", "Heilongjiang",
    "Jiangsu", "Zhejiang", "Anhui", "Fujian", "Jiangxi", "Shandong",
    "Henan", "Hubei", "Hunan", "Guangdong", "Hainan",
    "Sichuan", "Guizhou", "Yunnan", "Shaanxi", "Gansu",
    "Qinghai", "Taiwan",
    "Inner Mongolia", "Guangxi", "Tibet", "Ningxia", "Xinjiang",
    "Hong Kong", "Macau",
]

PER_PROVINCE = 20  # 每个省爬多少条

BASE_URL = "https://edith.xiaohongshu.com"


def fetch_note_detail(note_id: str, xsec_token: str) -> dict | None:
    """自己调 feed 接口获取笔记详情，绕过 Spider_XHS 的 get_note_info（它有 bug）。"""
    api = "/api/sns/web/v1/feed"
    data = {
        "source_note_id": note_id,
        "image_formats": ["jpg", "webp", "avif"],
        "extra": {"need_body_topic": "1"},
        "xsec_source": "pc_search",
        "xsec_token": xsec_token or "",
    }
    try:
        headers, cookies, body = generate_request_params(COOKIES, api, data, "POST")
        resp = requests.post(BASE_URL + api, headers=headers, data=body, cookies=cookies, timeout=15)
        res_json = resp.json()
        print(f"    [feed debug] {note_id}: status={resp.status_code}, success={res_json.get('success')}, code={res_json.get('code')}, keys={list(res_json.keys())}")
        if not res_json.get("success"):
            code = res_json.get("code", "unknown")
            return None
        items = (res_json.get("data") or {}).get("items") or []
        if not items:
            return None
        return items[0]
    except Exception as e:
        print(f"    [feed error] {note_id}: {e}")
        return None


def save_note(record: dict):
    nid = record.get("xhs_note_id", "unknown")
    path = DATA_RAW_DIR / f"{nid}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)


def convert_from_note_detail(detail_item: dict, keyword: str) -> dict | None:
    """从 feed 接口返回的 item 里提取完整笔记数据。"""
    card = detail_item.get("note_card") or detail_item
    if not isinstance(card, dict):
        return None

    note_id = card.get("note_id") or detail_item.get("id") or ""
    if not note_id:
        return None

    title = card.get("title") or card.get("display_title") or ""
    desc = card.get("desc") or card.get("content") or ""

    # 提取图片
    images = []
    for img in card.get("image_list") or card.get("images") or []:
        if isinstance(img, str):
            images.append(img)
        else:
            u = img.get("url_default") or img.get("url") or img.get("url_pre") or ""
            if u:
                images.append(u)

    # 提取标签
    tags = [keyword]
    for t in card.get("tag_list") or card.get("tags") or []:
        name = t.get("name") if isinstance(t, dict) else t
        if name and name not in tags:
            tags.append(name)

    content = (title + "\n" + desc).strip() if desc else title

    return {
        "xhs_note_id": str(note_id),
        "title": (title or "Untitled")[:255],
        "content": content or "Untitled",
        "content_html": desc or None,
        "images": images,
        "tags": tags,
        "source": "xiaohongshu",
        "lang": "en",
    }


def crawl_keyword(xhs, keyword: str, num: int):
    """搜索关键词 → 拿到笔记 ID → 逐个调 feed 接口获取详情 → 过滤纯英文。"""
    print(f"\n{'='*60}")
    print(f"Search: {keyword}  Target: {num}")
    print(f"{'='*60}")

    success, msg, notes = xhs.search_some_note(
        keyword, num, COOKIES,
        sort_type_choice=0,
        note_type=2,
        note_time=0,
        note_range=0,
        pos_distance=0,
        geo=None,
    )
    if not success:
        try:
            print(f"  Search failed: {msg}")
        except Exception:
            print(f"  Search failed")
        return 0, 0, 0

    notes = [n for n in notes if n.get("model_type") == "note"]
    print(f"  Found {len(notes)} notes, fetching details via feed API...")

    if not notes:
        return 0, 0, 0

    success_count = 0
    skip_count = 0
    fail_count = 0

    for i, item in enumerate(notes):
        note_id = item.get("id", "")
        xsec_token = item.get("xsec_token", "")
        if not note_id:
            continue

        # 调 feed 接口获取完整详情
        detail = fetch_note_detail(note_id, xsec_token)
        if not detail:
            fail_count += 1
            print(f"  [{i+1}/{len(notes)}] {note_id} FAIL (feed returned empty)")
            time.sleep(CRAWL_DELAY + random.uniform(0.5, 1.5))
            continue

        record = convert_from_note_detail(detail, keyword)
        if not record:
            fail_count += 1
            print(f"  [{i+1}/{len(notes)}] {note_id} FAIL (parse error)")
            time.sleep(CRAWL_DELAY + random.uniform(0.5, 1.5))
            continue

        # 过滤：只保留纯英文帖子
        check_text = f"{record.get('title', '')} {record.get('content', '')}"
        if not is_mostly_english(check_text):
            skip_count += 1
            try:
                print(f"  [{i+1}/{len(notes)}] {note_id} SKIP (not English)")
            except Exception:
                pass
            time.sleep(CRAWL_DELAY + random.uniform(0.5, 1.5))
            continue

        save_note(record)
        success_count += 1
        try:
            print(f"  [{i+1}/{len(notes)}] {note_id} OK {len(record.get('content',''))} chars | {record['title'][:50]}")
        except UnicodeEncodeError:
            print(f"  [{i+1}/{len(notes)}] {note_id} OK")

        delay = CRAWL_DELAY + random.uniform(1, 3)
        time.sleep(delay)

        processed = success_count + skip_count + fail_count
        if processed > 0 and processed % 20 == 0:
            rest = 30 + random.uniform(0, 15)
            print(f"  --- Processed {processed}/{len(notes)}, resting {rest:.0f}s ---")
            time.sleep(rest)

    print(f"  Done: saved {success_count}, skipped(non-EN) {skip_count}, failed {fail_count}")
    return success_count, skip_count, fail_count


def run():
    if not COOKIES:
        print("=" * 60)
        print("Error: Please set COOKIES in .env first")
        print("=" * 60)
        return

    print(f"Delay: {CRAWL_DELAY}s")
    print(f"Cookie length: {len(COOKIES)} chars")
    print(f"Provinces: {len(PROVINCES_EN)}, per province: {PER_PROVINCE}")
    print(f"Expected total: {len(PROVINCES_EN) * PER_PROVINCE}")
    print(f"Output dir: {DATA_RAW_DIR}")
    print(f"Filter: English-only posts (CJK ratio <= 5%)")
    print("=" * 60)

    xhs = XHS_Apis()

    total_success = 0
    total_skip = 0
    total_fail = 0

    for idx, province in enumerate(PROVINCES_EN):
        keyword = f"{province} travel guide"
        print(f"\n>>> [{idx+1}/{len(PROVINCES_EN)}] {keyword}")
        s, sk, f = crawl_keyword(xhs, keyword, PER_PROVINCE)
        total_success += s
        total_skip += sk
        total_fail += f

        # 每个省之间休息一下
        if idx < len(PROVINCES_EN) - 1:
            rest = 20 + random.uniform(0, 10)
            print(f"\n  Resting between provinces {rest:.0f}s...")
            time.sleep(rest)

    print(f"\n{'='*60}")
    print(f"All done! Saved: {total_success}, Skipped(non-EN): {total_skip}, Failed: {total_fail}")
    print(f"Data dir: {DATA_RAW_DIR}")


if __name__ == "__main__":
    run()
