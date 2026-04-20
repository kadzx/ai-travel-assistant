/**
 * 把 xhscdn 图片 URL 在返回给前端前重写成本地 URL（若本地已有对应文件）。
 * 与 xhs-crawler/sync_xhs_images_db.py 的命名规则一致：hash、路径最后一段。
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const XHS_CDN_HOSTS = [
  'sns-webpic-qc.xhscdn.com',
  'sns-webpic.xhscdn.com',
  'ci.xiaohongshu.com',
  'xhscdn.com'
];

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads/xhs');

function isXhscdnUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    return XHS_CDN_HOSTS.some(h => host === h || host.endsWith('.' + h));
  } catch {
    return false;
  }
}

function hashFilename(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 24) + '.webp';
}

function normalizedUrl(url) {
  try {
    const u = new URL(url.trim());
    const p = u.pathname.replace(/\/$/, '') || '/';
    return `https://${u.hostname.toLowerCase()}${p}`;
  } catch {
    return url;
  }
}

function pathSegmentFilename(url) {
  try {
    const u = new URL(url.trim());
    const seg = u.pathname.replace(/\/$/, '').split('/').pop();
    if (seg && !seg.includes('.')) return seg + '.webp';
  } catch {}
  return '';
}

let cachedFiles = null;
function getExistingFiles() {
  if (cachedFiles) return cachedFiles;
  try {
    if (fs.existsSync(UPLOAD_DIR)) {
      cachedFiles = new Set(fs.readdirSync(UPLOAD_DIR).filter(f => {
        const p = path.join(UPLOAD_DIR, f);
        return fs.statSync(p).isFile();
      }));
    } else {
      cachedFiles = new Set();
    }
  } catch {
    cachedFiles = new Set();
  }
  return cachedFiles;
}

/** 占位图路径：CDN 无法下载且本地无文件时用此图，避免前端请求 xhscdn 导致 403 */
const PLACEHOLDER_PATH = '/placeholder-image.svg';

/**
 * 若 url 是 xhscdn：有本地文件则返回本地 URL，否则返回占位图 URL（避免 403）。
 * 非 xhscdn 则原样返回。
 * @param {string} url - 图片 URL
 * @param {string} baseUrl - 如 http://localhost:3000
 */
function rewriteImageUrl(url, baseUrl) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!isXhscdnUrl(trimmed)) return url;

  const existing = getExistingFiles();
  const candidates = [
    hashFilename(trimmed),
    hashFilename(normalizedUrl(trimmed)),
    pathSegmentFilename(trimmed)
  ].filter(Boolean);

  for (const name of candidates) {
    if (existing.has(name)) {
      const base = (baseUrl || '').replace(/\/$/, '');
      return base ? `${base}/uploads/xhs/${name}` : `/uploads/xhs/${name}`;
    }
  }
  // 本地没有对应文件（CDN 下不了或未同步）：返回占位图，避免前端请求 xhscdn 403
  const base = (baseUrl || '').replace(/\/$/, '');
  return base ? `${base}${PLACEHOLDER_PATH}` : PLACEHOLDER_PATH;
}

/**
 * 把 post 里的 images 数组中的 xhscdn 链接重写成本地 URL（有则改，无则保留）。
 * @param {object} post - 含 images 数组的帖子对象（会被浅拷贝后改写）
 * @param {string} baseUrl - 如 http://localhost:3000
 */
function rewritePostImages(post, baseUrl) {
  if (!post || !Array.isArray(post.images)) return post;
  const out = { ...post };
  out.images = post.images.map(u => rewriteImageUrl(u, baseUrl));
  if (out.image !== undefined && typeof out.image === 'string') {
    out.image = rewriteImageUrl(out.image, baseUrl);
  }
  return out;
}

module.exports = { rewriteImageUrl, rewritePostImages };
