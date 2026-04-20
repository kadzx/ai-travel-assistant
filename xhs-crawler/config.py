# -*- coding: utf-8 -*-
"""
爬虫与导入配置：从 .env 读取数据库、爬取参数等。
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# 强制从 xhs-crawler/.env 加载，override=True 保证 .env 覆盖环境变量
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path, override=True)

# ---------- 爬取参数（阶段 1）：从 .env 读，延迟加大求稳 ----------
KEYWORD = (os.getenv("KEYWORD") or "").strip() or "旅游规划"
CRAWL_DELAY = float(os.getenv("CRAWL_DELAY") or "15")
CRAWL_MAX_NOTES = int(os.getenv("CRAWL_MAX_NOTES") or "200")
# 每滚动 N 次休息一段时间，降低被限流（0 表示不休息）
CRAWL_REST_EVERY = int(os.getenv("CRAWL_REST_EVERY") or "5")
CRAWL_REST_SECONDS = float(os.getenv("CRAWL_REST_SECONDS") or "60")

# ---------- 数据库（阶段 3 导入时用） ----------
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "travel_db")
CRAWLER_USER_ID = int(os.getenv("CRAWLER_USER_ID", "0"))

# ---------- 路径 ----------
BASE_DIR = Path(__file__).resolve().parent
DATA_RAW_DIR = BASE_DIR / "data" / "raw"
DATA_READY_DIR = BASE_DIR / "data" / "ready"
