# -*- coding: utf-8 -*-
"""
阶段 3：从 data/ready/notes_deduped.json 读取去重后的笔记，写入 MySQL posts 表。
会自动创建一个专用爬虫账号 xhs_crawler。
"""
import json
import os
from pathlib import Path

from dotenv import load_dotenv

# 先更新 xhs-crawler 的 .env 里的数据库配置，使其与 backend 一致
load_dotenv(Path(__file__).parent / ".env", override=True)

# 数据库配置（优先用 backend 的 .env 格式）
_backend_env = Path(__file__).parent.parent / "backend" / ".env"
if _backend_env.exists():
    load_dotenv(_backend_env, override=False)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASS") or os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME") or os.getenv("DB_NAME", "travel_assistant_db")
KEYWORD = os.getenv("KEYWORD", "旅游 攻略")
CRAWLER_USER_ID = os.getenv("CRAWLER_USER_ID", "")
DATA_READY_DIR = Path(__file__).parent / "data" / "ready"


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


def ensure_crawler_user(conn) -> int:
    """确保数据库里有一个专用爬虫账号，返回其 user_id。"""
    import pymysql
    # bcrypt 加密一个随机密码（这个账号不需要真的登录）
    try:
        import bcrypt
        hashed = bcrypt.hashpw(b"xhs_crawler_2026!", bcrypt.gensalt(10)).decode("utf-8")
    except ImportError:
        # 没有 bcrypt 就用 bcryptjs 兼容的格式（$2a$10$ 开头的60字符）
        hashed = "$2a$10$xhsCrawlerDummyHashNotForLogin000000000000000000000"

    with conn.cursor() as cur:
        # 先查是否已存在
        cur.execute("SELECT id FROM users WHERE username = %s", ("xhs_crawler",))
        row = cur.fetchone()
        if row:
            print(f"爬虫账号已存在: user_id={row['id']}")
            return row["id"]

        # 创建账号
        cur.execute(
            """INSERT INTO users (username, email, password, role, status, nickname, bio, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())""",
            (
                "xhs_crawler",
                "xhs_crawler@bot.local",
                hashed,
                "user",
                "active",
                "旅游攻略精选",
                "小红书旅游攻略自动采集，仅供学习交流",
            ),
        )
        conn.commit()
        user_id = cur.lastrowid
        print(f"已创建爬虫账号: username=xhs_crawler, user_id={user_id}")
        return user_id


def load_ready_notes() -> list[dict]:
    """读取 data/ready/notes_deduped.json。"""
    path = DATA_READY_DIR / "notes_deduped.json"
    if not path.exists():
        raise FileNotFoundError(f"请先运行 dedup_local.py 生成 {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else [data]


def insert_post(conn, note: dict, user_id: int) -> bool:
    """
    将一条笔记插入 posts 表。
    字段映射：title, content, images(JSON), tags(JSON), user_id, type, privacy。
    """
    title = (note.get("title") or "无标题")[:255]
    content = note.get("content_html") or note.get("content") or ""
    images = note.get("images") or []
    tags = note.get("tags") or ["旅游攻略"]
    if isinstance(images, list):
        images_json = json.dumps(images, ensure_ascii=False)
    else:
        images_json = json.dumps([], ensure_ascii=False)
    if isinstance(tags, list):
        tags_json = json.dumps(tags, ensure_ascii=False)
    else:
        tags_json = json.dumps([str(tags)], ensure_ascii=False)

    # 从 tags 里提取省份作为 location
    location = None
    for t in (tags if isinstance(tags, list) else []):
        if isinstance(t, str) and "旅游" in t:
            location = t.replace("旅游", "").replace("攻略", "").strip()
            if location:
                break

    post_type = "recommend"
    privacy = "public"

    sql = """
        INSERT INTO posts (user_id, title, content, images, location, tags, type, privacy, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
    """
    with conn.cursor() as cur:
        cur.execute(
            sql,
            (user_id, title, content, images_json, location, tags_json, post_type, privacy),
        )
    conn.commit()
    return True


def run():
    print(f"数据库: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    if not DB_PASSWORD:
        print("错误：未找到数据库密码，请检查 backend/.env 或 xhs-crawler/.env")
        return

    notes = load_ready_notes()
    print(f"共 {len(notes)} 条待导入")

    conn = get_connection()
    try:
        # 自动创建或获取爬虫专用账号
        user_id = ensure_crawler_user(conn)

        count = 0
        skip = 0
        for note in notes:
            nid = note.get("xhs_note_id", "")
            # 跳过没有正文的
            content = note.get("content_html") or note.get("content") or ""
            if not content or len(content.strip()) < 5:
                skip += 1
                continue
            try:
                insert_post(conn, note, user_id)
                count += 1
                if count % 100 == 0:
                    print(f"  已导入 {count} 条…")
            except Exception as e:
                try:
                    print(f"  跳过 {nid}: {e}")
                except Exception:
                    pass
                skip += 1
        print(f"\n完成！导入 {count} 条，跳过 {skip} 条。")
    finally:
        conn.close()


if __name__ == "__main__":
    run()
