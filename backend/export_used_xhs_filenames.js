const fs = require('fs');
const path = require('path');
const sequelize = require('./src/config/database');

const OUT = path.resolve(__dirname, '../xhs-crawler/data/used_xhs_filenames.json');

function filenameFromLocalUrl(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    return segs[segs.length - 1] || '';
  } catch {
    return '';
  }
}

(async () => {
  const limit = 100;
  let offset = 0;
  const used = new Set();
  while (true) {
    const [rows] = await sequelize.query(`SELECT id, images FROM posts WHERE user_id = 1001 LIMIT ${limit} OFFSET ${offset}`);
    if (!rows.length) break;
    for (const row of rows) {
      let images = [];
      try {
        images = Array.isArray(row.images) ? row.images : JSON.parse(row.images || '[]');
      } catch {
        continue;
      }
      for (const u of images) {
        if (typeof u === 'string' && u.includes('/uploads/xhs/')) {
          const name = filenameFromLocalUrl(u);
          if (name) used.add(name);
        }
      }
    }
    offset += limit;
    console.log('page offset=', offset, 'used=', used.size);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify([...used], null, 2), 'utf8');
  console.log('done used=', used.size);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
