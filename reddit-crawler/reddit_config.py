# -*- coding: utf-8 -*-
"""
Reddit 单省验证配置。
- 仅用于“先抓取、再去重”的离线流程
- 图片先保留外链，后续如需入库/本地化可单独接脚本
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=True)

REDDIT_SUBREDDIT = (os.getenv("REDDIT_SUBREDDIT") or "travel").strip()
REDDIT_PROVINCE = (os.getenv("REDDIT_PROVINCE") or "Yunnan").strip()
REDDIT_POSTS_PER_KEYWORD = int(os.getenv("REDDIT_POSTS_PER_KEYWORD") or "15")
REDDIT_REQUEST_DELAY = float(os.getenv("REDDIT_REQUEST_DELAY") or "4")
REDDIT_MAX_PAGES_PER_KEYWORD = int(os.getenv("REDDIT_MAX_PAGES_PER_KEYWORD") or "3")
REDDIT_TIMEOUT = int(os.getenv("REDDIT_TIMEOUT") or "20")
REDDIT_USER_AGENT = (
    os.getenv("REDDIT_USER_AGENT")
    or "TravelAppResearchBot/1.0 (Windows; offline research crawler)"
).strip()
REDDIT_BROWSER_HEADLESS = (os.getenv("REDDIT_BROWSER_HEADLESS") or "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
REDDIT_BROWSER_WAIT_SECONDS = float(os.getenv("REDDIT_BROWSER_WAIT_SECONDS") or "5")
REDDIT_BROWSER_SCROLLS = int(os.getenv("REDDIT_BROWSER_SCROLLS") or "4")
REDDIT_BROWSER_UA = (
    os.getenv("REDDIT_BROWSER_UA")
    or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
).strip()

_custom_keywords = (os.getenv("REDDIT_KEYWORDS") or "").strip()
if _custom_keywords:
    REDDIT_KEYWORDS = [x.strip() for x in _custom_keywords.split("|") if x.strip()]
else:
    _province = REDDIT_PROVINCE.lower()
    REDDIT_KEYWORDS = [
        f"{_province} days china",
        f"{_province} itinerary china",
        f"{_province} travel china",
        f"{_province} trip report china",
    ]

DATA_RAW_DIR = BASE_DIR / "data" / "raw" / REDDIT_PROVINCE.lower()
DATA_READY_DIR = BASE_DIR / "data" / "ready"
DATA_DEBUG_DIR = BASE_DIR / "data" / "debug" / REDDIT_PROVINCE.lower()
