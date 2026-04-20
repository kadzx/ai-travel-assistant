const { Notification, User } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

const notificationController = {
  // GET /api/notifications?page=1&limit=20&unreadOnly=0
  list: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === '1';

    const where = { user_id: userId };
    if (unreadOnly) where.read_at = null;

    const { count, rows } = await Notification.findAndCountAll({
      where,
      include: [
        { model: User, as: 'actor', attributes: ['id', 'username', 'nickname', 'avatar'] }
      ],
      order: [['id', 'DESC']],
      limit,
      offset
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[通知] 列表请求 userId=%s 返回条数=%s', userId, count);
    }

    const list = rows.map(n => {
      const j = n.toJSON();
      return {
        id: j.id,
        type: j.type,
        target_type: j.target_type,
        target_id: j.target_id,
        extra: j.extra,
        read_at: j.read_at,
        created_at: j.created_at,
        actor: j.actor
      };
    });

    const payload = {
      list,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
    // 开发环境返回当前用户 id，便于确认「是谁在查」避免用错账号
    if (process.env.NODE_ENV !== 'production') {
      payload._debug_currentUserId = userId;
    }
    return ResponseUtil.success(res, payload);
  }),

  // PUT /api/notifications/:id/read
  markRead: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const n = await Notification.findOne({ where: { id, user_id: userId } });
    if (!n) return ResponseUtil.fail(res, 'resource_not_found', 'Notification not found');
    n.read_at = new Date();
    await n.save();
    return ResponseUtil.success(res, { read_at: n.read_at });
  }),

  // PUT /api/notifications/read-all
  markAllRead: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await Notification.update(
      { read_at: new Date() },
      { where: { user_id: userId, read_at: null } }
    );
    return ResponseUtil.success(res, null);
  }),

  // GET /api/notifications/unread-count
  unreadCount: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const count = await Notification.count({
      where: { user_id: userId, read_at: null }
    });
    return ResponseUtil.success(res, { count });
  })
};

module.exports = notificationController;
