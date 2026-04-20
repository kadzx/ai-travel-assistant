# -*- coding: utf-8 -*-
"""
阶段 2（英文版）：读取 data/raw_en/ 下所有 JSON，按 xhs_note_id 去重，
输出到 data/ready/notes_deduped_en.json。
"""
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_RAW_EN_DIR = BASE_DIR / "data" / "raw_en"
DATA_READY_DIR = BASE_DIR / "data" / "ready"


def load_raw_notes():
    """加载 data/raw_en/ 下所有 .json 文件。"""
    if not DATA_RAW_EN_DIR.exists():
        print(f"目录不存在: {DATA_RAW_EN_DIR}")
        return []
    records = []
    for path in DATA_RAW_EN_DIR.glob("*.json"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                records.extend(data)
            else:
                records.append(data)
        except (json.JSONDecodeError, OSError) as e:
            print(f"Skipped invalid file {path}: {e}")
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
    print(f"Loaded {len(raw)} raw records from {DATA_RAW_EN_DIR}")
    deduped = dedup_by_note_id(raw)
    print(f"After dedup: {len(deduped)}")
    out_path = DATA_READY_DIR / "notes_deduped_en.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)
    print(f"Written to {out_path}")


if __name__ == "__main__":
    run()
