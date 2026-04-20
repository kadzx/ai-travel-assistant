# -*- coding: utf-8 -*-
"""
阶段 2：读取 data/raw/ 下所有 JSON，按 xhs_note_id 去重，输出到 data/ready/notes_deduped.json。
"""
import json
from pathlib import Path

import config
from config import DATA_RAW_DIR, DATA_READY_DIR


def load_raw_notes():
    """加载 data/raw/ 下所有 .json 文件，返回 list[dict]。"""
    if not DATA_RAW_DIR.exists():
        return []
    records = []
    for path in DATA_RAW_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                records.extend(data)
            else:
                records.append(data)
        except (json.JSONDecodeError, OSError) as e:
            print(f"跳过无效文件 {path}: {e}")
    return records


def dedup_by_note_id(records: list[dict]) -> list[dict]:
    """按 xhs_note_id 去重，保留首次出现的记录。"""
    seen = set()
    out = []
    for r in records:
        nid = r.get("xhs_note_id")
        if not nid:
            out.append(r)
            continue
        if nid in seen:
            continue
        seen.add(nid)
        out.append(r)
    return out


def run():
    DATA_READY_DIR.mkdir(parents=True, exist_ok=True)
    raw = load_raw_notes()
    print(f"共加载 {len(raw)} 条原始记录")
    deduped = dedup_by_note_id(raw)
    print(f"去重后 {len(deduped)} 条")
    out_path = DATA_READY_DIR / "notes_deduped.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)
    print(f"已写入 {out_path}")


if __name__ == "__main__":
    run()
