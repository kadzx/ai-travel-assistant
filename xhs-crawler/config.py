# -*- coding: utf-8 -*-
"""
爬虫配置：从 .env 读取 Cookie、数据库、爬取参数等。
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# 加载项目根目录下的 .env（xhs-crawler 目录内）
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(_env_path)

# ---------- 小红书 Cookie（阶段 1 爬取必填） ----------
XHS_A1 = os.getenv("XHS_A1", "")
XHS_WEB_SESSION = os.getenv("XHS_WEB_SESSION", "")
XHS_WEB_ID = os.getenv("XHS_WEB_ID", "")


def get_cookies_dict():
    """返回用于 xhshow 和 requests 的 Cookie 字典。"""
    return {
        "a1": XHS_A1,
        "web_session": XHS_WEB_SESSION,
        "webId": XHS_WEB_ID,
    }


# ---------- 爬取参数 ----------
# 搜索关键词
KEYWORD = os.getenv("KEYWORD", "旅游规划")
# 请求间隔（秒），建议 1~2
CRAWL_DELAY = float(os.getenv("CRAWL_DELAY", "1.5"))
# 最多爬取笔记条数，0 表示不限制
CRAWL_MAX_NOTES = int(os.getenv("CRAWL_MAX_NOTES", "200"))
# 每页条数（视接口而定）
PAGE_SIZE = int(os.getenv("PAGE_SIZE", "20"))

# ---------- 数据库（阶段 3 导入时用） ----------
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "travel_db")

# 爬虫专用用户 ID，导入时 posts.user_id 用该值
CRAWLER_USER_ID = int(os.getenv("CRAWLER_USER_ID", "0"))

# ---------- 路径 ----------
BASE_DIR = Path(__file__).resolve().parent
DATA_RAW_DIR = BASE_DIR / "data" / "raw"
DATA_READY_DIR = BASE_DIR / "data" / "ready"

# 小红书 Web API 基地址（签名时用）
XHS_API_BASE = "https://edith.xiaohongshu.com"
