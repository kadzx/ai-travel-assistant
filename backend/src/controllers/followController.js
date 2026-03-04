const { Follow, User } = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

const followController = {
  // POST /api/follow - Follow a user
  follow: asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;
    const { userId: targetUserId } = req.body;

    if (!targetUserId || Number(targetUserId) === currentUserId) {
      return ResponseUtil.fail(res, 'param_error', 'Invalid user');
    }

    const [record, created] = await Follow.findOrCreate({
      where: { follower_id: currentUserId, following_id: Number(targetUserId) },
      defaults: { follower_id: currentUserId, following_id: Number(targetUserId) }
    });

    if (!created) {
      return ResponseUtil.success(res, { followed: true, message: 'Already following' });
    }
    return ResponseUtil.success(res, { followed: true });
  }),

  // POST /api/follow/unfollow - Unfollow a user
  unfollow: asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;
    const { userId: targetUserId } = req.body;

    if (!targetUserId) {
      return ResponseUtil.fail(res, 'param_error', 'Invalid user');
    }

    const deleted = await Follow.destroy({
      where: { follower_id: currentUserId, following_id: Number(targetUserId) }
    });

    return ResponseUtil.success(res, { followed: false, deleted: deleted > 0 });
  }),

  // GET /api/follow/check?userId=xxx - Check if current user follows target
  check: asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;
    const targetUserId = req.query.userId;

    if (!targetUserId) {
      return ResponseUtil.fail(res, 'param_error', 'userId required');
    }

    const record = await Follow.findOne({
      where: { follower_id: currentUserId, following_id: Number(targetUserId) }
    });

    return ResponseUtil.success(res, { isFollowing: !!record });
  }),

  // GET /api/follow/following - List users I follow (ids or full profiles)
  following: asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await Follow.findAndCountAll({
      where: { follower_id: currentUserId },
      include: [{ model: User, as: 'following', attributes: ['id', 'username', 'nickname', 'avatar', 'bio'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    const list = rows.map(r => r.following).filter(Boolean);
    return ResponseUtil.success(res, { list, total: count, page, totalPages: Math.ceil(count / limit) });
  }),

  // GET /api/follow/followers - List my followers
  followers: asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await Follow.findAndCountAll({
      where: { following_id: currentUserId },
      include: [{ model: User, as: 'follower', attributes: ['id', 'username', 'nickname', 'avatar', 'bio'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    const list = rows.map(r => r.follower).filter(Boolean);
    return ResponseUtil.success(res, { list, total: count, page, totalPages: Math.ceil(count / limit) });
  })
};

module.exports = followController;
