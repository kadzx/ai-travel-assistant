# -*- coding: utf-8 -*-
"""
用 Spider_XHS 搜索小红书笔记并获取详情，输出到 data/raw/ 目录。
用法：
  1. 在 .env 里填好 COOKIES（从浏览器 F12 复制完整 Cookie）
  2. python crawl_spider.py
"""
import json
import os
import sys
import time
import random
from pathlib import Path

from dotenv import load_dotenv

# 修复 Windows 上 PyExecJS + Node.js 的编码问题
# 强制子进程使用 UTF-8
os.environ["PYTHONUTF8"] = "1"
os.environ["PYTHONIOENCODING"] = "utf-8"

# 把 spider_xhs_lib 加入 sys.path，并切换工作目录（Spider_XHS 用相对路径加载 JS）
SPIDER_LIB = Path(__file__).parent / "spider_xhs_lib"
sys.path.insert(0, str(SPIDER_LIB))
os.chdir(str(SPIDER_LIB))

from apis.xhs_pc_apis import XHS_Apis
from xhs_utils.data_util import handle_note_info

# ===== 配置 =====
load_dotenv(Path(__file__).parent / ".env", override=True)
COOKIES = os.getenv("COOKIES", "")
KEYWORD = os.getenv("KEYWORD", "旅游 攻略 国内")
CRAWL_MAX_NOTES = int(os.getenv("CRAWL_MAX_NOTES", "200"))
CRAWL_DELAY = int(os.getenv("CRAWL_DELAY", "5"))
DATA_RAW_DIR = Path(__file__).parent / "data" / "raw"
DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)


def save_note(record: dict):
    nid = record.get("xhs_note_id", "unknown")
    path = DATA_RAW_DIR / f"{nid}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)


def convert_to_our_format(note_info: dict, keyword: str) -> dict:
    """把 Spider_XHS 的 handle_note_info 输出转成我们的 data/raw 格式。"""
    return {
        "xhs_note_id": note_info.get("note_id", ""),
        "title": note_info.get("title", "无标题"),
        "content": note_info.get("desc") or note_info.get("title") or "无标题",
        "content_html": note_info.get("desc") or None,
        "images": note_info.get("image_list") or [],
        "tags": note_info.get("tags") or [keyword],
        "source": "xiaohongshu",
    }


PROVINCES = [
    "北京", "天津", "上海", "重庆",
    "河北", "山西", "辽宁", "吉林", "黑龙江",
    "江苏", "浙江", "安徽", "福建", "江西", "山东",
    "河南", "湖北", "湖南", "广东", "海南",
    "四川", "贵州", "云南", "陕西", "甘肃",
    "青海", "台湾",
    "内蒙古", "广西", "西藏", "宁夏", "新疆",
    "香港", "澳门",
]

PER_PROVINCE = 50  # 每个省爬多少条


def crawl_keyword(xhs, keyword: str, num: int):
    """搜索一个关键词并逐条获取详情，返回 (成功数, 失败数)。"""
    print(f"\n{'='*60}")
    print(f"搜索: {keyword}  目标: {num} 条")
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
            print(f"  搜索失败: {msg}")
        except Exception:
            print(f"  搜索失败")
        return 0, 0

    notes = [n for n in notes if n.get("model_type") == "note"]
    print(f"  搜索到 {len(notes)} 条笔记")

    if not notes:
        return 0, 0

    success_count = 0
    fail_count = 0

    for i, note in enumerate(notes):
        note_id = note.get("id", "")
        xsec_token = note.get("xsec_token", "")
        if not note_id:
            continue

        # 已存在且有正文的跳过
        existing_path = DATA_RAW_DIR / f"{note_id}.json"
        if existing_path.exists():
            try:
                with open(existing_path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
                ec = existing.get("content", "")
                et = existing.get("title", "")
                if ec and ec != et and len(ec) > len(et) + 10:
                    success_count += 1
                    continue
            except Exception:
                pass

        note_url = f"https://www.xiaohongshu.com/explore/{note_id}?xsec_token={xsec_token}"

        try:
            ok, detail_msg, note_info = xhs.get_note_info(note_url, COOKIES)
            if ok and note_info:
                note_data = note_info['data']['items'][0]
                note_data['url'] = note_url
                parsed = handle_note_info(note_data)
                record = convert_to_our_format(parsed, keyword)
                save_note(record)
                success_count += 1
                try:
                    print(f"  [{success_count+fail_count}/{len(notes)}] {note_id} ✓ {len(record.get('content',''))}字")
                except UnicodeEncodeError:
                    print(f"  [{success_count+fail_count}/{len(notes)}] {note_id} OK")
            else:
                fail_count += 1
                try:
                    print(f"  [{success_count+fail_count}/{len(notes)}] {note_id} ✗ {detail_msg}")
                except Exception:
                    print(f"  [{success_count+fail_count}/{len(notes)}] {note_id} FAIL")
        except Exception as e:
            fail_count += 1
            try:
                print(f"  [{success_count+fail_count}/{len(notes)}] {note_id} 异常: {e}")
            except Exception:
                pass

        delay = CRAWL_DELAY + random.uniform(1, 3)
        time.sleep(delay)

        processed = success_count + fail_count
        if processed > 0 and processed % 20 == 0:
            rest = 30 + random.uniform(0, 15)
            print(f"  --- 已处理 {processed}/{len(notes)}，休息 {rest:.0f}s ---")
            time.sleep(rest)

    print(f"  完成: 成功 {success_count}, 失败 {fail_count}")
    return success_count, fail_count


def run():
    if not COOKIES:
        print("=" * 60)
        print("错误：请先在 .env 里填写 COOKIES")
        print("=" * 60)
        return

    print(f"每条延迟: {CRAWL_DELAY}s")
    print(f"Cookie 长度: {len(COOKIES)} 字符")
    print(f"省份数量: {len(PROVINCES)}, 每省 {PER_PROVINCE} 条")
    print(f"预计总量: {len(PROVINCES) * PER_PROVINCE} 条")
    print("=" * 60)

    xhs = XHS_Apis()

    total_success = 0
    total_fail = 0

    for idx, province in enumerate(PROVINCES):
        keyword = f"{province} 旅游 攻略"
        print(f"\n>>> [{idx+1}/{len(PROVINCES)}] {keyword}")
        s, f = crawl_keyword(xhs, keyword, PER_PROVINCE)
        total_success += s
        total_fail += f

        # 每个省之间休息一下
        if idx < len(PROVINCES) - 1:
            rest = 20 + random.uniform(0, 10)
            print(f"\n  省份间休息 {rest:.0f}s…")
            time.sleep(rest)

    print(f"\n{'='*60}")
    print(f"全部完成！总计成功 {total_success}, 失败 {total_fail}")
    print(f"数据目录: {DATA_RAW_DIR}")


if __name__ == "__main__":
    run()
