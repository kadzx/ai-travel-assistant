# -*- coding: utf-8 -*-
"""只删除 xhs_crawler 账号导入的帖子，不动其他用户数据。"""
import os
from pathlib import Path
from dotenv import load_dotenv
import pymysql

ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env', override=True)
load_dotenv(ROOT.parent / 'backend' / '.env', override=False)

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASS') or os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'travel_assistant_db')

conn = pymysql.connect(
    host=DB_HOST,
    port=DB_PORT,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
    charset='utf8mb4',
    cursorclass=pymysql.cursors.DictCursor,
)

try:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE username=%s", ('xhs_crawler',))
        row = cur.fetchone()
        if not row:
            print('未找到 xhs_crawler 账号，不需要删除帖子。')
        else:
            user_id = row['id']
            cur.execute("SELECT COUNT(*) c FROM posts WHERE user_id=%s", (user_id,))
            cnt = cur.fetchone()['c']
            print(f'将删除 xhs_crawler(user_id={user_id}) 的帖子数: {cnt}')
            cur.execute("DELETE FROM posts WHERE user_id=%s", (user_id,))
            conn.commit()
            print('删除完成')
finally:
    conn.close()
