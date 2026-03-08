const { Notification } = require('../models');

/**
 * 创建一条通知（点赞/评论/关注时调用）
 * @param {number} userId - 接收通知的用户 ID
 * @param {number} actorId - 触发者用户 ID
 * @param {string} type - like | comment | follow
 * @param {string} [targetType] - post | comment | user
 * @param {number} [targetId]
 * @param {object} [extra] - { title, contentSnippet 等 }
 */
async function createNotification(userId, actorId, type, targetType = null, targetId = null, extra = null) {
  if (userId === actorId) return; // 不给自己发通知
  try {
    await Notification.create({
      user_id: Number(userId),
      actor_id: Number(actorId),
      type,
      target_type: targetType,
      target_id: targetId != null ? Number(targetId) : null,
      extra: extra || null
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[通知] DB 写入成功 type=%s user_id=%s actor_id=%s', type, userId, actorId);
    }
  } catch (err) {
    // 若 notifications 表不存在（如后端未重启过），会报错。请重启后端让 sequelize.sync() 建表
    console.error('createNotification error:', err.message);
    console.error('  (If table "notifications" missing, restart backend to create it.)');
  }
}

module.exports = { createNotification };
