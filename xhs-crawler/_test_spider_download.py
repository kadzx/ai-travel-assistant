import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import requests

ROOT = Path(r'e:\毕设重置\xhs-crawler')
SPIDER_LIB = ROOT / 'spider_xhs_lib'
sys.path.insert(0, str(SPIDER_LIB))
os.chdir(str(SPIDER_LIB))
load_dotenv(ROOT / '.env', override=True)

from apis.xhs_pc_apis import XHS_Apis

cookie = os.getenv('COOKIES', '')
NOTE_ID = '69133231000000000303760f'
TITLE = '天津一日游（穷鬼版）（站在巨人的肩膀上）'

xhs = XHS_Apis()
success, msg, notes = xhs.search_some_note(TITLE, 10, cookie, 0, 2, 0, 0, 0, None)
print('search_success=', success)
print('search_msg=', msg)
match = None
for n in notes or []:
    if str(n.get('id', '')) == NOTE_ID:
        match = n
        break
print('match_found=', bool(match))
if not match:
    raise SystemExit(0)

note_url = f"https://www.xiaohongshu.com/explore/{NOTE_ID}?xsec_token={match.get('xsec_token','')}&xsec_source=pc_search"
success, msg, detail = xhs.get_note_info(note_url, cookie)
print('detail_success=', success)
print('detail_msg=', msg)
if not success:
    raise SystemExit(0)
items = ((detail or {}).get('data') or {}).get('items') or []
print('items=', len(items))
if not items:
    raise SystemExit(0)
img = (((items[0].get('note_card') or {}).get('image_list') or [])[0])
url = ''
if isinstance(img, dict):
    info_list = img.get('info_list') or []
    if info_list:
        url = info_list[0].get('url') or ''
if url:
    print('download_url=', url)
    r = requests.get(url, headers={
        'Referer': 'https://www.xiaohongshu.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/*,*/*;q=0.8',
    }, timeout=30)
    print('status=', r.status_code)
    print('len=', len(r.content) if r.ok else 0)
