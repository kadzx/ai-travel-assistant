import os
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(r'e:\毕设重置\xhs-crawler')
SPIDER_LIB = ROOT / 'spider_xhs_lib'
sys.path.insert(0, str(SPIDER_LIB))
os.chdir(str(SPIDER_LIB))
load_dotenv(ROOT / '.env', override=True)

from apis.xhs_pc_apis import XHS_Apis

cookie = os.getenv('COOKIES', '')
xhs = XHS_Apis()
success, msg, notes = xhs.search_some_note('天津 一日游', 3, cookie, 0, 2, 0, 0, 0, None)
print('success=', success)
print('msg=', msg)
print('count=', len(notes) if notes else 0)
if notes:
    print(notes[0])
