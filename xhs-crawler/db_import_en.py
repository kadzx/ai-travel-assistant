# -*- coding: utf-8 -*-
"""
阶段 3（英文版）：从 data/ready/notes_deduped_en.json 读取去重后的英文笔记，写入 MySQL posts 表。
复用 xhs_crawler 爬虫账号。
"""
import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env", override=True)

_backend_env = Path(__file__).parent.parent / "backend" / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env, override=False)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASS") or os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME") or os.getenv("DB_NAME", "travel_assistant_db")
DATA_READY_DIR = Path(__file__).parent / "data" / "ready"

# 英文省份 -> 中文映射（用于 location 字段，方便后端统一处理）
EN_TO_CN = {
    "Beijing": "北京", "Tianjin": "天津", "Shanghai": "上海", "Chongqing": "重庆",
    "Hebei": "河北", "Shanxi": "山西", "Liaoning": "辽宁", "Jilin": "吉林",
    "Heilongjiang": "黑龙江", "Jiangsu": "江苏", "Zhejiang": "浙江", "Anhui": "安徽",
    "Fujian": "福建", "Jiangxi": "江西", "Shandong": "山东", "Henan": "河南",
    "Hubei": "湖北", "Hunan": "湖南", "Guangdong": "广东", "Hainan": "海南",
    "Sichuan": "四川", "Guizhou": "贵州", "Yunnan": "云南", "Shaanxi": "陕西",
    "Gansu": "甘肃", "Qinghai": "青海", "Taiwan": "台湾",
    "Inner Mongolia": "内蒙古", "Guangxi": "广西", "Tibet": "西藏",
    "Ningxia": "宁夏", "Xinjiang": "新疆", "Hong Kong": "香港", "Macau": "澳门",
}


def get_connection():
    try:
        import pymysql
    except ImportError:
        raise ImportError("请先安装: pip install PyMySQL")
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD,
        database=DB_NAME, charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def ensure_crawler_user(conn) -> int:
    """确保数据库里有爬虫账号，返回 user_id。"""
    import pymysql
    try:
        import bcrypt
        hashed = bcrypt.hashpw(b"xhs_crawler_2026!", bcrypt.gensalt(10)).decode("utf-8")
    except ImportError:
        hashed = "$2a$10$xhsCrawlerDummyHashNotForLogin000000000000000000000"

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE username = %s", ("xhs_crawler",))
        row = cur.fetchone()
        if row:
            print(f"Crawler user exists: user_id={row['id']}")
            return row["id"]
        cur.execute(
            """INSERT INTO users (username, email, password, role, status, nickname, bio, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())""",
            ("xhs_crawler", "xhs_crawler@bot.local", hashed, "user", "active",
             "Travel Guide Picks", "Auto-collected travel guides from Xiaohongshu (for study only)"),
        )
        conn.commit()
        user_id = cur.lastrowid
        print(f"Created crawler user: user_id={user_id}")
        return user_id


def load_ready_notes() -> list[dict]:
    path = DATA_READY_DIR / "notes_deduped_en.json"
    if not path.exists():
        raise FileNotFoundError(f"Please run dedup_local_en.py first to generate {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else [data]


def extract_location(tags: list) -> str | None:
    """从 tags 里提取省份名，映射为中文。"""
    for t in (tags if isinstance(tags, list) else []):
        if not isinstance(t, str):
            continue
        # tag 格式: "Beijing travel guide"
        for en_name, cn_name in EN_TO_CN.items():
            if en_name.lower() in t.lower():
                return cn_name
    return None


def insert_post(conn, note: dict, user_id: int) -> bool:
    title = (note.get("title") or "Untitled")[:255]
    content = note.get("content_html") or note.get("content") or ""
    images = note.get("images") or []
    tags = note.get("tags") or ["travel guide"]
    images_json = json.dumps(images, ensure_ascii=False) if isinstance(images, list) else json.dumps([])
    tags_json = json.dumps(tags, ensure_ascii=False) if isinstance(tags, list) else json.dumps([str(tags)])

    location = extract_location(tags)

    sql = """
        INSERT INTO posts (user_id, title, content, images, location, tags, type, privacy, lang, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
    """
    with conn.cursor() as cur:
        cur.execute(sql, (user_id, title, content, images_json, location, tags_json, "recommend", "public", "en"))
    conn.commit()
    return True


def run():
    print(f"DB: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    if not DB_PASSWORD:
        print("Error: DB password not found, check backend/.env or xhs-crawler/.env")
        return

    notes = load_ready_notes()
    print(f"Total {len(notes)} notes to import")

    conn = get_connection()
    try:
        user_id = ensure_crawler_user(conn)
        count = 0
        skip = 0
        for note in notes:
            nid = note.get("xhs_note_id", "")
            content = note.get("content_html") or note.get("content") or ""
            if not content or len(content.strip()) < 5:
                skip += 1
                continue
            try:
                insert_post(conn, note, user_id)
                count += 1
                if count % 50 == 0:
                    print(f"  Imported {count}...")
            except Exception as e:
                try:
                    print(f"  Skipped {nid}: {e}")
                except Exception:
                    pass
                skip += 1
        print(f"\nDone! Imported {count}, skipped {skip}.")
    finally:
        conn.close()


if __name__ == "__main__":
    run()
