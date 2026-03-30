const fs = require('fs');
const path = require('path');
const sequelize = require('./src/config/database');

const UPLOAD_DIR = path.resolve(__dirname, 'public/uploads/xhs');
const OUT = path.resolve(__dirname, '../xhs-crawler/data/missing_posts.json');

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
  console.log('start');
  const [rows] = await sequelize.query(
    "SELECT id, title, images FROM posts WHERE user_id = 1001 LIMIT 300"
  );
  console.log('rows=', rows.length);

  const result = [];
  for (const row of rows) {
    let images = [];
    try {
      images = Array.isArray(row.images) ? row.images : JSON.parse(row.images || '[]');
    } catch {
      continue;
    }
    if (!images.length) continue;

    const filenames = images
      .filter(x => typeof x === 'string' && x.trim())
      .map(filenameFromLocalUrl)
      .filter(Boolean);
    if (!filenames.length) continue;

    const missing = filenames.filter(name => !fs.existsSync(path.join(UPLOAD_DIR, name)));
    if (missing.length) {
      result.push({ post_id: row.id, title: (row.title || '').trim(), filenames, missing });
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8');
  console.log(`缺失图片帖子数: ${result.length}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
