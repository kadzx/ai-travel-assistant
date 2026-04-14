# -*- coding: utf-8 -*-
"""
阶段 2：读取 data/raw/ 下的 Reddit JSON，按 reddit_post_id 去重。
"""
import json
import sys

from reddit_config import DATA_RAW_DIR, DATA_READY_DIR, REDDIT_PROVINCE


def configure_console():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def load_raw_records() -> list[dict]:
    if not DATA_RAW_DIR.exists():
        return []
    records: list[dict] = []
    for path in DATA_RAW_DIR.glob("*.json"):
        if path.name.startswith("_"):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                records.extend(data)
            elif isinstance(data, dict):
                records.append(data)
        except (OSError, json.JSONDecodeError) as exc:
            print(f"跳过无效文件 {path}: {exc}")
    return records


def dedup_records(records: list[dict]) -> list[dict]:
    seen = set()
    deduped: list[dict] = []
    for record in records:
        post_id = str(record.get("reddit_post_id") or "").strip()
        if not post_id:
            continue
        if post_id in seen:
            continue
        seen.add(post_id)
        deduped.append(record)
    return deduped


def run():
    configure_console()
    DATA_READY_DIR.mkdir(parents=True, exist_ok=True)
    records = load_raw_records()
    print(f"共加载 {len(records)} 条原始记录")
    deduped = dedup_records(records)
    print(f"去重后 {len(deduped)} 条")

    out_path = DATA_READY_DIR / f"reddit_{REDDIT_PROVINCE.lower()}_deduped.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)
    print(f"已写入 {out_path}")


if __name__ == "__main__":
    run()
