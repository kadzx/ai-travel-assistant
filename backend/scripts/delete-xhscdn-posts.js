/**
 * 查找并删除「仍在使用小红书 CDN 图片」的帖子（images 里含 xhscdn 链接的）。
 * 会先删除该帖子关联的点赞、评论、收藏，再删帖子。
 *
 * 使用：在项目根目录执行
 *   node backend/scripts/delete-xhscdn-posts.js
 * 或进入 backend 后执行
 *   node scripts/delete-xhscdn-posts.js
 *
 * 仅列出不删除：加环境变量 DRY_RUN=1
 *   DRY_RUN=1 node backend/scripts/delete-xhscdn-posts.js
 */

const path = require('path');

// 从 backend 目录加载 .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Post, Like, Comment, Favorite } = require('../src/models');

const XHS_CDN_HOSTS = [
  'sns-webpic-qc.xhscdn.com',
  'sns-webpic.xhscdn.com',
  'ci.xiaohongshu.com',
  'xhscdn.com'
];

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

function postHasXhscdnImages(post) {
  const images = post.images;
  if (!Array.isArray(images) || images.length === 0) return false;
  return images.some(img => isXhscdnUrl(img));
}

async function run() {
  const dryRun = process.env.DRY_RUN === '1';

  const posts = await Post.findAll({
    attributes: ['id', 'title', 'images', 'created_at'],
    order: [['id', 'ASC']]
  });

  const toDelete = posts.filter(post => postHasXhscdnImages(post));

  console.log('帖子总数:', posts.length);
  console.log('仍含小红书 CDN 的帖子数:', toDelete.length);
  if (toDelete.length === 0) {
    console.log('无需删除。');
    process.exit(0);
    return;
  }

  console.log('\n以下帖子将被删除（images 中含 xhscdn 链接）：');
  toDelete.forEach((p, i) => {
    console.log(`  ${i + 1}. id=${p.id} title="${(p.title || '').slice(0, 40)}..." images=${Array.isArray(p.images) ? p.images.length : 0}`);
  });

  if (dryRun) {
    console.log('\n[DRY_RUN=1] 仅列出，未执行删除。');
    process.exit(0);
    return;
  }

  const ids = toDelete.map(p => p.id);
  const { sequelize } = require('../src/models');
  const transaction = await sequelize.transaction();

  try {
    await Favorite.destroy({ where: { target_type: 'post', target_id: ids }, transaction });
    await Like.destroy({ where: { target_type: 'post', target_id: ids }, transaction });
    await Comment.destroy({ where: { target_type: 'post', target_id: ids }, transaction });
    await Post.destroy({ where: { id: ids }, transaction });
    await transaction.commit();
    console.log('\n已删除', ids.length, '篇帖子及其关联点赞/评论/收藏。');
  } catch (err) {
    await transaction.rollback();
    console.error('删除失败:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
