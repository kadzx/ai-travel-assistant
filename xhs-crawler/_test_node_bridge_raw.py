import json, subprocess
from pathlib import Path
bridge = Path(r'e:\毕设重置\xhs-crawler\spider_xhs_lib\xhs_utils\node_sign_bridge.js')
payload = {
    'action': 'xray'
}
p = subprocess.run(['node', str(bridge)], input=json.dumps(payload, ensure_ascii=False), text=True, capture_output=True, encoding='utf-8', errors='replace')
print('returncode=', p.returncode)
print('stdout=')
print(p.stdout)
print('stderr=')
print(p.stderr)
