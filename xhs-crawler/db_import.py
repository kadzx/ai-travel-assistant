# -*- coding: utf-8 -*-
"""
阶段 3：从 data/ready/notes_deduped.json 读取去重后的笔记，写入 MySQL posts 表。
依赖：.env 中配置 DB_* 与 CRAWLER_USER_ID。
"""
import json
from pathlib import Path

import config
from config import (
    KEYWORD,
    CRAWLER_USER_ID,
    DATA_READY_DIR,
    DB_HOST,
    DB_NAME,
    DB_PASSWORD,
    DB_PORT,
    DB_USER,
)


def get_connection():
    """返回 PyMySQL 连接。"""
    try:
        import pymysql
    except ImportError:
        raise ImportError("请先安装: pip install PyMySQL")
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def load_ready_notes() -> list[dict]:
    """读取 data/ready/notes_deduped.json。"""
    path = DATA_READY_DIR / "notes_deduped.json"
    if not path.exists():
        raise FileNotFoundError(f"请先运行 dedup_local.py 生成 {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else [data]


def insert_post(conn, note: dict) -> bool:
    """
    将一条笔记插入 posts 表。
    字段映射：title, content, images(JSON), tags(JSON), user_id, type, privacy。
    """
    user_id = CRAWLER_USER_ID
    if not user_id:
        raise ValueError("请在 .env 中配置 CRAWLER_USER_ID")
    title = (note.get("title") or "无标题")[:255]
    # 优先用富文本 HTML，前端可用 v-html 渲染
    content = note.get("content_html") or note.get("content") or ""
    images = note.get("images") or []
    tags = note.get("tags") or [KEYWORD or "旅游规划"]
    if isinstance(images, list):
        images_json = json.dumps(images, ensure_ascii=False)
    else:
        images_json = json.dumps([], ensure_ascii=False)
    if isinstance(tags, list):
        tags_json = json.dumps(tags, ensure_ascii=False)
    else:
        tags_json = json.dumps([str(tags)], ensure_ascii=False)
    post_type = "xhs_crawl"
    privacy = "public"

    sql = """
        INSERT INTO posts (user_id, title, content, images, tags, type, privacy, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
    """
    with conn.cursor() as cur:
        cur.execute(
            sql,
            (user_id, title, content, images_json, tags_json, post_type, privacy),
        )
    conn.commit()
    return True


def run():
    if not CRAWLER_USER_ID:
        print("请在 .env 中配置 CRAWLER_USER_ID（爬虫专用用户 ID）后再运行。")
        return
    if not config.DB_PASSWORD:
        print("请在 .env 中配置 DB_PASSWORD 等数据库信息后再运行。")
        return

    notes = load_ready_notes()
    print(f"共 {len(notes)} 条待导入")
    conn = get_connection()
    try:
        count = 0
        for note in notes:
            insert_post(conn, note)
            count += 1
            if count % 50 == 0:
                print(f"  已导入 {count} 条")
        print(f"阶段 3 完成，共导入 {count} 条到 posts 表。")
    finally:
        conn.close()


if __name__ == "__main__":
    run()
